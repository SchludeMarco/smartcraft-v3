"""Prüft den Vercel-Einstiegspunkt api/index.py (Demo-Betrieb) ohne Vercel."""

import os
import runpy
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from smartcraft_api.config import get_settings
from tests.images import make_image

ENTRY = Path(__file__).resolve().parents[3] / "api" / "index.py"
KEYS = [
    "SMARTCRAFT_ENVIRONMENT",
    "SMARTCRAFT_DATABASE_URL",
    "SMARTCRAFT_STORAGE_DIR",
    "SMARTCRAFT_PERSISTENT_STORAGE",
    "SMARTCRAFT_MAX_UPLOAD_MB",
    "SMARTCRAFT_AI_PROVIDER",
]


@pytest.fixture
def vercel_app(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> FastAPI:
    for key in KEYS:
        monkeypatch.delenv(key, raising=False)
    # Wie auf Vercel: /tmp-Pfade, hier auf ein Testverzeichnis umgebogen
    monkeypatch.setenv("SMARTCRAFT_DATABASE_URL", f"sqlite:///{tmp_path / 'demo.db'}")
    monkeypatch.setenv("SMARTCRAFT_STORAGE_DIR", str(tmp_path / "storage"))
    get_settings.cache_clear()
    module = runpy.run_path(str(ENTRY))
    for key in KEYS:  # von setdefault gesetzte Werte nach dem Test entfernen
        monkeypatch.setenv(key, os.environ[key])
    get_settings.cache_clear()
    app: FastAPI = module["app"]
    return app


def test_api_is_served_under_api_prefix_in_demo_mode(vercel_app: FastAPI) -> None:
    client = TestClient(vercel_app)

    health = client.get("/api/health").json()

    assert health["persistent_storage"] is False
    assert health["ai_provider"] == "mock"
    assert health["environment"] == "production"
    assert client.get("/health").status_code == 404
    assert client.get("/docs").status_code == 404


def test_full_flow_works_through_entrypoint(vercel_app: FastAPI) -> None:
    client = TestClient(vercel_app)
    project = client.post("/api/projects", json={"name": "Vercel-Demo"}).json()

    response = client.post(
        f"/api/projects/{project['id']}/analyses",
        data={"trade": "elektriker", "note": "[mock:unterverteilung]"},
        files=[("files", ("a.jpg", make_image(), "image/jpeg"))],
    )

    assert response.status_code == 201
    assert response.json()["result"]["source"]["is_test_data"] is True


def test_upload_limit_matches_vercel_request_limit(vercel_app: FastAPI) -> None:
    assert vercel_app.routes  # App ist gebaut
    settings = get_settings.__wrapped__()
    assert settings.max_upload_mb == 4
