"""Deterministische Safety-Policy.

Läuft nach jeder KI-Antwort. Grundsatz: Die Policy darf ein Ergebnis nur verschärfen,
nie entschärfen. Jeder Eingriff wird im Ergebnis protokolliert (`policy.interventions`).
"""

from collections.abc import Iterable

from smartcraft_api.domain.analysis import (
    AnalysisDraft,
    AnalysisResult,
    AnalysisSource,
    Component,
    Finding,
    Hazard,
    NextCheck,
    Observation,
    PolicyIntervention,
    PolicyReport,
    RiskLevel,
    Safety,
    max_risk,
)
from smartcraft_api.domain.trades import Trade
from smartcraft_api.safety import rules

POLICY_VERSION = "1.4.0"


class _Log:
    def __init__(self) -> None:
        self.items: list[PolicyIntervention] = []

    def add(self, rule_id: str, description: str) -> None:
        if not any(i.rule_id == rule_id and i.description == description for i in self.items):
            self.items.append(PolicyIntervention(rule_id=rule_id, description=description))


def _searchable_texts(draft: AnalysisDraft) -> Iterable[str]:
    yield draft.summary
    yield draft.diagnosis
    yield from draft.solution_steps
    for c in draft.components:
        yield c.name
        yield c.category
        if c.location_hint:
            yield c.location_hint
        yield from (label.text for label in c.labels)
    yield from (o.text for o in draft.observations)
    for f in draft.findings:
        yield f.title
        yield f.reasoning


def _component_texts(component: Component) -> list[str]:
    texts = [component.name, component.category, *(label.text for label in component.labels)]
    if component.location_hint:
        texts.append(component.location_hint)
    return texts


def hazard_components(draft: AnalysisDraft, hazard: Hazard) -> list[int]:
    """Bauteile, an denen eine Gefahr erkannt wurde – Anker für Pflicht-Prüfschritte (AR)."""
    pattern = rules.HAZARD_PATTERNS[hazard]
    return [
        i
        for i, component in enumerate(draft.components)
        if any(pattern.search(t) for t in _component_texts(component))
    ]


def detect_hazards(draft: AnalysisDraft, trade: Trade) -> list[Hazard]:
    """Vereinigung aus Modell-Angabe, Gewerk und Schlüsselwort-Erkennung (in Enum-Reihenfolge)."""
    found: set[Hazard] = set(draft.safety.hazards) | rules.TRADE_HAZARDS.get(trade, frozenset())
    texts = list(_searchable_texts(draft))
    for hazard, pattern in rules.HAZARD_PATTERNS.items():
        if any(pattern.search(t) for t in texts):
            found.add(hazard)
    return [h for h in Hazard if h in found]


def neutralize_approval_language(text: str) -> tuple[str, bool]:
    changed = False
    for pattern in rules.APPROVAL_PATTERNS:
        text, count = pattern.subn(rules.NEUTRALIZED, text)
        changed = changed or count > 0
    return text, changed


def _append_unique(items: list[str], value: str) -> None:
    if value not in items:
        items.append(value)


def apply_safety_policy(
    draft: AnalysisDraft,
    trade: Trade,
    source: AnalysisSource,
    *,
    image_count: int | None = None,
) -> AnalysisResult:
    """`image_count=0` = Analyse nur anhand der Beschreibung (wie in V2 erlaubt)."""
    log = _Log()

    # 1. Freigabe-Formulierungen neutralisieren
    def clean(text: str, where: str) -> str:
        cleaned, changed = neutralize_approval_language(text)
        if changed:
            log.add("approval-language", f"Freigabe-Formulierung entfernt ({where})")
        return cleaned

    summary = clean(draft.summary, "Zusammenfassung")
    diagnosis = clean(draft.diagnosis, "Diagnose")
    solution_steps = [clean(step, "Lösungsschritt") for step in draft.solution_steps]
    observations = [
        Observation(
            text=clean(o.text, "Beobachtung"),
            confidence=o.confidence,
            component_index=o.component_index,
        )
        for o in draft.observations
    ]
    findings = [
        Finding(
            title=clean(f.title, "Auffälligkeit"),
            severity=f.severity,
            reasoning=clean(f.reasoning, "Auffälligkeit"),
            confidence=f.confidence,
            component_indices=f.component_indices,
        )
        for f in draft.findings
    ]
    next_checks = [
        NextCheck(
            action=clean(c.action, "Prüfschritt"),
            reason=clean(c.reason, "Prüfschritt"),
            requires_qualified_person=c.requires_qualified_person,
            reference=c.reference,
            source="model",
            component_indices=c.component_indices,
        )
        for c in draft.next_checks
    ]
    notices = [clean(n, "Sicherheitshinweis") for n in draft.safety.notices]
    uncertainties = [clean(u, "Unsicherheit") for u in draft.uncertainties]
    approval_found = any(i.rule_id == "approval-language" for i in log.items)

    # 2. Gefahren erkennen und Mindestanforderungen je Gefahr durchsetzen
    hazards = detect_hazards(draft, trade)
    for hazard in hazards:
        if hazard not in draft.safety.hazards:
            log.add(f"hazard-detected:{hazard.value}", f"Gefahr erkannt: {hazard.value}")

    risk = draft.safety.risk_level
    qualified = draft.safety.qualified_person_required
    existing_actions = {c.action for c in next_checks}
    for hazard in hazards:
        rule = rules.HAZARD_RULES[hazard]
        new_risk = max_risk(risk, rule.min_risk)
        if new_risk != risk:
            log.add(
                "risk-floor", f"Risikostufe wegen {hazard.value} auf {new_risk.value} angehoben"
            )
            risk = new_risk
        if rule.qualified_person_required and not qualified:
            log.add("qualified-person", f"Fachkraft-Pflicht wegen {hazard.value} gesetzt")
            qualified = True
        for notice in rule.notices:
            _append_unique(notices, notice)
        anchors = hazard_components(draft, hazard)
        for check in rule.checks:
            if check.action not in existing_actions:
                next_checks.append(check.model_copy(update={"component_indices": anchors}))
                existing_actions.add(check.action)
                log.add("mandatory-check", f"Pflicht-Prüfschritt ergänzt ({hazard.value})")

    # 3. Kritische Auffälligkeiten heben das Risiko an
    if any(f.severity == "critical" for f in findings) and risk != RiskLevel.HIGH:
        log.add("critical-finding", "Risikostufe wegen kritischer Auffälligkeit angehoben")
        risk = RiskLevel.HIGH

    # 4. Bildqualität: Unbrauchbare Fotos senken die Konfidenz und verlangen ein neues Foto
    if not draft.image_quality.usable and image_count != 0:
        if any(o.confidence != "low" for o in observations) or any(
            f.confidence != "low" for f in findings
        ):
            log.add("image-quality", "Konfidenz wegen unbrauchbarem Foto auf 'low' gesenkt")
        observations = [o.model_copy(update={"confidence": "low"}) for o in observations]
        findings = [f.model_copy(update={"confidence": "low"}) for f in findings]
        if rules.UNUSABLE_IMAGE_CHECK.action not in existing_actions:
            next_checks.insert(0, rules.UNUSABLE_IMAGE_CHECK)
            log.add("image-quality", "Prüfschritt 'neues Foto' ergänzt")
        for issue in draft.image_quality.issues:
            _append_unique(uncertainties, f"Bildqualität: {issue}")

    # 4b. Ohne Foto: nur Beschreibung – niedrige Konfidenz, Foto als erster Prüfschritt
    if image_count == 0:
        if any(o.confidence != "low" for o in observations) or any(
            f.confidence != "low" for f in findings
        ):
            log.add("no-photo", "Konfidenz ohne Foto auf 'low' gesenkt")
        observations = [o.model_copy(update={"confidence": "low"}) for o in observations]
        findings = [f.model_copy(update={"confidence": "low"}) for f in findings]
        _append_unique(uncertainties, rules.NO_PHOTO_UNCERTAINTY)
        if rules.NO_PHOTO_CHECK.action not in existing_actions:
            next_checks.insert(0, rules.NO_PHOTO_CHECK)
            existing_actions.add(rules.NO_PHOTO_CHECK.action)
            log.add("no-photo", "Prüfschritt 'Foto aufnehmen' ergänzt")

    # 4c. Lösungsschritte bei Fachkraft-Pflicht klar als Fachkraft-Arbeit kennzeichnen
    if qualified and solution_steps and solution_steps[0] != rules.QUALIFIED_SOLUTION_STEP:
        solution_steps.insert(0, rules.QUALIFIED_SOLUTION_STEP)
        log.add("qualified-solution", "Lösungsschritte als Fachkraft-Arbeit gekennzeichnet")

    # 5. Unsicherheiten sind nie leer
    _append_unique(uncertainties, rules.BASELINE_UNCERTAINTY)
    if approval_found:
        _append_unique(uncertainties, rules.APPROVAL_UNCERTAINTY)

    # 6. Testdaten unübersehbar kennzeichnen – unabhängig davon, was der Provider schreibt
    if source.is_test_data:
        if not summary.startswith(rules.TEST_DATA_PREFIX):
            summary = f"{rules.TEST_DATA_PREFIX} {summary}"
        if rules.TEST_DATA_NOTICE in uncertainties:
            uncertainties.remove(rules.TEST_DATA_NOTICE)
        uncertainties.insert(0, rules.TEST_DATA_NOTICE)
        if rules.TEST_DATA_NOTICE in notices:
            notices.remove(rules.TEST_DATA_NOTICE)
        notices.insert(0, rules.TEST_DATA_NOTICE)
        log.add("test-data", f"Als Testdaten gekennzeichnet (Provider: {source.provider_id})")

    return AnalysisResult(
        trade=trade,
        source=source,
        summary=summary,
        diagnosis=diagnosis,
        solution_steps=solution_steps,
        image_quality=draft.image_quality,
        components=draft.components,
        observations=observations,
        findings=findings,
        uncertainties=uncertainties,
        next_checks=next_checks,
        safety=Safety(
            risk_level=risk,
            hazards=hazards,
            qualified_person_required=qualified,
            notices=notices,
            disclaimer=rules.DISCLAIMER,
        ),
        policy=PolicyReport(version=POLICY_VERSION, interventions=log.items),
    )
