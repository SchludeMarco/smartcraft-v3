"""V2-Ablauf: Analyse ohne Projekt, Foto ODER Beschreibung, Diagnose + Lösungsschritte."""

import asyncio

from fastapi.testclient import TestClient

from smartcraft_api.ai.mock import MOCK_INFO, MockProvider, MockScenario, load_scenario
from smartcraft_api.ai.prompts import user_prompt
from smartcraft_api.ai.provider import AnalysisRequest
from smartcraft_api.domain.analysis import AnalysisSource, Hazard
from smartcraft_api.domain.trades import Trade
from smartcraft_api.safety import rules
from smartcraft_api.safety.policy import apply_safety_policy
from tests.images import make_image

SOURCE = AnalysisSource(provider_id="x", model_id="y", is_test_data=False)


def post(client: TestClient, note: str | None, images: int = 0, trade: str = "klempner"):  # type: ignore[no-untyped-def]
    files = [("files", (f"f{i}.jpg", make_image(), "image/jpeg")) for i in range(images)]
    data = {"trade": trade} | ({"note": note} if note is not None else {})
    return client.post("/analyses", data=data, files=files or None)


# --- Policy -----------------------------------------------------------------------


def test_policy_keeps_diagnosis_and_steps() -> None:
    draft = load_scenario(MockScenario.HEIZUNG)
    result = apply_safety_policy(draft, Trade.KLEMPNER, SOURCE, image_count=1)
    assert result.diagnosis == draft.diagnosis
    # Gastherme → Fachkraft-Pflicht → Hinweis vorangestellt, Schritte selbst unverändert
    assert result.solution_steps[-len(draft.solution_steps) :] == draft.solution_steps


def test_qualified_work_is_marked_before_solution_steps() -> None:
    draft = load_scenario(MockScenario.UNTERVERTEILUNG)
    result = apply_safety_policy(draft, Trade.ELEKTRIKER, SOURCE, image_count=1)
    assert result.safety.qualified_person_required
    assert result.solution_steps[0] == rules.QUALIFIED_SOLUTION_STEP
    assert result.solution_steps[1:] == draft.solution_steps
    assert any(i.rule_id == "qualified-solution" for i in result.policy.interventions)


def test_approval_language_in_diagnosis_and_steps_is_neutralized() -> None:
    draft = load_scenario(MockScenario.HEIZUNG).model_copy(
        update={
            "diagnosis": "Die Anlage ist sicher.",
            "solution_steps": ["Danach ist alles in Ordnung und normgerecht."],
        }
    )
    result = apply_safety_policy(draft, Trade.KLEMPNER, SOURCE, image_count=1)
    assert "sicher." not in result.diagnosis
    assert rules.NEUTRALIZED in result.diagnosis
    assert all("normgerecht" not in s for s in result.solution_steps)


def test_hazard_in_solution_steps_is_detected() -> None:
    draft = load_scenario(MockScenario.HEIZUNG).model_copy(
        update={"solution_steps": ["Leitung unter Spannung abklemmen und Steckdose tauschen."]}
    )
    result = apply_safety_policy(draft, Trade.ALLROUND, SOURCE, image_count=1)
    assert Hazard.ELECTRICAL in result.safety.hazards
    assert result.safety.qualified_person_required


def test_no_photo_lowers_confidence_and_asks_for_photo() -> None:
    draft = load_scenario(MockScenario.HEIZUNG)
    result = apply_safety_policy(draft, Trade.KLEMPNER, SOURCE, image_count=0)
    assert result.next_checks[0].action == rules.NO_PHOTO_CHECK.action
    assert rules.NO_PHOTO_UNCERTAINTY in result.uncertainties
    assert all(o.confidence == "low" for o in result.observations)
    assert all(f.confidence == "low" for f in result.findings)
    # kein doppelter "neues Foto"-Schritt aus der Bildqualitäts-Regel
    assert rules.UNUSABLE_IMAGE_CHECK.action not in [c.action for c in result.next_checks]


def test_mock_without_photo_is_deterministic_by_note() -> None:
    req = AnalysisRequest(trade=Trade.MALER, images=[], note="Wand blättert ab")
    first = asyncio.run(MockProvider().analyze(req))
    second = asyncio.run(MockProvider().analyze(req))
    assert first == second


def test_prompt_without_photos() -> None:
    text = user_prompt(Trade.MALER, 0, "Wand blättert ab")
    assert "Keine Fotos" in text
    assert "capture_index" not in text


# --- API --------------------------------------------------------------------------


def test_analysis_with_description_only(client: TestClient) -> None:
    response = post(client, "Wasserhahn tropft [mock:heizung]")
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["project_id"] is None
    assert body["captures"] == []
    assert body["result"]["diagnosis"]
    assert body["result"]["solution_steps"]
    assert rules.NO_PHOTO_UNCERTAINTY in body["result"]["uncertainties"]
    assert body["result"]["source"]["is_test_data"] is True


def test_analysis_needs_photo_or_description(client: TestClient) -> None:
    response = post(client, None)
    assert response.status_code == 422
    assert "Foto" in response.json()["detail"]
    assert post(client, "   ").status_code == 422


def test_analysis_with_photo_without_project(client: TestClient) -> None:
    response = post(client, "[mock:unterverteilung]", images=2, trade="elektriker")
    assert response.status_code == 201
    body = response.json()
    assert len(body["captures"]) == 2
    assert body["result"]["solution_steps"][0] == rules.QUALIFIED_SOLUTION_STEP
    image = client.get(f"/analyses/{body['id']}/captures/{body['captures'][0]['id']}/image")
    assert image.status_code == 200


def test_history_lists_newest_first(client: TestClient) -> None:
    a = post(client, "eins [mock:heizung]").json()["id"]
    b = post(client, "zwei [mock:unterverteilung]", trade="elektriker").json()["id"]
    items = client.get("/analyses").json()
    assert [i["id"] for i in items[:2]] == [b, a]
    assert items[0]["title"]
    assert items[0]["note"] == "zwei [mock:unterverteilung]"
    assert client.get("/analyses", params={"limit": 1}).json()[0]["id"] == b


def test_assign_and_unassign_project(client: TestClient) -> None:
    analysis_id = post(client, "[mock:heizung]").json()["id"]
    project_id = client.post("/projects", json={"name": "EFH Müller"}).json()["id"]

    assigned = client.patch(f"/analyses/{analysis_id}", json={"project_id": project_id})
    assert assigned.status_code == 200
    assert assigned.json()["project_id"] == project_id
    listed = client.get(f"/projects/{project_id}/analyses").json()
    assert [a["id"] for a in listed] == [analysis_id]
    assert client.get("/projects").json()[0]["analysis_count"] == 1

    missing = client.patch(f"/analyses/{analysis_id}", json={"project_id": "gibt-es-nicht"})
    assert missing.status_code == 404

    released = client.patch(f"/analyses/{analysis_id}", json={"project_id": None})
    assert released.json()["project_id"] is None
    assert client.get(f"/projects/{project_id}/analyses").json() == []


def test_mock_info_still_test_data() -> None:
    assert MOCK_INFO.is_test_data
