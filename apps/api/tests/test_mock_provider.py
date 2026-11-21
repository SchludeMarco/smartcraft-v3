import asyncio
import hashlib
import socket
from collections.abc import Iterator
from typing import Any

import pytest

from smartcraft_api.ai.mock import MOCK_INFO, MockProvider, MockScenario, select_scenario
from smartcraft_api.ai.provider import (
    AnalysisProvider,
    AnalysisRequest,
    ImageInput,
    ProviderError,
    ProviderOutputError,
    parse_draft,
)
from smartcraft_api.ai.registry import get_provider
from smartcraft_api.config import Settings
from smartcraft_api.domain.analysis import AnalysisDraft, Hazard, RiskLevel
from smartcraft_api.domain.trades import Trade
from smartcraft_api.safety import rules
from smartcraft_api.services.analysis_service import (
    InvalidAnalysisRequestError,
    run_analysis,
)

JPEG = ImageInput(data=b"\xff\xd8\xff-testbild", media_type="image/jpeg")


def request(scenario: MockScenario | None = None, trade: Trade = Trade.ALLROUND) -> AnalysisRequest:
    note = f"Testnotiz [mock:{scenario.value}]" if scenario else None
    return AnalysisRequest(trade=trade, images=[JPEG], note=note)


def run(provider: AnalysisProvider, req: AnalysisRequest) -> Any:
    return asyncio.run(run_analysis(provider, req))


@pytest.fixture(autouse=True)
def no_network(monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    """Belegt, dass die Mock-KI keinerlei Netzwerkzugriff braucht."""

    def guard(*args: Any, **kwargs: Any) -> None:
        raise AssertionError("Netzwerkzugriff in der Mock-KI ist verboten")

    monkeypatch.setattr(socket.socket, "connect", guard)
    monkeypatch.setattr(socket, "create_connection", guard)
    yield


# --- Schnittstelle -----------------------------------------------------------------


def test_mock_implements_provider_protocol_and_is_registry_default() -> None:
    provider = get_provider(Settings())

    assert isinstance(provider, MockProvider)
    assert isinstance(provider, AnalysisProvider)
    assert provider.info.is_test_data is True


@pytest.mark.parametrize("scenario", list(MockScenario))
def test_every_scenario_file_matches_schema(scenario: MockScenario) -> None:
    draft = asyncio.run(MockProvider().analyze(request(scenario)))

    assert isinstance(draft, AnalysisDraft)


def test_parse_draft_rejects_invalid_json_and_unknown_fields() -> None:
    with pytest.raises(ProviderOutputError):
        parse_draft("{kein json")
    with pytest.raises(ProviderOutputError):
        parse_draft({"summary": "x", "approved": True})


# --- Reproduzierbarkeit ------------------------------------------------------------


def test_same_photo_always_gives_same_scenario() -> None:
    req = AnalysisRequest(trade=Trade.ALLROUND, images=[JPEG])

    assert len({select_scenario(req) for _ in range(20)}) == 1


def test_scenario_selection_by_photo_hash_is_documented_rule() -> None:
    req = AnalysisRequest(trade=Trade.ALLROUND, images=[JPEG])
    expected = list(MockScenario)[hashlib.sha256(JPEG.data).digest()[0] % len(MockScenario)]

    assert select_scenario(req) is expected


def test_mock_tag_in_note_selects_scenario() -> None:
    for scenario in MockScenario:
        assert select_scenario(request(scenario)) is scenario


def test_unknown_mock_tag_is_rejected() -> None:
    req = AnalysisRequest(trade=Trade.ALLROUND, images=[JPEG], note="[mock:gibtsnicht]")

    with pytest.raises(ProviderError):
        select_scenario(req)


def test_results_are_identical_across_runs() -> None:
    first = run(MockProvider(), request(MockScenario.HEIZUNG))
    second = run(MockProvider(), request(MockScenario.HEIZUNG))

    assert first == second


# --- Testdaten-Kennzeichnung -------------------------------------------------------


@pytest.mark.parametrize("scenario", list(MockScenario))
def test_mock_results_are_unmistakably_test_data(scenario: MockScenario) -> None:
    result = run(MockProvider(), request(scenario))

    assert result.source.is_test_data is True
    assert result.source.provider_id == MOCK_INFO.provider_id
    assert result.summary.startswith(rules.TEST_DATA_PREFIX)
    assert "Mock-Szenario" in result.summary
    assert result.uncertainties[0] == rules.TEST_DATA_NOTICE
    assert result.safety.notices[0] == rules.TEST_DATA_NOTICE
    assert result.safety.disclaimer == rules.DISCLAIMER


# --- Szenario 1: Unterverteilung mit FI --------------------------------------------


def test_unterverteilung_is_tightened_to_electrical_high_risk() -> None:
    raw = asyncio.run(MockProvider().analyze(request(MockScenario.UNTERVERTEILUNG)))
    assert raw.safety.risk_level is RiskLevel.MEDIUM  # Mock simuliert zu mildes Modell
    assert raw.safety.qualified_person_required is False

    result = run(MockProvider(), request(MockScenario.UNTERVERTEILUNG))

    assert Hazard.ELECTRICAL in result.safety.hazards
    assert result.safety.risk_level is RiskLevel.HIGH
    assert result.safety.qualified_person_required is True
    references = {c.reference for c in result.next_checks}
    assert {"DIN VDE 0105-100", "DIN VDE 0100-600"} <= references
    ids = {i.rule_id for i in result.policy.interventions}
    assert {"risk-floor", "qualified-person", "mandatory-check", "approval-language"} <= ids


def test_unterverteilung_approval_wording_is_neutralized() -> None:
    result = run(MockProvider(), request(MockScenario.UNTERVERTEILUNG))

    assert "einwandfrei" not in result.summary
    assert rules.NEUTRALIZED in result.summary
    assert rules.APPROVAL_UNCERTAINTY in result.uncertainties


def test_unterverteilung_keeps_model_warning_and_uncertain_label() -> None:
    result = run(MockProvider(), request(MockScenario.UNTERVERTEILUNG))

    assert any(f.severity == "warning" for f in result.findings)
    labels = [label for c in result.components for label in c.labels]
    assert any(label.text == "B1?" and label.confidence == "low" for label in labels)


# --- Szenario 2: Heizungsanlage ----------------------------------------------------


def test_heizung_gas_is_detected_and_tightened() -> None:
    result = run(MockProvider(), request(MockScenario.HEIZUNG, trade=Trade.KLEMPNER))

    assert Hazard.GAS in result.safety.hazards
    assert Hazard.ELECTRICAL not in result.safety.hazards  # "Heizkreisverteilung" ≠ Elektro
    assert result.safety.risk_level is RiskLevel.HIGH
    assert result.safety.qualified_person_required is True
    assert any(c.reference == "DVGW-TRGI" for c in result.next_checks)
    assert all(n in result.safety.notices for n in rules.HAZARD_RULES[Hazard.GAS].notices)


def test_heizung_keeps_model_checks_that_need_no_specialist() -> None:
    result = run(MockProvider(), request(MockScenario.HEIZUNG))

    model_checks = [c for c in result.next_checks if c.source == "model"]
    assert len(model_checks) == 2
    assert all(c.requires_qualified_person is False for c in model_checks)


# --- Szenario 3: Unbrauchbares Foto ------------------------------------------------


def test_unusable_photo_lowers_confidence_and_asks_for_new_photo() -> None:
    raw = asyncio.run(MockProvider().analyze(request(MockScenario.UNBRAUCHBARES_FOTO)))
    assert raw.observations[0].confidence == "medium"

    result = run(MockProvider(), request(MockScenario.UNBRAUCHBARES_FOTO))

    assert result.image_quality.usable is False
    assert all(o.confidence == "low" for o in result.observations)
    assert result.next_checks[0] == rules.UNUSABLE_IMAGE_CHECK
    assert "Bildqualität: unterbelichtet" in result.uncertainties
    assert rules.BASELINE_UNCERTAINTY in result.uncertainties
    assert "image-quality" in {i.rule_id for i in result.policy.interventions}


def test_unusable_photo_in_electrician_context_is_still_high_risk() -> None:
    result = run(MockProvider(), request(MockScenario.UNBRAUCHBARES_FOTO, trade=Trade.ELEKTRIKER))

    assert result.safety.risk_level is RiskLevel.HIGH
    assert result.safety.qualified_person_required is True


# --- Analyse-Service ---------------------------------------------------------------


@pytest.mark.parametrize(
    "req",
    [
        AnalysisRequest(trade=Trade.ALLROUND, images=[]),
        AnalysisRequest(trade=Trade.ALLROUND, images=[JPEG] * 6),
        AnalysisRequest(
            trade=Trade.ALLROUND, images=[ImageInput(data=b"x", media_type="image/gif")]
        ),
        AnalysisRequest(
            trade=Trade.ALLROUND, images=[ImageInput(data=b"", media_type="image/jpeg")]
        ),
        AnalysisRequest(trade=Trade.ALLROUND, images=[JPEG], note="x" * 2001),
    ],
)
def test_service_rejects_invalid_requests(req: AnalysisRequest) -> None:
    with pytest.raises(InvalidAnalysisRequestError):
        run(MockProvider(), req)


class _BrokenProvider:
    info = MOCK_INFO

    async def analyze(self, request: AnalysisRequest) -> AnalysisDraft:
        return {"summary": "kein Draft"}  # type: ignore[return-value]


def test_service_rejects_provider_returning_wrong_type() -> None:
    with pytest.raises(ProviderOutputError):
        run(_BrokenProvider(), request())


class _RealLookingProvider:
    """Simuliert einen echten Provider, der eine Freigabe behauptet."""

    @property
    def info(self) -> Any:
        from smartcraft_api.ai.provider import ProviderInfo

        return ProviderInfo(provider_id="fake", model_id="fake-1", is_test_data=False)

    async def analyze(self, request: AnalysisRequest) -> AnalysisDraft:
        return parse_draft(
            {
                "summary": "Zählerschrank, alles normgerecht, Anlage ist sicher.",
                "image_quality": {"usable": True},
                "safety": {"risk_level": "low", "qualified_person_required": False},
            }
        )


def test_service_applies_policy_to_any_provider() -> None:
    result = run(_RealLookingProvider(), request(trade=Trade.ALLROUND))

    assert result.source.is_test_data is False
    assert "normgerecht" not in result.summary
    assert result.safety.risk_level is RiskLevel.HIGH
    assert result.safety.qualified_person_required is True
