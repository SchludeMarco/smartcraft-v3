"""Ergebnis eines KI-Werkzeugs (Materialliste, Kundenbericht, Berufs-Spezial-Tool …).

Wie beim Analyseergebnis gibt es KEIN Feld für Freigabe, „sicher“ oder Normkonformität.
Der Sicherheitsblock ist Pflichtbestandteil.
"""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from smartcraft_api.domain.analysis import AnalysisSource, Hazard, PolicyReport
from smartcraft_api.domain.trades import Trade


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class MaterialItem(_Strict):
    category: str = Field(max_length=80)
    item: str = Field(max_length=300)
    quantity: str = Field(max_length=80)


class ToolSafety(_Strict):
    hazards: list[Hazard]
    qualified_person_required: bool
    notices: list[str]
    disclaimer: str


class ToolResult(_Strict):
    tool_id: str
    label: str
    trade: Trade
    analysis_id: str | None
    # Grundlage wie in V2: Analyse > Beschreibung > nur der Beruf
    basis: Literal["analysis", "description", "trade"]
    text: str | None = None
    materials: list[MaterialItem] | None = None
    safety: ToolSafety
    source: AnalysisSource
    policy: PolicyReport
    prompt_version: str
