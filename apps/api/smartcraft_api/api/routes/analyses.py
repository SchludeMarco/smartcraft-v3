from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, Query, Response, UploadFile, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from smartcraft_api.ai.provider import ProviderError, ProviderOutputError
from smartcraft_api.api.deps import ProviderDep, SessionDep, SettingsDep, StorageDep
from smartcraft_api.api.schemas import (
    AnalysisDetailOut,
    AnalysisSummaryOut,
    CaptureOut,
    CheckItemOut,
)
from smartcraft_api.config import Settings
from smartcraft_api.domain.analysis import RiskLevel
from smartcraft_api.domain.documentation import CheckUpdate, DocumentationError
from smartcraft_api.domain.overlay import AnalysisOverlay, build_overlay
from smartcraft_api.domain.trades import Trade
from smartcraft_api.media.processing import InvalidImageError
from smartcraft_api.media.storage import Storage, StorageError
from smartcraft_api.persistence import repository as repo
from smartcraft_api.persistence.models import AnalysisRow, ProjectRow
from smartcraft_api.services.analysis_service import (
    MAX_IMAGES,
    MAX_NOTE_LENGTH,
    InvalidAnalysisRequestError,
)
from smartcraft_api.services.project_analysis import ImageLimits, create_project_analysis

router = APIRouter(prefix="/analyses", tags=["analyses"])


def analysis_detail(row: AnalysisRow) -> AnalysisDetailOut:
    return AnalysisDetailOut(
        id=row.id,
        project_id=row.project_id,
        created_at=row.created_at,
        note=row.note,
        result=repo.load_result(row),
        captures=[CaptureOut.model_validate(c) for c in row.captures],
        checks=[CheckItemOut.model_validate(c) for c in row.checks],
    )


def analysis_summary(row: AnalysisRow) -> AnalysisSummaryOut:
    result = repo.load_result(row)
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
        title=(result.diagnosis or result.summary)[:160],
        note=row.note,
    )


ANALYSIS_ERRORS: dict[int | str, dict[str, str]] = {
    422: {"description": "Ungültige Eingabe oder ungültiges Bild"},
    502: {"description": "KI-Provider fehlgeschlagen"},
}


async def handle_new_analysis(
    *,
    project: ProjectRow | None,
    trade: Trade,
    files: list[UploadFile],
    note: str | None,
    session: Session,
    storage: Storage,
    provider: ProviderDep,
    settings: Settings,
) -> AnalysisDetailOut:
    """Gemeinsamer Ablauf für Analysen mit und ohne Projekt (Upload → KI → Policy → DB)."""
    if len(files) > MAX_IMAGES:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, f"Höchstens {MAX_IMAGES} Fotos.")
    limits = ImageLimits.from_settings(settings)
    # Nur bis knapp über das Limit lesen – große Uploads nicht komplett in den Speicher holen.
    uploads = [await upload.read(limits.max_bytes + 1) for upload in files]
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
            timeout_seconds=settings.ai_timeout_seconds,
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


@router.post(
    "",
    response_model=AnalysisDetailOut,
    status_code=status.HTTP_201_CREATED,
    responses=ANALYSIS_ERRORS,
)
async def create_analysis(
    trade: Annotated[Trade, Form()],
    session: SessionDep,
    storage: StorageDep,
    provider: ProviderDep,
    settings: SettingsDep,
    files: Annotated[list[UploadFile] | None, File(description=f"0–{MAX_IMAGES} Fotos")] = None,
    note: Annotated[str | None, Form(max_length=MAX_NOTE_LENGTH)] = None,
) -> AnalysisDetailOut:
    """Analyse wie in V2: Foto(s) und/oder Beschreibung, ohne Projekt.

    Ergebnis ist immer durch die Safety-Policy geprüft. Einem Projekt zuordnen geht danach
    mit `PATCH /analyses/{id}`.
    """
    return await handle_new_analysis(
        project=None,
        trade=trade,
        files=files or [],
        note=note,
        session=session,
        storage=storage,
        provider=provider,
        settings=settings,
    )


@router.get("", response_model=list[AnalysisSummaryOut])
def list_recent(
    session: SessionDep, limit: Annotated[int, Query(ge=1, le=100)] = 20
) -> list[AnalysisSummaryOut]:
    """Verlauf: die letzten Analysen (mit und ohne Projekt), neueste zuerst."""
    return [analysis_summary(row) for row in repo.list_recent_analyses(session, limit)]


class AnalysisAssign(BaseModel):
    project_id: str | None


@router.patch("/{analysis_id}", response_model=AnalysisDetailOut)
def assign_analysis(
    analysis_id: str, data: AnalysisAssign, session: SessionDep
) -> AnalysisDetailOut:
    """Analyse einem Projekt zuordnen (oder mit `null` wieder lösen)."""
    row = _get_or_404(session, analysis_id)
    project = None
    if data.project_id is not None:
        project = repo.get_project(session, data.project_id)
        if project is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Projekt nicht gefunden")
    return analysis_detail(repo.assign_project(session, row, project))


def _get_or_404(session: SessionDep, analysis_id: str) -> AnalysisRow:
    row = repo.get_analysis(session, analysis_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Analyse nicht gefunden")
    return row


@router.get("/{analysis_id}", response_model=AnalysisDetailOut)
def get_analysis(analysis_id: str, session: SessionDep) -> AnalysisDetailOut:
    return analysis_detail(_get_or_404(session, analysis_id))


@router.get("/{analysis_id}/overlay", response_model=AnalysisOverlay)
def get_analysis_overlay(analysis_id: str, session: SessionDep) -> AnalysisOverlay:
    """Geräteunabhängige Einblendungs-Sicht (Markierungen im Foto, später AR-Brille).

    Enthält immer den Sicherheitsblock; Prüfschritte sind über `position` mit den
    Prüfschritten aus `GET /analyses/{id}` verknüpft.
    """
    return build_overlay(repo.load_result(_get_or_404(session, analysis_id)))


@router.get(
    "/{analysis_id}/captures/{capture_id}/image",
    response_class=Response,
    responses={200: {"content": {"image/jpeg": {}}}},
)
def get_capture_image(
    analysis_id: str, capture_id: str, session: SessionDep, storage: StorageDep
) -> Response:
    row = _get_or_404(session, analysis_id)
    capture = next((c for c in row.captures if c.id == capture_id), None)
    if capture is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Foto nicht gefunden")
    try:
        data = storage.read(capture.storage_key)
    except StorageError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Fotodatei fehlt") from exc
    return Response(
        content=data,
        media_type=capture.media_type,
        headers={"Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff"},
    )


@router.patch("/{analysis_id}/checks/{check_id}", response_model=CheckItemOut)
def update_check(
    analysis_id: str, check_id: str, update: CheckUpdate, session: SessionDep
) -> CheckItemOut:
    """Prüfschritt dokumentieren (erledigt / nicht zutreffend / wieder offen).

    Ändert nie das KI-Ergebnis, die Risikostufe oder die Fachkraft-Pflicht.
    """
    _get_or_404(session, analysis_id)
    check = repo.get_check(session, analysis_id, check_id)
    if check is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Prüfschritt nicht gefunden")
    try:
        return CheckItemOut.model_validate(repo.update_check(session, check, update))
    except DocumentationError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from exc
