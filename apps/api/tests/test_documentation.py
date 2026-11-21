from typing import Any

import pytest
from fastapi.testclient import TestClient

from smartcraft_api.domain.documentation import REPORT_DISCLAIMER
from smartcraft_api.safety import rules
from tests.images import make_image


def new_project(client: TestClient, name: str = "Baustelle") -> str:
    project_id: str = client.post("/projects", json={"name": name}).json()["id"]
    return project_id


def new_analysis(client: TestClient, project_id: str, scenario: str = "unterverteilung") -> Any:
    response = client.post(
        f"/projects/{project_id}/analyses",
        data={"trade": "elektriker", "note": f"[mock:{scenario}]"},
        files=[("files", ("a.jpg", make_image(), "image/jpeg"))],
    )
    assert response.status_code == 201
    return response.json()


def patch_check(client: TestClient, analysis: Any, check: Any, **body: Any) -> Any:
    return client.patch(f"/analyses/{analysis['id']}/checks/{check['id']}", json=body)


def qualified_check(analysis: Any) -> Any:
    return next(c for c in analysis["checks"] if c["requires_qualified_person"])


# --- Prüfschritte dokumentieren ----------------------------------------------------


def test_mark_check_done_with_name_and_qualified_confirmation(client: TestClient) -> None:
    analysis = new_analysis(client, new_project(client))
    check = qualified_check(analysis)

    response = patch_check(
        client,
        analysis,
        check,
        status="done",
        completed_by=" M. Schlude ",
        comment="Gemessen, Protokoll im Ordner",
        qualified_person_confirmed=True,
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "done"
    assert body["completed_by"] == "M. Schlude"
    assert body["completed_at"] is not None
    assert body["qualified_person_confirmed"] is True


@pytest.mark.parametrize(
    ("body", "message"),
    [
        ({"status": "done"}, "wer den Prüfschritt"),
        ({"status": "done", "completed_by": "   "}, "wer den Prüfschritt"),
        ({"status": "done", "completed_by": "Max"}, "Fachkraft"),
        (
            {"status": "done", "completed_by": "Max", "qualified_person_confirmed": False},
            "Fachkraft",
        ),
        ({"status": "not_applicable", "completed_by": "Max"}, "begründen"),
    ],
)
def test_documentation_rules_for_qualified_checks(
    client: TestClient, body: dict[str, Any], message: str
) -> None:
    analysis = new_analysis(client, new_project(client))

    response = patch_check(client, analysis, qualified_check(analysis), **body)

    assert response.status_code == 422
    assert message in response.json()["detail"]


def test_simple_check_needs_no_qualified_confirmation(client: TestClient) -> None:
    analysis = new_analysis(client, new_project(client), scenario="heizung")
    simple = next(c for c in analysis["checks"] if not c["requires_qualified_person"])

    response = patch_check(client, analysis, simple, status="done", completed_by="Azubi Tim")

    assert response.status_code == 200
    assert response.json()["qualified_person_confirmed"] is None


def test_not_applicable_with_reason(client: TestClient) -> None:
    analysis = new_analysis(client, new_project(client))

    response = patch_check(
        client,
        analysis,
        analysis["checks"][0],
        status="not_applicable",
        completed_by="Max",
        comment="Abdeckung bereits vorhanden, Foto war alt",
    )

    assert response.status_code == 200
    assert response.json()["status"] == "not_applicable"


def test_reopening_clears_documentation(client: TestClient) -> None:
    analysis = new_analysis(client, new_project(client))
    check = qualified_check(analysis)
    patch_check(
        client, analysis, check, status="done", completed_by="Max", qualified_person_confirmed=True
    )

    body = patch_check(client, analysis, check, status="open").json()

    assert body["status"] == "open"
    assert body["completed_by"] is None
    assert body["completed_at"] is None
    assert body["qualified_person_confirmed"] is None


def test_documenting_checks_never_changes_the_ai_result(client: TestClient) -> None:
    analysis = new_analysis(client, new_project(client))
    before = client.get(f"/analyses/{analysis['id']}").json()["result"]
    overlay_before = client.get(f"/analyses/{analysis['id']}/overlay").json()

    for check in analysis["checks"]:
        patch_check(
            client,
            analysis,
            check,
            status="done",
            completed_by="Max",
            qualified_person_confirmed=True,
        )

    after = client.get(f"/analyses/{analysis['id']}")
    assert after.json()["result"] == before
    assert after.json()["result"]["safety"]["risk_level"] == "high"
    assert after.json()["result"]["safety"]["qualified_person_required"] is True
    assert client.get(f"/analyses/{analysis['id']}/overlay").json() == overlay_before
    assert all(c["status"] == "done" for c in after.json()["checks"])


def test_check_of_other_analysis_is_not_found(client: TestClient) -> None:
    project_id = new_project(client)
    first = new_analysis(client, project_id)
    second = new_analysis(client, project_id)

    response = patch_check(
        client,
        first,
        second["checks"][0],
        status="done",
        completed_by="Max",
        qualified_person_confirmed=True,
    )

    assert response.status_code == 404


def test_unknown_fields_like_approval_are_rejected(client: TestClient) -> None:
    analysis = new_analysis(client, new_project(client))

    response = patch_check(
        client, analysis, analysis["checks"][0], status="done", completed_by="Max", approved=True
    )

    assert response.status_code == 422


# --- Notizen -----------------------------------------------------------------------


def test_notes_create_list_delete(client: TestClient) -> None:
    project_id = new_project(client)

    created = client.post(
        f"/projects/{project_id}/notes", json={"text": "  Kunde informiert  ", "author": "Max"}
    )
    client.post(f"/projects/{project_id}/notes", json={"text": "Material bestellt"})
    notes = client.get(f"/projects/{project_id}/notes").json()

    assert created.status_code == 201
    assert created.json()["text"] == "Kunde informiert"
    assert {n["text"] for n in notes} == {"Kunde informiert", "Material bestellt"}
    note_id = created.json()["id"]
    assert client.delete(f"/projects/{project_id}/notes/{note_id}").status_code == 204
    assert len(client.get(f"/projects/{project_id}/notes").json()) == 1
    assert client.delete(f"/projects/{project_id}/notes/{note_id}").status_code == 404


@pytest.mark.parametrize("payload", [{"text": ""}, {"text": "   "}, {"text": "x" * 2001}])
def test_invalid_notes_are_rejected(client: TestClient, payload: dict[str, Any]) -> None:
    assert client.post(f"/projects/{new_project(client)}/notes", json=payload).status_code == 422


def test_note_of_other_project_cannot_be_deleted(client: TestClient) -> None:
    own, other = new_project(client), new_project(client, "Andere")
    note = client.post(f"/projects/{own}/notes", json={"text": "x"}).json()

    assert client.delete(f"/projects/{other}/notes/{note['id']}").status_code == 404


def test_deleting_project_removes_notes(client: TestClient) -> None:
    project_id = new_project(client)
    client.post(f"/projects/{project_id}/notes", json={"text": "x"})

    client.delete(f"/projects/{project_id}")

    assert client.get(f"/projects/{project_id}/notes").status_code == 404


# --- Bericht -----------------------------------------------------------------------


def test_report_contains_everything_and_the_disclaimer(client: TestClient) -> None:
    project_id = new_project(client, "EFH Müller")
    elektro = new_analysis(client, project_id, "unterverteilung")
    new_analysis(client, project_id, "unbrauchbares_foto")
    client.post(f"/projects/{project_id}/notes", json={"text": "Kunde informiert"})
    check = qualified_check(elektro)
    patch_check(
        client, elektro, check, status="done", completed_by="Max", qualified_person_confirmed=True
    )

    report = client.get(f"/projects/{project_id}/report").json()

    assert report["disclaimer"] == REPORT_DISCLAIMER
    assert report["project"]["name"] == "EFH Müller"
    assert [n["text"] for n in report["notes"]] == ["Kunde informiert"]
    summary = report["summary"]
    assert summary["analysis_count"] == 2
    assert summary["highest_risk"] == "high"
    assert summary["qualified_person_required"] is True
    assert summary["contains_test_data"] is True
    assert summary["checks_done"] == 1
    assert summary["checks_total"] == summary["checks_open"] + 1
    assert summary["qualified_checks_open"] >= 1
    for analysis in report["analyses"]:
        assert analysis["result"]["safety"]["disclaimer"] == rules.DISCLAIMER


def test_report_of_empty_project(client: TestClient) -> None:
    report = client.get(f"/projects/{new_project(client)}/report").json()

    assert report["summary"]["analysis_count"] == 0
    assert report["summary"]["highest_risk"] is None
    assert report["analyses"] == []


def test_report_of_unknown_project_is_404(client: TestClient) -> None:
    assert client.get("/projects/unbekannt/report").status_code == 404
