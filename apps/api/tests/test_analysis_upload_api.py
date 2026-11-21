from pathlib import Path
from typing import Any

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from smartcraft_api.ai.mock import MOCK_INFO
from smartcraft_api.ai.provider import AnalysisRequest, ProviderError
from smartcraft_api.config import Settings
from smartcraft_api.domain.analysis import AnalysisDraft
from smartcraft_api.persistence import repository as repo
from smartcraft_api.safety import rules
from tests.images import CAMERA_MARKER, exif_of, make_image, make_noise_png


def new_project(client: TestClient) -> str:
    response = client.post("/projects", json={"name": "Baustelle"})
    assert response.status_code == 201
    project_id: str = response.json()["id"]
    return project_id


def upload(
    client: TestClient,
    project_id: str,
    images: list[bytes] | None = None,
    trade: str = "elektriker",
    note: str | None = "[mock:unterverteilung]",
) -> Any:
    images = [make_image(with_gps=True)] if images is None else images
    files = [("files", (f"foto{i}.jpg", data, "image/jpeg")) for i, data in enumerate(images)]
    data = {"trade": trade} | ({"note": note} if note is not None else {})
    return client.post(f"/projects/{project_id}/analyses", data=data, files=files)


def stored_files(settings: Settings) -> list[Path]:
    return sorted(settings.storage_dir.glob("*"))


# --- Erfolgsfall -------------------------------------------------------------------


def test_upload_runs_full_pipeline_and_returns_policy_checked_result(
    client: TestClient, settings: Settings
) -> None:
    project_id = new_project(client)

    response = upload(client, project_id, [make_image(with_gps=True), make_image((3000, 2000))])

    assert response.status_code == 201, response.text
    body = response.json()
    result = body["result"]
    assert result["source"]["is_test_data"] is True
    assert result["summary"].startswith(rules.TEST_DATA_PREFIX)
    assert result["safety"]["risk_level"] == "high"
    assert result["safety"]["qualified_person_required"] is True
    assert result["safety"]["disclaimer"] == rules.DISCLAIMER
    assert body["note"] == "[mock:unterverteilung]"
    assert [c["width"] for c in body["captures"]] == [400, 1600]
    assert len(stored_files(settings)) == 2

    listing = client.get(f"/projects/{project_id}/analyses").json()
    assert [a["id"] for a in listing] == [body["id"]]


def test_stored_and_served_photo_has_no_metadata(client: TestClient) -> None:
    project_id = new_project(client)
    body = upload(client, project_id).json()
    capture = body["captures"][0]

    response = client.get(f"/analyses/{body['id']}/captures/{capture['id']}/image")

    assert response.status_code == 200
    assert response.headers["content-type"] == "image/jpeg"
    assert response.headers["x-content-type-options"] == "nosniff"
    assert exif_of(response.content) == {}
    assert CAMERA_MARKER.encode() not in response.content


def test_provider_only_receives_cleaned_images(app: FastAPI, client: TestClient) -> None:
    seen: list[AnalysisRequest] = []
    original = app.state.provider

    class Spy:
        info = MOCK_INFO

        async def analyze(self, request: AnalysisRequest) -> AnalysisDraft:
            seen.append(request)
            result: AnalysisDraft = await original.analyze(request)
            return result

    app.state.provider = Spy()
    upload(client, new_project(client), [make_image(with_gps=True)])

    image = seen[0].images[0]
    assert image.media_type == "image/jpeg"
    assert exif_of(image.data) == {}
    assert CAMERA_MARKER.encode() not in image.data


def test_mock_without_tag_is_reproducible_for_same_photo(client: TestClient) -> None:
    project_id = new_project(client)
    photo = make_image((500, 500))

    first = upload(client, project_id, [photo], note=None).json()
    second = upload(client, project_id, [photo], note=None).json()

    assert first["result"]["summary"] == second["result"]["summary"]


def test_blank_note_is_stored_as_none(client: TestClient) -> None:
    body = upload(client, new_project(client), note="   ").json()

    assert body["note"] is None


# --- Fehlerfälle -------------------------------------------------------------------


@pytest.mark.parametrize(
    ("kwargs", "detail_part"),
    [
        ({"images": [b"kein bild"]}, "kein gültiges Bild"),
        ({"images": [make_image()] * 6}, "Höchstens 5"),
        ({"trade": "astronaut"}, ""),
        ({"note": "x" * 2001}, ""),
    ],
)
def test_invalid_uploads_are_rejected_and_leave_no_files(
    client: TestClient, settings: Settings, kwargs: dict[str, Any], detail_part: str
) -> None:
    response = upload(client, new_project(client), **kwargs)

    assert response.status_code == 422
    assert detail_part in str(response.json()["detail"])
    assert stored_files(settings) == []


def test_missing_files_are_rejected(client: TestClient) -> None:
    project_id = new_project(client)

    response = client.post(f"/projects/{project_id}/analyses", data={"trade": "maler"})

    assert response.status_code == 422


def test_too_large_upload_is_rejected(app: FastAPI, client: TestClient) -> None:
    app.state.settings = app.state.settings.model_copy(update={"max_upload_mb": 1})
    big = make_noise_png((800, 800))  # Rauschen lässt sich kaum komprimieren
    assert len(big) > 1024 * 1024

    response = upload(client, new_project(client), [big])

    assert response.status_code == 422
    assert "zu groß" in response.json()["detail"]


def test_unknown_project_returns_404(client: TestClient) -> None:
    assert upload(client, "gibt-es-nicht").status_code == 404


def test_provider_failure_returns_502_and_leaves_no_files(
    app: FastAPI, client: TestClient, settings: Settings
) -> None:
    class Failing:
        info = MOCK_INFO

        async def analyze(self, request: AnalysisRequest) -> AnalysisDraft:
            raise ProviderError("Zeitüberschreitung")

    app.state.provider = Failing()

    response = upload(client, new_project(client))

    assert response.status_code == 502
    assert stored_files(settings) == []


def test_unknown_mock_tag_returns_502(client: TestClient) -> None:
    response = upload(client, new_project(client), note="[mock:gibtsnicht]")

    assert response.status_code == 502


def test_database_failure_removes_already_stored_files(
    client: TestClient, settings: Settings, monkeypatch: pytest.MonkeyPatch
) -> None:
    def broken_save(*args: Any, **kwargs: Any) -> None:
        raise RuntimeError("DB weg")

    monkeypatch.setattr(repo, "save_analysis", broken_save)
    project_id = new_project(client)

    with pytest.raises(RuntimeError):
        upload(client, project_id, [make_image(), make_image()])

    assert stored_files(settings) == []


# --- Löschen und Fotozugriff -------------------------------------------------------


def test_deleting_project_removes_photo_files(client: TestClient, settings: Settings) -> None:
    project_id = new_project(client)
    upload(client, project_id, [make_image(), make_image()])
    assert len(stored_files(settings)) == 2

    assert client.delete(f"/projects/{project_id}").status_code == 204
    assert stored_files(settings) == []


def test_capture_image_404s(client: TestClient) -> None:
    body = upload(client, new_project(client)).json()

    assert client.get(f"/analyses/{body['id']}/captures/unbekannt/image").status_code == 404
    assert client.get("/analyses/unbekannt/captures/x/image").status_code == 404
