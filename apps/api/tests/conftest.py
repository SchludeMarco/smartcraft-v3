import os
from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from smartcraft_api.config import Settings
from smartcraft_api.main import create_app
from smartcraft_api.persistence.db import Base

# Gegen echtes Postgres testen (CI-Job „api-postgres“): SMARTCRAFT_TEST_DATABASE_URL setzen.
# Fotos bleiben dabei lokal (viele Tests prüfen die Dateien); DatabaseStorage hat eigene Tests.
TEST_DB = os.environ.get("SMARTCRAFT_TEST_DATABASE_URL")


@pytest.fixture
def settings(tmp_path: Path) -> Settings:
    if TEST_DB:
        return Settings(
            database_url=TEST_DB,
            environment="test",
            storage_dir=tmp_path / "storage",
        )
    return Settings(database_url="sqlite://", environment="test", storage_dir=tmp_path / "storage")


@pytest.fixture
def app(settings: Settings) -> Iterator[FastAPI]:
    """Frische App mit leerer DB und temporärem Foto-Speicher, ohne Netzwerkzugriffe."""
    application = create_app(settings)
    yield application
    if TEST_DB:
        Base.metadata.drop_all(application.state.engine)
        application.state.engine.dispose()


@pytest.fixture
def client(app: FastAPI) -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def session(app: FastAPI) -> Iterator[Session]:
    with app.state.sessionmaker() as db_session:
        yield db_session
