from fastapi.testclient import TestClient

from smartcraft_api import __version__
from smartcraft_api.main import create_app


def test_health_returns_ok_and_mock_provider_by_default() -> None:
    client = TestClient(create_app())

    response = client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["version"] == __version__
    assert body["ai_provider"] == "mock"


def test_openapi_schema_is_available() -> None:
    client = TestClient(create_app())

    response = client.get("/openapi.json")

    assert response.status_code == 200
    assert "/health" in response.json()["paths"]
