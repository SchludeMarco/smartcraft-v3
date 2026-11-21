from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from smartcraft_api.config import Settings
from smartcraft_api.main import create_app


@pytest.fixture
def settings(tmp_path: Path) -> Settings:
    return Settings(database_url="sqlite://", environment="test", storage_dir=tmp_path / "storage")


@pytest.fixture
def app(settings: Settings) -> FastAPI:
    """Frische App mit In-Memory-DB und temporärem Foto-Speicher, ohne Netzwerkzugriffe."""
    return create_app(settings)


@pytest.fixture
def client(app: FastAPI) -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def session(app: FastAPI) -> Iterator[Session]:
    with app.state.sessionmaker() as db_session:
        yield db_session
