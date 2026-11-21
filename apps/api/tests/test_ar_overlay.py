"""Tests für Positionsdaten, Bauteil-Verweise und die geräteunabhängige Overlay-Sicht (AR)."""

import asyncio
from typing import Any

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from smartcraft_api.ai.mock import MOCK_INFO, MockProvider, MockScenario
from smartcraft_api.ai.provider import (
    AnalysisRequest,
    ImageInput,
    ProviderOutputError,
    parse_draft,
)
from smartcraft_api.domain.analysis import AnalysisDraft, AnalysisResult, Hazard, Region
from smartcraft_api.domain.overlay import OVERLAY_VERSION, build_overlay
from smartcraft_api.domain.trades import Trade
from smartcraft_api.safety import rules
from smartcraft_api.services.analysis_service import run_analysis
from tests.images import make_image

IMAGE = ImageInput(data=b"\xff\xd8\xff-test", media_type="image/jpeg")


def analyse(scenario: MockScenario, trade: Trade = Trade.ELEKTRIKER) -> AnalysisResult:
    req = AnalysisRequest(trade=trade, images=[IMAGE], note=f"[mock:{scenario.value}]")
    return asyncio.run(run_analysis(MockProvider(), req))


def draft(**overrides: Any) -> dict[str, Any]:
    data: dict[str, Any] = {
        "summary": "Testbild.",
        "image_quality": {"usable": True},
        "components": [{"name": "Rohr", "category": "Leitung"}],
        "safety": {"risk_level": "low", "qualified_person_required": False},
    }
    return data | overrides


# --- Region ------------------------------------------------------------------------


@pytest.mark.parametrize(
    "values",
    [
        {"capture_index": -1, "x": 0, "y": 0, "width": 0.5, "height": 0.5},
        {"capture_index": 0, "x": 1.2, "y": 0, "width": 0.1, "height": 0.1},
        {"capture_index": 0, "x": 0, "y": 0, "width": 0, "height": 0.5},
        {"capture_index": 0, "x": 0.8, "y": 0, "width": 0.3, "height": 0.5},
        {"capture_index": 0, "x": 0, "y": 0.9, "width": 0.5, "height": 0.2},
    ],
)
def test_invalid_regions_are_rejected(values: dict[str, Any]) -> None:
    with pytest.raises(ValidationError):
        Region(**values)


def test_region_touching_the_edge_is_valid() -> None:
    assert Region(capture_index=0, x=0.75, y=0.0, width=0.25, height=1.0).width == 0.25


# --- Bauteil-Verweise --------------------------------------------------------------


@pytest.mark.parametrize(
    "overrides",
    [
        {"observations": [{"text": "x", "confidence": "low", "component_index": 3}]},
        {
            "findings": [
                {
                    "title": "x",
                    "severity": "info",
                    "reasoning": "x",
                    "confidence": "low",
                    "component_indices": [1],
                }
            ]
        },
        {
            "next_checks": [
                {
                    "action": "x",
                    "reason": "x",
                    "requires_qualified_person": False,
                    "component_indices": [-1],
                }
            ]
        },
    ],
)
def test_references_to_missing_components_are_rejected(overrides: dict[str, Any]) -> None:
    with pytest.raises(ProviderOutputError, match="nicht vorhandene Bauteile"):
        parse_draft(draft(**overrides))


def test_region_pointing_to_missing_photo_is_rejected() -> None:
    region = {"capture_index": 1, "x": 0, "y": 0, "width": 0.5, "height": 0.5}
    bad = parse_draft(draft(components=[{"name": "Rohr", "category": "Leitung", "region": region}]))

    class Provider:
        info = MOCK_INFO

        async def analyze(self, request: AnalysisRequest) -> AnalysisDraft:
            return bad

    with pytest.raises(ProviderOutputError, match="Foto 1"):
        asyncio.run(run_analysis(Provider(), AnalysisRequest(trade=Trade.KLEMPNER, images=[IMAGE])))


# --- Policy erhält Verweise und verankert Pflicht-Prüfschritte ----------------------


def test_policy_keeps_model_component_references() -> None:
    result = analyse(MockScenario.HEIZUNG, Trade.KLEMPNER)

    assert result.findings[0].component_indices == [3, 2]
    model_checks = [c for c in result.next_checks if c.source == "model"]
    assert [c.component_indices for c in model_checks] == [[3], [2]]


def test_mandatory_electrical_checks_are_anchored_to_detected_components() -> None:
    result = analyse(MockScenario.UNTERVERTEILUNG)

    vde_checks = [c for c in result.next_checks if c.reference and "VDE" in c.reference]
    assert len(vde_checks) == 2
    # FI (0) und Leitungsschutzschalter (1) wurden als elektrisch erkannt
    assert all(c.component_indices == [0, 1] for c in vde_checks)


def test_gas_check_is_anchored_to_boiler_and_flue() -> None:
    result = analyse(MockScenario.HEIZUNG, Trade.KLEMPNER)

    gas_check = next(c for c in result.next_checks if c.reference == "DVGW-TRGI")
    names = [result.components[i].name for i in gas_check.component_indices]
    assert names == ["Gas-Brennwerttherme", "Abgasrohr"]


def test_hazard_from_trade_only_gives_general_checks() -> None:
    result = analyse(MockScenario.UNBRAUCHBARES_FOTO, Trade.ELEKTRIKER)

    vde_checks = [c for c in result.next_checks if c.reference and "VDE" in c.reference]
    assert vde_checks
    assert all(c.component_indices == [] for c in vde_checks)


# --- Overlay ------------------------------------------------------------------------


@pytest.mark.parametrize("scenario", list(MockScenario))
def test_overlay_always_carries_the_full_safety_block(scenario: MockScenario) -> None:
    result = analyse(scenario)

    overlay = build_overlay(result)

    assert overlay.overlay_version == OVERLAY_VERSION
    assert overlay.safety.disclaimer == rules.DISCLAIMER
    assert overlay.safety.risk_level is result.safety.risk_level
    assert overlay.safety.qualified_person_required is result.safety.qualified_person_required
    assert overlay.safety.notices == result.safety.notices
    assert overlay.safety.is_test_data is True


@pytest.mark.parametrize("scenario", list(MockScenario))
def test_overlay_loses_no_finding_and_no_check(scenario: MockScenario) -> None:
    result = analyse(scenario)

    overlay = build_overlay(result)

    shown_checks = {c.position for a in overlay.anchors for c in a.checks}
    shown_checks |= {c.position for c in overlay.general_checks}
    shown_findings = {f.index for a in overlay.anchors for f in a.findings}
    shown_findings |= {f.index for f in overlay.general_findings}
    assert shown_checks == set(range(len(result.next_checks)))
    assert shown_findings == set(range(len(result.findings)))


def test_overlay_anchors_components_with_labels_findings_and_checks() -> None:
    overlay = build_overlay(analyse(MockScenario.UNTERVERTEILUNG))

    by_name = {a.name: a for a in overlay.anchors}
    fi = by_name["FI-Schutzschalter (RCD)"]
    ls = by_name["Leitungsschutzschalter (6 Stück)"]
    assert [lb.text for lb in fi.labels] == ["40A 30mA Typ A", "Prüftaste T"]
    assert ls.highest_severity == "warning"
    assert [f.title for f in ls.findings] == ["Offene Teilungseinheit ohne Blindabdeckung"]
    assert any(c.reference == "DIN VDE 0100-600" for c in fi.checks)
    assert all(c.requires_qualified_person for c in fi.checks)
    assert [f.title for f in overlay.general_findings] == ["Stromkreisbeschriftung fehlt"]


def test_overlay_without_regions_has_no_anchors_but_everything_else() -> None:
    result = analyse(MockScenario.UNBRAUCHBARES_FOTO)

    overlay = build_overlay(result)

    assert overlay.anchors == []
    assert len(overlay.general_checks) == len(result.next_checks)
    assert overlay.general_checks[0].action == rules.UNUSABLE_IMAGE_CHECK.action


def test_overlay_endpoint(client: TestClient) -> None:
    project_id = client.post("/projects", json={"name": "AR-Test"}).json()["id"]
    created = client.post(
        f"/projects/{project_id}/analyses",
        data={"trade": "klempner", "note": "[mock:heizung]"},
        files=[("files", ("a.jpg", make_image(), "image/jpeg"))],
    ).json()

    overlay = client.get(f"/analyses/{created['id']}/overlay").json()
    detail = client.get(f"/analyses/{created['id']}").json()

    assert overlay["safety"]["disclaimer"] == rules.DISCLAIMER
    assert Hazard.GAS.value in overlay["safety"]["hazards"]
    assert len(overlay["anchors"]) == 4
    # Prüfschritte sind per position mit den abhakbaren CheckItems verknüpft
    positions = {c["position"]: c["action"] for a in overlay["anchors"] for c in a["checks"]}
    for check in detail["checks"]:
        if check["position"] in positions:
            assert positions[check["position"]] == check["action"]
    assert [c["component_indices"] for c in detail["checks"]][:2] == [[3], [2]]
    assert client.get("/analyses/unbekannt/overlay").status_code == 404
