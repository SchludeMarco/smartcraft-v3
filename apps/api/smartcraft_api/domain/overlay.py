"""Geräteunabhängige Einblendungs-Sicht auf ein Analyseergebnis (Smartphone-Markierungen, AR).

Ein Overlay ordnet Beschriftungen, Auffälligkeiten und Prüfschritte den Bauteilen zu, die im
Foto verortet sind („Anker“). Es ist eine reine Ableitung aus `AnalysisResult` – keine neue
KI-Aussage und keine eigene Sicherheitslogik.

Garantien (per Test abgesichert):
- Der Sicherheitsblock (Risiko, Fachkraft-Pflicht, Hinweise, Haftungshinweis, Testdaten) ist
  Pflichtbestandteil. Ein Client kann keine Bauteil-Einblendungen ohne ihn bekommen.
- Keine Auffälligkeit und kein Prüfschritt geht verloren: Was keinem verorteten Bauteil
  zugeordnet ist, steht in `general_findings` bzw. `general_checks`.
"""

from typing import Literal

from pydantic import BaseModel, ConfigDict

from smartcraft_api.domain.analysis import (
    AnalysisResult,
    Confidence,
    Hazard,
    Region,
    RiskLevel,
    Severity,
)

OVERLAY_VERSION = "1.0.0"

_SEVERITY_RANK: dict[str, int] = {"info": 0, "notice": 1, "warning": 2, "critical": 3}


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class OverlaySafety(_Strict):
    risk_level: RiskLevel
    qualified_person_required: bool
    hazards: list[Hazard]
    notices: list[str]
    disclaimer: str
    is_test_data: bool


class OverlayLabel(_Strict):
    text: str
    confidence: Confidence


class OverlayFinding(_Strict):
    index: int
    title: str
    severity: Severity
    confidence: Confidence


class OverlayCheck(_Strict):
    """`position` entspricht `CheckItem.position` – darüber kann ein Client ihn abhaken."""

    position: int
    action: str
    requires_qualified_person: bool
    reference: str | None
    source: Literal["model", "policy"]


class OverlayAnchor(_Strict):
    component_index: int
    name: str
    category: str
    region: Region
    labels: list[OverlayLabel]
    highest_severity: Severity | None
    findings: list[OverlayFinding]
    checks: list[OverlayCheck]


class AnalysisOverlay(_Strict):
    overlay_version: str = OVERLAY_VERSION
    analysis_schema_version: str
    safety: OverlaySafety
    anchors: list[OverlayAnchor]
    general_findings: list[OverlayFinding]
    general_checks: list[OverlayCheck]


def build_overlay(result: AnalysisResult) -> AnalysisOverlay:
    anchored = {i: c.region for i, c in enumerate(result.components) if c.region is not None}

    findings = [
        OverlayFinding(index=i, title=f.title, severity=f.severity, confidence=f.confidence)
        for i, f in enumerate(result.findings)
    ]
    checks = [
        OverlayCheck(
            position=i,
            action=c.action,
            requires_qualified_person=c.requires_qualified_person,
            reference=c.reference,
            source=c.source,
        )
        for i, c in enumerate(result.next_checks)
    ]

    anchors: list[OverlayAnchor] = []
    for index, region in anchored.items():
        component = result.components[index]
        own_findings = [
            findings[i] for i, f in enumerate(result.findings) if index in f.component_indices
        ]
        own_checks = [
            checks[i] for i, c in enumerate(result.next_checks) if index in c.component_indices
        ]
        anchors.append(
            OverlayAnchor(
                component_index=index,
                name=component.name,
                category=component.category,
                region=region,
                labels=[
                    OverlayLabel(text=lb.text, confidence=lb.confidence) for lb in component.labels
                ],
                highest_severity=max(
                    (f.severity for f in own_findings),
                    key=lambda s: _SEVERITY_RANK[s],
                    default=None,
                ),
                findings=own_findings,
                checks=own_checks,
            )
        )

    def is_anchored(indices: list[int]) -> bool:
        return any(i in anchored for i in indices)

    return AnalysisOverlay(
        analysis_schema_version=result.schema_version,
        safety=OverlaySafety(
            risk_level=result.safety.risk_level,
            qualified_person_required=result.safety.qualified_person_required,
            hazards=result.safety.hazards,
            notices=result.safety.notices,
            disclaimer=result.safety.disclaimer,
            is_test_data=result.source.is_test_data,
        ),
        anchors=anchors,
        general_findings=[
            findings[i]
            for i, f in enumerate(result.findings)
            if not is_anchored(f.component_indices)
        ],
        general_checks=[
            checks[i]
            for i, c in enumerate(result.next_checks)
            if not is_anchored(c.component_indices)
        ],
    )
