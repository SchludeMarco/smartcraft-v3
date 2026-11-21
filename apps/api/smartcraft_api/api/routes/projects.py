import logging
from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, Response, UploadFile, status

from smartcraft_api.ai.provider import ProviderError, ProviderOutputError
from smartcraft_api.api.deps import ProviderDep, SessionDep, SettingsDep, StorageDep
from smartcraft_api.api.routes.analyses import analysis_detail
from smartcraft_api.api.schemas import (
    AnalysisDetailOut,
    AnalysisSummaryOut,
    NoteOut,
    ProjectOut,
    ProjectReportOut,
    ReportSummaryOut,
)
from smartcraft_api.domain.analysis import RiskLevel, max_risk
from smartcraft_api.domain.documentation import REPORT_DISCLAIMER, NoteCreate
from smartcraft_api.domain.projects import ProjectCreate, ProjectUpdate
from smartcraft_api.domain.trades import Trade
from smartcraft_api.media.processing import InvalidImageError
from smartcraft_api.media.storage import StorageError
from smartcraft_api.persistence import repository as repo
from smartcraft_api.persistence.db import utcnow
from smartcraft_api.persistence.models import AnalysisRow, ProjectRow
from smartcraft_api.services.analysis_service import (
    MAX_IMAGES,
    MAX_NOTE_LENGTH,
    InvalidAnalysisRequestError,
)
from smartcraft_api.services.project_analysis import ImageLimits, create_project_analysis

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/projects", tags=["projects"])


def _project_out(row: ProjectRow, analysis_count: int) -> ProjectOut:
    return ProjectOut(
        id=row.id,
        name=row.name,
        address=row.address,
        client=row.client,
        description=row.description,
        created_at=row.created_at,
        updated_at=row.updated_at,
        analysis_count=analysis_count,
    )


def analysis_summary(row: AnalysisRow) -> AnalysisSummaryOut:
    return AnalysisSummaryOut(
        id=row.id,
        project_id=row.project_id,
        created_at=row.created_at,
        trade=Trade(row.trade),
        risk_level=RiskLevel(row.risk_level),
        qualified_person_required=row.qualified_person_required,
        is_test_data=row.is_test_data,
        capture_count=len(row.captures),
        open_check_count=sum(1 for c in row.checks if c.status == "open"),
    )


def _get_or_404(session: SessionDep, project_id: str) -> ProjectRow:
    row = repo.get_project(session, project_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Projekt nicht gefunden")
    return row


@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(data: ProjectCreate, session: SessionDep) -> ProjectOut:
    return _project_out(repo.create_project(session, data), 0)


@router.get("", response_model=list[ProjectOut])
def list_projects(session: SessionDep) -> list[ProjectOut]:
    return [_project_out(row, n) for row, n in repo.list_projects(session)]


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(project_id: str, session: SessionDep) -> ProjectOut:
    row = _get_or_404(session, project_id)
    return _project_out(row, repo.count_analyses(session, row.id))


@router.patch("/{project_id}", response_model=ProjectOut)
def update_project(project_id: str, data: ProjectUpdate, session: SessionDep) -> ProjectOut:
    row = repo.update_project(session, _get_or_404(session, project_id), data)
    return _project_out(row, repo.count_analyses(session, row.id))


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: str, session: SessionDep, storage: StorageDep) -> Response:
    # Endgültig: Datenbankeinträge und Fotodateien
    for key in repo.delete_project(session, _get_or_404(session, project_id)):
        try:
            storage.delete(key)
        except StorageError:
            logger.warning("Fotodatei konnte nicht gelöscht werden: %r", key)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{project_id}/analyses", response_model=list[AnalysisSummaryOut])
def list_project_analyses(project_id: str, session: SessionDep) -> list[AnalysisSummaryOut]:
    _get_or_404(session, project_id)
    return [analysis_summary(row) for row in repo.list_analyses(session, project_id)]


@router.post(
    "/{project_id}/analyses",
    response_model=AnalysisDetailOut,
    status_code=status.HTTP_201_CREATED,
    responses={
        404: {"description": "Projekt nicht gefunden"},
        422: {"description": "Ungültige Eingabe oder ungültiges Bild"},
        502: {"description": "KI-Provider fehlgeschlagen"},
    },
)
async def create_analysis(
    project_id: str,
    trade: Annotated[Trade, Form()],
    files: Annotated[list[UploadFile], File(description=f"1–{MAX_IMAGES} Fotos")],
    session: SessionDep,
    storage: StorageDep,
    provider: ProviderDep,
    settings: SettingsDep,
    note: Annotated[str | None, Form(max_length=MAX_NOTE_LENGTH)] = None,
) -> AnalysisDetailOut:
    """Fotos hochladen und analysieren. Ergebnis ist immer durch die Safety-Policy geprüft."""
    project = _get_or_404(session, project_id)
    if len(files) > MAX_IMAGES:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, f"Höchstens {MAX_IMAGES} Fotos.")
    limits = ImageLimits.from_settings(settings)
    uploads: list[bytes] = []
    for upload in files:
        # Nur bis knapp über das Limit lesen – große Uploads nicht komplett in den Speicher holen.
        uploads.append(await upload.read(limits.max_bytes + 1))
    note = note.strip() or None if note else None
    try:
        row = await create_project_analysis(
            session=session,
            storage=storage,
            provider=provider,
            project=project,
            trade=trade,
            note=note,
            uploads=uploads,
            limits=limits,
        )
    except (InvalidAnalysisRequestError, InvalidImageError) as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from exc
    except ProviderOutputError as exc:
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY, "KI-Antwort entsprach nicht dem erwarteten Format."
        ) from exc
    except ProviderError as exc:
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY, f"KI-Analyse fehlgeschlagen: {exc}"
        ) from exc
    return analysis_detail(row)


# --- Notizen -----------------------------------------------------------------------


@router.get("/{project_id}/notes", response_model=list[NoteOut])
def list_notes(project_id: str, session: SessionDep) -> list[NoteOut]:
    _get_or_404(session, project_id)
    return [NoteOut.model_validate(n) for n in repo.list_notes(session, project_id)]


@router.post("/{project_id}/notes", response_model=NoteOut, status_code=status.HTTP_201_CREATED)
def create_note(project_id: str, data: NoteCreate, session: SessionDep) -> NoteOut:
    project = _get_or_404(session, project_id)
    return NoteOut.model_validate(repo.create_note(session, project, data))


@router.delete("/{project_id}/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(project_id: str, note_id: str, session: SessionDep) -> Response:
    _get_or_404(session, project_id)
    note = repo.get_note(session, project_id, note_id)
    if note is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Notiz nicht gefunden")
    repo.delete_note(session, note)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# --- Bericht -----------------------------------------------------------------------


@router.get("/{project_id}/report", response_model=ProjectReportOut)
def project_report(project_id: str, session: SessionDep) -> ProjectReportOut:
    """Alle Analysen, Prüfschritt-Dokumentation und Notizen eines Projekts.

    Dokumentation, keine Freigabe – der Haftungshinweis ist Pflichtbestandteil.
    """
    project = _get_or_404(session, project_id)
    rows = repo.list_analyses(session, project_id)
    analyses = [analysis_detail(row) for row in rows]
    checks = [c for row in rows for c in row.checks]
    risks = [RiskLevel(row.risk_level) for row in rows]
    summary = ReportSummaryOut(
        analysis_count=len(rows),
        highest_risk=max_risk(*risks) if risks else None,
        qualified_person_required=any(row.qualified_person_required for row in rows),
        contains_test_data=any(row.is_test_data for row in rows),
        checks_total=len(checks),
        checks_open=sum(1 for c in checks if c.status == "open"),
        checks_done=sum(1 for c in checks if c.status == "done"),
        checks_not_applicable=sum(1 for c in checks if c.status == "not_applicable"),
        qualified_checks_open=sum(
            1 for c in checks if c.status == "open" and c.requires_qualified_person
        ),
    )
    return ProjectReportOut(
        generated_at=utcnow(),
        disclaimer=REPORT_DISCLAIMER,
        project=_project_out(project, len(rows)),
        summary=summary,
        notes=[NoteOut.model_validate(n) for n in repo.list_notes(session, project_id)],
        analyses=analyses,
    )
