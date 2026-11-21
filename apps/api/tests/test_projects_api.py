import asyncio
import uuid
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from smartcraft_api.ai.mock import MockProvider, MockScenario
from smartcraft_api.ai.provider import AnalysisRequest, ImageInput
from smartcraft_api.domain.trades import Trade
from smartcraft_api.persistence import repository as repo
from smartcraft_api.safety import rules
from smartcraft_api.services.analysis_service import run_analysis


def create(api: TestClient, **data: Any) -> dict[str, Any]:
    response = api.post("/projects", json={"name": "Baustelle", **data})
    assert response.status_code == 201, response.text
    body: dict[str, Any] = response.json()
    return body


def add_mock_analysis(session: Session, project_id: str, scenario: MockScenario) -> str:
    project = repo.get_project(session, project_id)
    assert project is not None
    req = AnalysisRequest(
        trade=Trade.ELEKTRIKER,
        images=[ImageInput(data=b"\xff\xd8\xff", media_type="image/jpeg")],
        note=f"[mock:{scenario.value}]",
    )
    result = asyncio.run(run_analysis(MockProvider(), req))
    row = repo.save_analysis(
        session,
        project,
        result,
        [repo.StoredCapture(f"{uuid.uuid4()}.jpg", "image/jpeg", "0" * 64, 10, 800, 600)],
    )
    return row.id


# --- Projekte ----------------------------------------------------------------------


def test_create_and_get_project(client: TestClient) -> None:
    created = create(client, address=" Hauptstraße 5 ", client="Familie Meier")

    response = client.get(f"/projects/{created['id']}")

    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Baustelle"
    assert body["address"] == "Hauptstraße 5"
    assert body["client"] == "Familie Meier"
    assert body["analysis_count"] == 0
    assert body["created_at"].endswith(("Z", "+00:00"))


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"name": ""},
        {"name": "   "},
        {"name": "x" * 201},
        {"name": "ok", "approved": True},
        {"name": "ok", "description": "x" * 2001},
    ],
)
def test_create_project_validates_input(client: TestClient, payload: dict[str, Any]) -> None:
    assert client.post("/projects", json=payload).status_code == 422


def test_list_projects(client: TestClient) -> None:
    create(client, name="A")
    create(client, name="B")

    response = client.get("/projects")

    assert response.status_code == 200
    assert {p["name"] for p in response.json()} == {"A", "B"}


def test_patch_project(client: TestClient) -> None:
    created = create(client, address="Alt 1", client="Meier")

    response = client.patch(f"/projects/{created['id']}", json={"address": None, "name": "Neu"})

    assert response.status_code == 200
    body = response.json()
    assert (body["name"], body["address"], body["client"]) == ("Neu", None, "Meier")


def test_patch_project_rejects_removing_name(client: TestClient) -> None:
    created = create(client)

    assert client.patch(f"/projects/{created['id']}", json={"name": None}).status_code == 422


def test_delete_project_removes_project_and_analyses(client: TestClient, session: Session) -> None:
    created = create(client)
    analysis_id = add_mock_analysis(session, created["id"], MockScenario.HEIZUNG)

    assert client.delete(f"/projects/{created['id']}").status_code == 204
    assert client.get(f"/projects/{created['id']}").status_code == 404
    assert client.get(f"/analyses/{analysis_id}").status_code == 404


@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("get", "/projects/unbekannt"),
        ("patch", "/projects/unbekannt"),
        ("delete", "/projects/unbekannt"),
        ("get", "/projects/unbekannt/analyses"),
        ("get", "/analyses/unbekannt"),
    ],
)
def test_unknown_ids_return_404(client: TestClient, method: str, path: str) -> None:
    kwargs: dict[str, Any] = {"json": {"name": "x"}} if method == "patch" else {}
    assert getattr(client, method)(path, **kwargs).status_code == 404


# --- Analysen lesen ----------------------------------------------------------------


def test_project_analyses_list_shows_summary(client: TestClient, session: Session) -> None:
    created = create(client)
    add_mock_analysis(session, created["id"], MockScenario.UNTERVERTEILUNG)

    analyses = client.get(f"/projects/{created['id']}/analyses").json()
    project = client.get(f"/projects/{created['id']}").json()

    assert project["analysis_count"] == 1
    assert len(analyses) == 1
    summary = analyses[0]
    assert summary["risk_level"] == "high"
    assert summary["qualified_person_required"] is True
    assert summary["is_test_data"] is True
    assert summary["capture_count"] == 1
    assert summary["open_check_count"] >= 2


def test_analysis_detail_returns_policy_checked_result_and_checks(
    client: TestClient, session: Session
) -> None:
    created = create(client)
    analysis_id = add_mock_analysis(session, created["id"], MockScenario.UNTERVERTEILUNG)

    response = client.get(f"/analyses/{analysis_id}")

    assert response.status_code == 200
    body = response.json()
    result = body["result"]
    assert result["source"]["is_test_data"] is True
    assert result["summary"].startswith(rules.TEST_DATA_PREFIX)
    assert result["safety"]["disclaimer"] == rules.DISCLAIMER
    assert [c["action"] for c in body["checks"]] == [c["action"] for c in result["next_checks"]]
    assert all(c["status"] == "open" for c in body["checks"])
    assert body["captures"][0]["width"] == 800
    assert "storage_key" not in body["captures"][0]  # interne Pfade bleiben intern


def test_openapi_lists_project_and_analysis_routes(client: TestClient) -> None:
    paths = client.get("/openapi.json").json()["paths"]

    assert {"/projects", "/projects/{project_id}", "/projects/{project_id}/analyses"} <= set(paths)
    assert "/analyses/{analysis_id}" in paths
