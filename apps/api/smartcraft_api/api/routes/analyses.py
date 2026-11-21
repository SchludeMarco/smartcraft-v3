from fastapi import APIRouter, HTTPException, Response, status

from smartcraft_api.api.deps import SessionDep, StorageDep
from smartcraft_api.api.schemas import AnalysisDetailOut, CaptureOut, CheckItemOut
from smartcraft_api.domain.overlay import AnalysisOverlay, build_overlay
from smartcraft_api.media.storage import StorageError
from smartcraft_api.persistence import repository as repo
from smartcraft_api.persistence.models import AnalysisRow

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
