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
    project_id: str
    created_at: datetime
    trade: Trade
    risk_level: RiskLevel
    qualified_person_required: bool
    is_test_data: bool
    capture_count: int
    open_check_count: int


class CheckItemOut(_Out):
    id: str
    position: int
    action: str
    reason: str
    requires_qualified_person: bool
    reference: str | None
    source: Literal["model", "policy"]
    status: Literal["open", "done", "not_applicable"]
    completed_by: str | None
    completed_at: datetime | None
    comment: str | None


class CaptureOut(_Out):
    id: str
    position: int
    media_type: str
    size_bytes: int
    width: int | None
    height: int | None


class AnalysisDetailOut(_Out):
    id: str
    project_id: str
    created_at: datetime
    note: str | None
    result: AnalysisResult
    captures: list[CaptureOut]
    checks: list[CheckItemOut]
