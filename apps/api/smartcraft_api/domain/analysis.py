"""Ergebnisschema einer Analyse (Version siehe SCHEMA_VERSION).

Zwei Stufen:
- `AnalysisDraft`: das, was ein KI-Provider liefern darf. Unbekannte Felder sind verboten
  (`extra="forbid"`), damit kein Modell Felder wie „approved“ einschmuggeln kann.
- `AnalysisResult`: das Endergebnis nach der Safety-Policy, inkl. Haftungshinweis und
  Protokoll aller Policy-Eingriffe.

Bewusst gibt es KEIN Feld für Freigabe, „sicher“ oder Normkonformität.
"""

from collections.abc import Sequence
from enum import StrEnum
from typing import Literal, Protocol, Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

from smartcraft_api.domain.trades import Trade

SCHEMA_VERSION = "1.3.0"

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


_EDGE_TOLERANCE = 1e-6


class Region(_Strict):
    """Position eines Bauteils im (bereinigten) Foto – Grundlage für Markierungen und AR.

    Normierte Koordinaten 0..1, Ursprung oben links, unabhängig von der Bildauflösung.
    """

    capture_index: int = Field(ge=0, description="Index des Fotos innerhalb der Analyse")
    x: float = Field(ge=0, le=1)
    y: float = Field(ge=0, le=1)
    width: float = Field(gt=0, le=1)
    height: float = Field(gt=0, le=1)

    @model_validator(mode="after")
    def _inside_image(self) -> "Region":
        if self.x + self.width > 1 + _EDGE_TOLERANCE or self.y + self.height > 1 + _EDGE_TOLERANCE:
            raise ValueError("Region ragt über den Bildrand hinaus")
        return self


class Component(_Strict):
    name: str
    category: str = Field(description="z. B. Schutzorgan, Leitung, Armatur, Bauteil")
    location_hint: str | None = None
    labels: list[LabelReading] = []
    region: Region | None = None


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
    component_indices: list[int] = Field(
        default=[], description="Betroffene Bauteile (Index in `components`)"
    )


class NextCheck(_Strict):
    action: str
    reason: str
    requires_qualified_person: bool
    reference: str | None = None
    source: Literal["model", "policy"] = "model"
    component_indices: list[int] = Field(
        default=[], description="Bauteile, an denen der Schritt ausgeführt wird; leer = allgemein"
    )


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
    diagnosis: str = Field(
        default="",
        description="Wahrscheinliche Ursache (wie V2-Diagnose), als Vermutung formuliert",
    )
    solution_steps: list[str] = Field(
        default=[],
        description="Schrittweise Lösung für einen erfahrenen Handwerker, ein Schritt pro Eintrag",
    )
    image_quality: ImageQuality
    components: list[Component] = []
    observations: list[Observation] = []
    findings: list[Finding] = []
    uncertainties: list[str] = []
    next_checks: list[NextCheck] = []
    safety: DraftSafety

    @model_validator(mode="after")
    def _component_references_exist(self) -> Self:
        _check_component_refs(self)
        return self


class _HasComponentRefs(Protocol):
    @property
    def components(self) -> Sequence[Component]: ...
    @property
    def observations(self) -> Sequence[Observation]: ...
    @property
    def findings(self) -> Sequence[Finding]: ...
    @property
    def next_checks(self) -> Sequence[NextCheck]: ...


def _check_component_refs(model: _HasComponentRefs) -> None:
    count = len(model.components)
    refs = [o.component_index for o in model.observations if o.component_index is not None]
    refs += [i for f in model.findings for i in f.component_indices]
    refs += [i for c in model.next_checks for i in c.component_indices]
    invalid = sorted({i for i in refs if not 0 <= i < count})
    if invalid:
        raise ValueError(f"Verweis auf nicht vorhandene Bauteile: {invalid}")


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


class AnalysisSource(_Strict):
    """Woher das Ergebnis stammt. `is_test_data` = keine echte Analyse (z. B. Mock-KI)."""

    provider_id: str
    model_id: str
    is_test_data: bool


class AnalysisResult(_Strict):
    schema_version: str = SCHEMA_VERSION
    trade: Trade
    source: AnalysisSource
    summary: str
    diagnosis: str = ""
    solution_steps: list[str] = []
    image_quality: ImageQuality
    components: list[Component]
    observations: list[Observation]
    findings: list[Finding]
    uncertainties: list[str]
    next_checks: list[NextCheck]
    safety: Safety
    policy: PolicyReport

    @model_validator(mode="after")
    def _component_references_exist(self) -> Self:
        _check_component_refs(self)
        return self
