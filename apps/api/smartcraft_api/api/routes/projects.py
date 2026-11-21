from fastapi import APIRouter, HTTPException, Response, status

from smartcraft_api.api.deps import SessionDep
from smartcraft_api.api.schemas import AnalysisSummaryOut, ProjectOut
from smartcraft_api.domain.analysis import RiskLevel
from smartcraft_api.domain.projects import ProjectCreate, ProjectUpdate
from smartcraft_api.domain.trades import Trade
from smartcraft_api.persistence import repository as repo
from smartcraft_api.persistence.models import AnalysisRow, ProjectRow

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
def delete_project(project_id: str, session: SessionDep) -> Response:
    # Fotos im Dateispeicher werden ab Schritt 5 (Media-Pipeline) mit entfernt.
    repo.delete_project(session, _get_or_404(session, project_id))
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{project_id}/analyses", response_model=list[AnalysisSummaryOut])
def list_project_analyses(project_id: str, session: SessionDep) -> list[AnalysisSummaryOut]:
    _get_or_404(session, project_id)
    return [analysis_summary(row) for row in repo.list_analyses(session, project_id)]
