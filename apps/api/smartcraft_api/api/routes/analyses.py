from fastapi import APIRouter, HTTPException, status

from smartcraft_api.api.deps import SessionDep
from smartcraft_api.api.schemas import AnalysisDetailOut, CaptureOut, CheckItemOut
from smartcraft_api.persistence import repository as repo

router = APIRouter(prefix="/analyses", tags=["analyses"])


@router.get("/{analysis_id}", response_model=AnalysisDetailOut)
def get_analysis(analysis_id: str, session: SessionDep) -> AnalysisDetailOut:
    row = repo.get_analysis(session, analysis_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Analyse nicht gefunden")
    return AnalysisDetailOut(
        id=row.id,
        project_id=row.project_id,
        created_at=row.created_at,
        note=row.note,
        result=repo.load_result(row),
        captures=[CaptureOut.model_validate(c) for c in row.captures],
        checks=[CheckItemOut.model_validate(c) for c in row.checks],
    )
