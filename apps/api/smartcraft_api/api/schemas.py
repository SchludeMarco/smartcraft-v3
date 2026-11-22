"""Antwortmodelle der HTTP-API."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

from smartcraft_api.domain.analysis import AnalysisResult, RiskLevel
from smartcraft_api.domain.trades import Trade


class _Out(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class ProjectOut(_Out):
    id: str
    name: str
    address: str | None
    client: str | None
    description: str | None
    created_at: datetime
    updated_at: datetime
    analysis_count: int


class AnalysisSummaryOut(_Out):
    id: str
    project_id: str | None
    created_at: datetime
    trade: Trade
    risk_level: RiskLevel
    qualified_person_required: bool
    is_test_data: bool
    capture_count: int
    open_check_count: int
    # Kurztitel für Verlauf/Listen: Diagnose, sonst Zusammenfassung (gekürzt)
    title: str = ""
    note: str | None = None


class CheckItemOut(_Out):
    id: str
    position: int
    action: str
    reason: str
    requires_qualified_person: bool
    reference: str | None
    source: Literal["model", "policy"]
    component_indices: list[int]
    status: Literal["open", "done", "not_applicable"]
    completed_by: str | None
    completed_at: datetime | None
    comment: str | None
    qualified_person_confirmed: bool | None


class CaptureOut(_Out):
    id: str
    position: int
    media_type: str
    size_bytes: int
    width: int | None
    height: int | None


class AnalysisDetailOut(_Out):
    id: str
    project_id: str | None
    created_at: datetime
    note: str | None
    result: AnalysisResult
    captures: list[CaptureOut]
    checks: list[CheckItemOut]


class NoteOut(_Out):
    id: str
    text: str
    author: str | None
    created_at: datetime


class ReportSummaryOut(BaseModel):
    analysis_count: int
    highest_risk: RiskLevel | None
    qualified_person_required: bool
    contains_test_data: bool
    checks_total: int
    checks_open: int
    checks_done: int
    checks_not_applicable: int
    qualified_checks_open: int


class ProjectReportOut(BaseModel):
    """Projektbericht – Dokumentation, keine Freigabe. Enthält immer den Haftungshinweis."""

    generated_at: datetime
    disclaimer: str
    project: ProjectOut
    summary: ReportSummaryOut
    notes: list[NoteOut]
    analyses: list[AnalysisDetailOut]
