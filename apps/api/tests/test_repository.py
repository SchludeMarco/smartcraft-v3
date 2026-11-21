import asyncio

import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from smartcraft_api.ai.mock import MockProvider, MockScenario
from smartcraft_api.ai.provider import AnalysisRequest, ImageInput
from smartcraft_api.domain.analysis import AnalysisResult
from smartcraft_api.domain.projects import ProjectCreate, ProjectUpdate
from smartcraft_api.domain.trades import Trade
from smartcraft_api.persistence import repository as repo
from smartcraft_api.persistence.models import AnalysisRow, CaptureRow, CheckItemRow
from smartcraft_api.services.analysis_service import run_analysis

IMAGE = ImageInput(data=b"\xff\xd8\xff-test", media_type="image/jpeg")


def mock_result(scenario: MockScenario, trade: Trade = Trade.ELEKTRIKER) -> AnalysisResult:
    req = AnalysisRequest(trade=trade, images=[IMAGE], note=f"[mock:{scenario.value}]")
    return asyncio.run(run_analysis(MockProvider(), req))


def capture(key: str = "k1") -> repo.StoredCapture:
    return repo.StoredCapture(
        storage_key=key, media_type="image/jpeg", sha256="0" * 64, size_bytes=1234
    )


def test_save_analysis_roundtrip_keeps_result_identical(session: Session) -> None:
    project = repo.create_project(session, ProjectCreate(name="EFH Müller"))
    result = mock_result(MockScenario.UNTERVERTEILUNG)

    row = repo.save_analysis(session, project, result, [capture()], note="Keller")
    session.expire_all()
    loaded = repo.get_analysis(session, row.id)

    assert loaded is not None
    assert repo.load_result(loaded) == result
    assert loaded.is_test_data is True
    assert loaded.risk_level == "high"
    assert loaded.qualified_person_required is True
    assert loaded.note == "Keller"
    assert loaded.created_at.tzinfo is not None


def test_check_items_mirror_next_checks_and_start_open(session: Session) -> None:
    project = repo.create_project(session, ProjectCreate(name="P"))
    result = mock_result(MockScenario.UNTERVERTEILUNG)

    row = repo.save_analysis(session, project, result, [capture()])

    assert [c.action for c in row.checks] == [c.action for c in result.next_checks]
    assert all(c.status == "open" and c.completed_by is None for c in row.checks)
    assert {c.source for c in row.checks} == {"model", "policy"}


def test_result_from_outdated_policy_is_rejected(session: Session) -> None:
    project = repo.create_project(session, ProjectCreate(name="P"))
    result = mock_result(MockScenario.HEIZUNG)
    old = result.model_copy(
        update={"policy": result.policy.model_copy(update={"version": "0.0.1"})}
    )

    with pytest.raises(ValueError, match="Safety-Policy"):
        repo.save_analysis(session, project, old, [capture()])


def test_tampered_stored_result_fails_validation(session: Session) -> None:
    project = repo.create_project(session, ProjectCreate(name="P"))
    row = repo.save_analysis(session, project, mock_result(MockScenario.HEIZUNG), [capture()])
    row.result = {**row.result, "approved": True}
    session.commit()

    with pytest.raises(ValueError):
        repo.load_result(row)


def test_delete_project_cascades_and_returns_storage_keys(session: Session) -> None:
    project = repo.create_project(session, ProjectCreate(name="P"))
    other = repo.create_project(session, ProjectCreate(name="Anderes Projekt"))
    for i, scenario in enumerate(MockScenario):
        repo.save_analysis(session, project, mock_result(scenario), [capture(f"p-{i}")])
    repo.save_analysis(session, other, mock_result(MockScenario.HEIZUNG), [capture("o-1")])

    keys = repo.delete_project(session, project)

    assert sorted(keys) == ["p-0", "p-1", "p-2"]
    assert session.scalar(select(func.count(AnalysisRow.id))) == 1
    assert session.scalar(select(func.count(CaptureRow.id))) == 1
    remaining_checks = session.scalar(select(func.count(CheckItemRow.id)))
    assert remaining_checks == len(mock_result(MockScenario.HEIZUNG).next_checks)


def test_list_projects_counts_analyses_and_sorts_by_last_activity(session: Session) -> None:
    first = repo.create_project(session, ProjectCreate(name="Erstes"))
    second = repo.create_project(session, ProjectCreate(name="Zweites"))
    repo.save_analysis(session, first, mock_result(MockScenario.HEIZUNG), [capture("a")])
    repo.save_analysis(session, first, mock_result(MockScenario.HEIZUNG), [capture("b")])

    listed = repo.list_projects(session)

    assert [(p.name, n) for p, n in listed] == [("Erstes", 2), ("Zweites", 0)]
    assert second.id in {p.id for p, _ in listed}


def test_update_project_changes_only_given_fields(session: Session) -> None:
    project = repo.create_project(
        session, ProjectCreate(name="Alt", address="Hauptstr. 1", client="Meier")
    )

    repo.update_project(session, project, ProjectUpdate(name="Neu", address=None))

    assert (project.name, project.address, project.client) == ("Neu", None, "Meier")
