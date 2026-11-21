from collections.abc import Iterator

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from smartcraft_api.config import Settings
from smartcraft_api.main import create_app


@pytest.fixture
def app() -> FastAPI:
    """Frische App mit In-Memory-Datenbank – keine Dateien, keine Netzwerkzugriffe."""
    return create_app(Settings(database_url="sqlite://", environment="test"))


@pytest.fixture
def client(app: FastAPI) -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def session(app: FastAPI) -> Iterator[Session]:
    with app.state.sessionmaker() as db_session:
        yield db_session
