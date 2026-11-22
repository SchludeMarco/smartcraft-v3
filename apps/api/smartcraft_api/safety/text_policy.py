"""Safety-Policy für die Freitext-Antworten der KI-Werkzeuge.

Gleicher Grundsatz wie `policy.py`: nur verschärfen, nie entschärfen, jeder Eingriff wird
protokolliert. Gefahren kommen aus Beruf, zugrunde liegender Analyse und dem Text selbst.
"""

from collections.abc import Iterable

from smartcraft_api.domain.analysis import AnalysisSource, Hazard, PolicyReport
from smartcraft_api.domain.tools import MaterialItem, ToolSafety
from smartcraft_api.domain.trades import Trade
from smartcraft_api.safety import rules
from smartcraft_api.safety.policy import POLICY_VERSION, _Log, neutralize_approval_language

TOOL_DISCLAIMER = (
    "KI-gestützter Vorschlag ohne Gewähr. Er ersetzt keine Prüfung, Messung, Planung oder "
    "Abnahme durch eine qualifizierte Fachkraft und stellt keine Sicherheitsfreigabe dar."
)


def apply_text_policy(
    *,
    text: str | None,
    materials: list[MaterialItem] | None,
    trade: Trade,
    context_texts: Iterable[str],
    context_hazards: Iterable[Hazard],
    context_qualified: bool,
    source: AnalysisSource,
) -> tuple[str | None, list[MaterialItem] | None, ToolSafety, PolicyReport]:
    log = _Log()

    def clean(value: str, where: str) -> str:
        cleaned, changed = neutralize_approval_language(value)
        if changed:
            log.add("approval-language", f"Freigabe-Formulierung entfernt ({where})")
        return cleaned

    if text is not None:
        text = clean(text, "Werkzeug-Antwort")
    if materials is not None:
        materials = [
            m.model_copy(update={"item": clean(m.item, "Materialliste")}) for m in materials
        ]

    found: set[Hazard] = set(context_hazards) | rules.TRADE_HAZARDS.get(trade, frozenset())
    searchable = [*context_texts, text or "", *(m.item for m in materials or [])]
    for hazard, pattern in rules.HAZARD_PATTERNS.items():
        if hazard not in found and any(pattern.search(t) for t in searchable):
            found.add(hazard)
            log.add(f"hazard-detected:{hazard.value}", f"Gefahr erkannt: {hazard.value}")
    hazards = [h for h in Hazard if h in found]

    qualified = context_qualified
    notices: list[str] = []
    for hazard in hazards:
        rule = rules.HAZARD_RULES[hazard]
        if rule.qualified_person_required and not qualified:
            log.add("qualified-person", f"Fachkraft-Pflicht wegen {hazard.value} gesetzt")
            qualified = True
        for notice in rule.notices:
            if notice not in notices:
                notices.append(notice)

    if source.is_test_data:
        notices.insert(0, rules.TEST_DATA_TOOL_NOTICE)
        log.add("test-data", f"Als Testdaten gekennzeichnet (Provider: {source.provider_id})")

    safety = ToolSafety(
        hazards=hazards,
        qualified_person_required=qualified,
        notices=notices,
        disclaimer=TOOL_DISCLAIMER,
    )
    return text, materials, safety, PolicyReport(version=POLICY_VERSION, interventions=log.items)
