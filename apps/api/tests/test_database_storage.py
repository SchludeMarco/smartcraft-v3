"""Dauerhafter Speicher: Fotos in der Datenbank, Postgres-URL-Normalisierung (ADR 0013)."""

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from smartcraft_api.config import Settings, normalize_database_url
from smartcraft_api.main import create_app
from smartcraft_api.media.storage import DatabaseStorage, StorageError
from smartcraft_api.persistence.db import Base
from tests.conftest import TEST_DB
from tests.images import make_image


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("postgres://u:p@h/db?sslmode=require", "postgresql+psycopg://u:p@h/db?sslmode=require"),
        ("postgresql://u:p@h/db", "postgresql+psycopg://u:p@h/db"),
        ("postgresql+psycopg://u@h/db", "postgresql+psycopg://u@h/db"),
        ("sqlite:///./x.db", "sqlite:///./x.db"),
    ],
)
def test_normalize_database_url(raw: str, expected: str) -> None:
    assert normalize_database_url(raw) == expected


def test_vercel_style_env_names(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("SMARTCRAFT_DATABASE_URL", raising=False)
    monkeypatch.setenv("DATABASE_URL", "postgres://neon/db")
    assert Settings(_env_file=None).database_url == "postgres://neon/db"


@pytest.fixture
def db_client(tmp_path: Path):  # type: ignore[no-untyped-def]
    settings = Settings(
        database_url=TEST_DB or f"sqlite:///{tmp_path / 'dauerhaft.db'}",
        storage_backend="database",
        environment="test",
        storage_dir=tmp_path / "unbenutzt",
    )
    app = create_app(settings)
    with TestClient(app) as client:
        yield client, app
    Base.metadata.drop_all(app.state.engine)
    app.state.engine.dispose()


def test_photos_are_stored_in_database(db_client, tmp_path: Path) -> None:  # type: ignore[no-untyped-def]
    client, app = db_client
    assert isinstance(app.state.storage, DatabaseStorage)
    response = client.post(
        "/analyses",
        data={"trade": "maler", "note": "[mock:heizung]"},
        files=[("files", ("a.jpg", make_image(with_gps=True), "image/jpeg"))],
    )
    assert response.status_code == 201, response.text
    body = response.json()
    image = client.get(f"/analyses/{body['id']}/captures/{body['captures'][0]['id']}/image")
    assert image.status_code == 200
    assert image.content[:2] == b"\xff\xd8"
    assert b"GPS" not in image.content
    assert not (tmp_path / "unbenutzt").exists() or not any((tmp_path / "unbenutzt").iterdir())


def test_deleting_project_removes_photos(db_client) -> None:  # type: ignore[no-untyped-def]
    client, app = db_client
    project_id = client.post("/projects", json={"name": "Weg damit"}).json()["id"]
    created = client.post(
        f"/projects/{project_id}/analyses",
        data={"trade": "maler"},
        files=[("files", ("a.jpg", make_image(), "image/jpeg"))],
    ).json()
    key = None
    from smartcraft_api.persistence.models import CaptureRow

    with app.state.sessionmaker() as session:
        key = session.query(CaptureRow).filter_by(analysis_id=created["id"]).one().storage_key
    assert app.state.storage.read(key)
    assert client.delete(f"/projects/{project_id}").status_code == 204
    with pytest.raises(StorageError):
        app.state.storage.read(key)


def test_database_storage_rejects_foreign_keys(db_client) -> None:  # type: ignore[no-untyped-def]
    _, app = db_client
    with pytest.raises(StorageError):
        app.state.storage.read("../etc/passwd")
