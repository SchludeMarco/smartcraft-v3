"""Ergebnisschema einer Analyse (Version siehe SCHEMA_VERSION).

Zwei Stufen:
- `AnalysisDraft`: das, was ein KI-Provider liefern darf. Unbekannte Felder sind verboten
  (`extra="forbid"`), damit kein Modell Felder wie „approved“ einschmuggeln kann.
- `AnalysisResult`: das Endergebnis nach der Safety-Policy, inkl. Haftungshinweis und
  Protokoll aller Policy-Eingriffe.

Bewusst gibt es KEIN Feld für Freigabe, „sicher“ oder Normkonformität.
"""

from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from smartcraft_api.domain.trades import Trade

SCHEMA_VERSION = "1.0.0"

Confidence = Literal["low", "medium", "high"]
Severity = Literal["info", "notice", "warning", "critical"]


class RiskLevel(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

    @property
    def rank(self) -> int:
        return _RISK_RANK[self]


_RISK_RANK = {RiskLevel.LOW: 1, RiskLevel.MEDIUM: 2, RiskLevel.HIGH: 3}


def max_risk(*levels: RiskLevel) -> RiskLevel:
    """Höchste Stufe – Grundlage dafür, dass die Policy nur verschärfen kann."""
    return max(levels, key=lambda level: level.rank)


class Hazard(StrEnum):
    ELECTRICAL = "electrical"
    GAS = "gas"
    STRUCTURAL = "structural"
    WORKING_AT_HEIGHT = "working_at_height"
    HAZARDOUS_MATERIAL = "hazardous_material"


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class LabelReading(_Strict):
    text: str = Field(description="Wörtlich gelesener Text; unlesbare Stellen als '?' markieren")
    confidence: Confidence


class Component(_Strict):
    name: str
    category: str = Field(description="z. B. Schutzorgan, Leitung, Armatur, Bauteil")
    location_hint: str | None = None
    labels: list[LabelReading] = []


class Observation(_Strict):
    """Nur, was auf dem Foto sichtbar ist – keine Schlüsse."""

    text: str
    confidence: Confidence
    component_index: int | None = None


class Finding(_Strict):
    """Auffälligkeit mit Begründung – eine Vermutung, keine Feststellung."""

    title: str
    severity: Severity
    reasoning: str
    confidence: Confidence


class NextCheck(_Strict):
    action: str
    reason: str
    requires_qualified_person: bool
    reference: str | None = None
    source: Literal["model", "policy"] = "model"


class ImageQuality(_Strict):
    usable: bool
    issues: list[str] = []


class DraftSafety(_Strict):
    risk_level: RiskLevel
    hazards: list[Hazard] = []
    qualified_person_required: bool
    notices: list[str] = []


class AnalysisDraft(_Strict):
    """Ausgabe eines KI-Providers vor der Safety-Policy."""

    summary: str = Field(description="Neutrale Kurzbeschreibung des Gesehenen, 1–2 Sätze")
    image_quality: ImageQuality
    components: list[Component] = []
    observations: list[Observation] = []
    findings: list[Finding] = []
    uncertainties: list[str] = []
    next_checks: list[NextCheck] = []
    safety: DraftSafety


class PolicyIntervention(_Strict):
    rule_id: str
    description: str


class Safety(_Strict):
    risk_level: RiskLevel
    hazards: list[Hazard]
    qualified_person_required: bool
    notices: list[str]
    disclaimer: str


class PolicyReport(_Strict):
    version: str
    interventions: list[PolicyIntervention]


class AnalysisResult(_Strict):
    schema_version: str = SCHEMA_VERSION
    trade: Trade
    summary: str
    image_quality: ImageQuality
    components: list[Component]
    observations: list[Observation]
    findings: list[Finding]
    uncertainties: list[str]
    next_checks: list[NextCheck]
    safety: Safety
    policy: PolicyReport
