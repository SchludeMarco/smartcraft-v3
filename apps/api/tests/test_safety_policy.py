from typing import Any

import pytest
from pydantic import ValidationError

from smartcraft_api.domain.analysis import (
    AnalysisDraft,
    AnalysisResult,
    Hazard,
    RiskLevel,
)
from smartcraft_api.domain.trades import Trade
from smartcraft_api.safety import POLICY_VERSION, apply_safety_policy, rules
from smartcraft_api.safety.policy import neutralize_approval_language


def make_draft(**overrides: Any) -> AnalysisDraft:
    data: dict[str, Any] = {
        "summary": "Wandfläche mit Farbanstrich.",
        "image_quality": {"usable": True, "issues": []},
        "components": [],
        "observations": [],
        "findings": [],
        "uncertainties": [],
        "next_checks": [],
        "safety": {
            "risk_level": "low",
            "hazards": [],
            "qualified_person_required": False,
            "notices": [],
        },
    }
    data.update(overrides)
    return AnalysisDraft.model_validate(data)


def rule_ids(result: AnalysisResult) -> set[str]:
    return {i.rule_id for i in result.policy.interventions}


# --- Schema -------------------------------------------------------------------------


def test_draft_rejects_unknown_fields_like_approval() -> None:
    with pytest.raises(ValidationError):
        make_draft(approved=True)


def test_draft_safety_rejects_unknown_fields() -> None:
    with pytest.raises(ValidationError):
        make_draft(
            safety={
                "risk_level": "low",
                "qualified_person_required": False,
                "is_safe": True,
            }
        )


# "safety" als Abschnittsname ist erlaubt, ein Urteil wie "is_safe" nicht.
FORBIDDEN_FIELD_PARTS = (
    "approv",
    "freigab",
    "is_safe",
    "safe_to",
    "sicher",
    "compliant",
    "konform",
)


def _all_field_names(model: type[Any], seen: set[type[Any]] | None = None) -> set[str]:
    seen = seen or set()
    if model in seen:
        return set()
    seen.add(model)
    names: set[str] = set()
    for name, field in model.model_fields.items():
        names.add(name)
        annotation = field.annotation
        for candidate in getattr(annotation, "__args__", ()) + (annotation,):
            if isinstance(candidate, type) and hasattr(candidate, "model_fields"):
                names |= _all_field_names(candidate, seen)
    return names


@pytest.mark.parametrize("model", [AnalysisDraft, AnalysisResult])
def test_schema_has_no_approval_or_safety_verdict_fields(model: type[Any]) -> None:
    for name in _all_field_names(model):
        assert not any(part in name.lower() for part in FORBIDDEN_FIELD_PARTS), name


# --- Grundgarantien ----------------------------------------------------------------


@pytest.mark.parametrize("trade", list(Trade))
def test_every_result_has_disclaimer_baseline_uncertainty_and_version(trade: Trade) -> None:
    result = apply_safety_policy(make_draft(), trade)

    assert result.safety.disclaimer == rules.DISCLAIMER
    assert rules.BASELINE_UNCERTAINTY in result.uncertainties
    assert result.policy.version == POLICY_VERSION
    assert result.trade is trade


def test_harmless_painting_case_stays_low_risk() -> None:
    result = apply_safety_policy(make_draft(), Trade.MALER)

    assert result.safety.risk_level is RiskLevel.LOW
    assert result.safety.hazards == []
    assert result.safety.qualified_person_required is False


# --- Elektro -----------------------------------------------------------------------


def test_electrician_trade_always_requires_qualified_person() -> None:
    result = apply_safety_policy(make_draft(summary="Foto einer Wand."), Trade.ELEKTRIKER)

    assert Hazard.ELECTRICAL in result.safety.hazards
    assert result.safety.qualified_person_required is True
    assert result.safety.risk_level is RiskLevel.HIGH
    references = {c.reference for c in result.next_checks if c.source == "policy"}
    assert {"DIN VDE 0105-100", "DIN VDE 0100-600"} <= references


def test_electrical_detected_from_labels_even_in_other_trade() -> None:
    draft = make_draft(
        summary="Kasten an der Kellerwand.",
        components=[
            {
                "name": "Reiheneinbaugerät",
                "category": "Schutzorgan",
                "labels": [{"text": "B16 230/400V", "confidence": "medium"}],
            }
        ],
    )

    result = apply_safety_policy(draft, Trade.ALLROUND)

    assert Hazard.ELECTRICAL in result.safety.hazards
    assert result.safety.qualified_person_required is True
    assert "hazard-detected:electrical" in rule_ids(result)


def test_model_claiming_low_risk_for_fi_switch_is_overridden() -> None:
    draft = make_draft(
        summary="Unterverteilung mit FI-Schutzschalter.",
        safety={"risk_level": "low", "qualified_person_required": False, "hazards": []},
    )

    result = apply_safety_policy(draft, Trade.KLEMPNER)

    assert result.safety.risk_level is RiskLevel.HIGH
    assert {"risk-floor", "qualified-person", "mandatory-check"} <= rule_ids(result)


def test_mandatory_checks_are_not_duplicated() -> None:
    once = apply_safety_policy(make_draft(), Trade.ELEKTRIKER)
    draft_with_checks = make_draft(
        next_checks=[c.model_dump(exclude={"source"}) for c in once.next_checks]
    )

    twice = apply_safety_policy(draft_with_checks, Trade.ELEKTRIKER)

    actions = [c.action for c in twice.next_checks]
    assert len(actions) == len(set(actions))


# --- Weitere Gefahren --------------------------------------------------------------


@pytest.mark.parametrize(
    ("text", "trade", "hazard", "qualified"),
    [
        ("Gastherme mit Abgasrohr im Keller.", Trade.KLEMPNER, Hazard.GAS, True),
        ("Diagonaler Riss im Mauerwerk über dem Sturz.", Trade.MAURER, Hazard.STRUCTURAL, True),
        ("Durchbiegung am Deckenbalken.", Trade.ZIMMERER, Hazard.STRUCTURAL, True),
        ("Wellplatten, vermutlich Eternit.", Trade.ALLROUND, Hazard.HAZARDOUS_MATERIAL, True),
        ("Ziegeldeckung ohne Auffälligkeiten.", Trade.DACHDECKER, Hazard.WORKING_AT_HEIGHT, False),
    ],
)
def test_hazards_enforce_minimum_requirements(
    text: str, trade: Trade, hazard: Hazard, qualified: bool
) -> None:
    result = apply_safety_policy(make_draft(summary=text), trade)

    assert hazard in result.safety.hazards
    rule = rules.HAZARD_RULES[hazard]
    assert result.safety.risk_level.rank >= rule.min_risk.rank
    if qualified:
        assert result.safety.qualified_person_required is True
    assert any(c.source == "policy" for c in result.next_checks)
    assert all(n in result.safety.notices for n in rule.notices)


@pytest.mark.parametrize(
    "text",
    [
        "Absturzsicherung am Gerüst fehlt.",  # 'sicherung' darf hier nicht Elektro auslösen
        "Farbe gleichmäßig verteilt, Spannungsrisse im Putz.",
        "PE-Rohr der Wasserleitung.",
    ],
)
def test_common_non_electrical_words_do_not_trigger_electrical(text: str) -> None:
    result = apply_safety_policy(make_draft(summary=text), Trade.MALER)

    assert Hazard.ELECTRICAL not in result.safety.hazards


def test_critical_finding_raises_risk_to_high() -> None:
    draft = make_draft(
        findings=[
            {
                "title": "Starke Korrosion am Rohr",
                "severity": "critical",
                "reasoning": "Wanddicke sichtbar reduziert.",
                "confidence": "medium",
            }
        ]
    )

    result = apply_safety_policy(draft, Trade.MALER)

    assert result.safety.risk_level is RiskLevel.HIGH
    assert "critical-finding" in rule_ids(result)


# --- Nie entschärfen ---------------------------------------------------------------


@pytest.mark.parametrize("trade", list(Trade))
@pytest.mark.parametrize("risk", list(RiskLevel))
@pytest.mark.parametrize("qualified", [True, False])
def test_policy_never_lowers_risk_or_qualified_person_requirement(
    trade: Trade, risk: RiskLevel, qualified: bool
) -> None:
    draft = make_draft(
        safety={
            "risk_level": risk.value,
            "qualified_person_required": qualified,
            "hazards": [h.value for h in Hazard],
            "notices": ["Hinweis des Modells"],
        }
    )

    result = apply_safety_policy(draft, trade)

    assert result.safety.risk_level.rank >= risk.rank
    assert result.safety.qualified_person_required >= qualified
    assert set(Hazard) <= set(result.safety.hazards)
    assert "Hinweis des Modells" in result.safety.notices


def test_policy_keeps_all_model_findings_checks_and_uncertainties() -> None:
    draft = make_draft(
        findings=[
            {"title": "A", "severity": "notice", "reasoning": "a", "confidence": "high"},
            {"title": "B", "severity": "warning", "reasoning": "b", "confidence": "low"},
        ],
        next_checks=[
            {
                "action": "Dichtung prüfen",
                "reason": "Tropfspuren",
                "requires_qualified_person": False,
            }
        ],
        uncertainties=["Rückseite nicht sichtbar"],
    )

    result = apply_safety_policy(draft, Trade.KLEMPNER)

    assert [f.title for f in result.findings] == ["A", "B"]
    assert "Dichtung prüfen" in [c.action for c in result.next_checks]
    assert "Rückseite nicht sichtbar" in result.uncertainties


# --- Freigabe-Formulierungen -------------------------------------------------------


@pytest.mark.parametrize(
    "text",
    [
        "Die Installation ist sicher.",
        "Die Anlage ist völlig unbedenklich und kann sicher in Betrieb genommen werden.",
        "Alles normgerecht ausgeführt.",
        "Die Verdrahtung entspricht den Normen.",
        "Es besteht keine Gefahr.",
        "Kein Handlungsbedarf.",
        "Die Anlage ist freigegeben.",
        "Der Anschluss ist VDE-konform.",
    ],
)
def test_approval_language_is_neutralized(text: str) -> None:
    cleaned, changed = neutralize_approval_language(text)

    assert changed
    assert rules.NEUTRALIZED in cleaned


@pytest.mark.parametrize(
    "text",
    [
        "Die Klemmen sind sicher falsch angeschlossen.",
        "Es ist nicht sicher, ob der Schutzleiter angeschlossen ist.",
        "Absturzsicherung prüfen.",
        "Der alte Putz wurde abgenommen.",
        "Sicherungsautomat B16 erkennbar.",
    ],
)
def test_warnings_and_neutral_text_are_not_touched(text: str) -> None:
    cleaned, changed = neutralize_approval_language(text)

    assert not changed
    assert cleaned == text


def test_approval_language_in_result_is_removed_and_flagged() -> None:
    draft = make_draft(
        summary="Unterverteilung, alles normgerecht.",
        findings=[
            {
                "title": "Keine Mängel",
                "severity": "info",
                "reasoning": "Die Anlage ist sicher.",
                "confidence": "high",
            }
        ],
    )

    result = apply_safety_policy(draft, Trade.ELEKTRIKER)

    model_texts = " ".join(
        [result.summary] + [f"{f.title} {f.reasoning}" for f in result.findings]
    ).lower()
    assert "normgerecht" not in model_texts
    assert "ist sicher" not in model_texts
    assert "keine mängel" not in model_texts
    assert rules.APPROVAL_UNCERTAINTY in result.uncertainties
    assert "approval-language" in rule_ids(result)


# --- Bildqualität ------------------------------------------------------------------


def test_unusable_image_lowers_confidence_and_requests_new_photo() -> None:
    draft = make_draft(
        image_quality={"usable": False, "issues": ["unscharf", "Gegenlicht"]},
        observations=[{"text": "Ein Gerät ist zu sehen.", "confidence": "high"}],
        findings=[
            {"title": "Unklar", "severity": "notice", "reasoning": "x", "confidence": "medium"}
        ],
    )

    result = apply_safety_policy(draft, Trade.ALLROUND)

    assert all(o.confidence == "low" for o in result.observations)
    assert all(f.confidence == "low" for f in result.findings)
    assert result.next_checks[0] == rules.UNUSABLE_IMAGE_CHECK
    assert "Bildqualität: unscharf" in result.uncertainties
    assert "image-quality" in rule_ids(result)
