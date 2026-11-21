import asyncio
from pathlib import Path
from typing import Any

import pytest
from fastapi import APIRouter, FastAPI
from fastapi.testclient import TestClient

from smartcraft_api.ai.mock import MOCK_INFO
from smartcraft_api.ai.provider import AnalysisRequest, ImageInput, ProviderError
from smartcraft_api.config import Settings
from smartcraft_api.domain.analysis import AnalysisDraft
from smartcraft_api.domain.trades import Trade
from smartcraft_api.main import create_app
from smartcraft_api.security.middleware import app_path
from smartcraft_api.security.rate_limit import RateLimiter, Window
from smartcraft_api.services.analysis_service import run_analysis
from tests.images import make_image

# --- RateLimiter -------------------------------------------------------------------


class FakeClock:
    def __init__(self) -> None:
        self.now = 1000.0

    def __call__(self) -> float:
        return self.now


def test_sliding_window_blocks_and_recovers() -> None:
    clock = FakeClock()
    limiter = RateLimiter(clock=clock)
    windows = [Window(limit=3, seconds=60)]

    assert [limiter.hit("b", "ip", windows).allowed for _ in range(3)] == [True] * 3
    blocked = limiter.hit("b", "ip", windows)
    assert not blocked.allowed
    assert 1 <= blocked.retry_after <= 61

    clock.now += 61
    assert limiter.hit("b", "ip", windows).allowed


def test_limits_are_per_client_and_per_bucket() -> None:
    limiter = RateLimiter(clock=FakeClock())
    one = [Window(1, 60)]

    assert limiter.hit("b", "a", one).allowed
    assert not limiter.hit("b", "a", one).allowed
    assert limiter.hit("b", "other-client", one).allowed
    assert limiter.hit("other-bucket", "a", one).allowed


def test_blocked_requests_do_not_count() -> None:
    clock = FakeClock()
    limiter = RateLimiter(clock=clock)
    windows = [Window(2, 60)]
    for _ in range(10):
        limiter.hit("b", "ip", windows)

    clock.now += 61

    assert limiter.hit("b", "ip", windows).allowed
    assert limiter.hit("b", "ip", windows).allowed


def test_strictest_window_wins() -> None:
    clock = FakeClock()
    limiter = RateLimiter(clock=clock)
    windows = [Window(5, 60), Window(6, 86_400)]
    for _ in range(5):
        limiter.hit("b", "ip", windows)
    clock.now += 61
    assert limiter.hit("b", "ip", windows).allowed  # 6. am Tag
    clock.now += 61

    decision = limiter.hit("b", "ip", windows)  # 7. am Tag

    assert not decision.allowed
    assert decision.retry_after > 3600


def test_memory_is_bounded() -> None:
    limiter = RateLimiter(clock=FakeClock(), max_keys=100)

    for i in range(1000):
        limiter.hit("b", f"ip-{i}", [Window(1, 60)])

    assert len(limiter._hits) == 100


# --- Middleware --------------------------------------------------------------------


def make_client(tmp_path: Path, **overrides: Any) -> TestClient:
    settings = Settings(
        database_url="sqlite://", storage_dir=tmp_path / "st", environment="test", **overrides
    )
    return TestClient(create_app(settings))


def upload(client: TestClient, project_id: str, ip: str = "1.2.3.4") -> Any:
    return client.post(
        f"/projects/{project_id}/analyses",
        data={"trade": "maler", "note": "[mock:heizung]"},
        files=[("files", ("a.jpg", make_image(), "image/jpeg"))],
        headers={"X-Forwarded-For": f"{ip}, 10.0.0.1"},
    )


def test_analysis_rate_limit_per_client(tmp_path: Path) -> None:
    client = make_client(tmp_path, rate_analyses_per_minute=2)
    project_id = client.post("/projects", json={"name": "P"}).json()["id"]

    assert upload(client, project_id).status_code == 201
    assert upload(client, project_id).status_code == 201
    blocked = upload(client, project_id)
    other_ip = upload(client, project_id, ip="5.6.7.8")

    assert blocked.status_code == 429
    assert blocked.json()["code"] == "rate_limited"
    assert "Zu viele Analysen" in blocked.json()["detail"]
    assert int(blocked.headers["Retry-After"]) > 0
    assert other_ip.status_code == 201


def test_global_daily_cost_brake(tmp_path: Path) -> None:
    client = make_client(tmp_path, max_analyses_per_day=2)
    project_id = client.post("/projects", json={"name": "P"}).json()["id"]

    statuses = [upload(client, project_id, ip=f"9.9.9.{i}").status_code for i in range(3)]

    assert statuses == [201, 201, 429]


def test_write_rate_limit(tmp_path: Path) -> None:
    client = make_client(tmp_path, rate_writes_per_minute=3)

    statuses = [client.post("/projects", json={"name": f"P{i}"}).status_code for i in range(4)]

    assert statuses == [201, 201, 201, 429]
    assert client.get("/projects").status_code == 200  # Lesen ist nicht begrenzt


def test_every_response_has_request_id(client: TestClient) -> None:
    generated = client.get("/health")
    echoed = client.get("/health", headers={"X-Request-ID": "abc-12345678"})
    rejected = client.get("/health", headers={"X-Request-ID": "<script>"})

    assert len(generated.headers["X-Request-ID"]) == 32
    assert echoed.headers["X-Request-ID"] == "abc-12345678"
    assert rejected.headers["X-Request-ID"] != "<script>"


def test_unexpected_errors_hide_details_but_return_error_id(app: FastAPI) -> None:
    router = APIRouter()

    @router.get("/kaputt")
    def broken() -> None:
        raise RuntimeError("geheime interne Details")

    app.include_router(router)
    client = TestClient(app, raise_server_exceptions=False)

    response = client.get("/kaputt")

    assert response.status_code == 500
    body = response.json()
    assert body["code"] == "internal_error"
    assert "geheime" not in response.text
    assert body["error_id"] in body["detail"]


def test_app_path_strips_mount_prefix() -> None:
    class Req:
        scope = {"path": "/api/projects/x/analyses", "root_path": "/api"}

    assert app_path(Req()) == "/projects/x/analyses"  # type: ignore[arg-type]


# --- Zeitlimit für KI-Aufrufe ------------------------------------------------------


class SlowProvider:
    info = MOCK_INFO

    async def analyze(self, request: AnalysisRequest) -> AnalysisDraft:
        await asyncio.sleep(5)
        raise AssertionError("darf nicht erreicht werden")


def test_slow_provider_times_out_with_provider_error() -> None:
    request = AnalysisRequest(
        trade=Trade.MALER, images=[ImageInput(data=b"\xff\xd8", media_type="image/jpeg")]
    )

    with pytest.raises(ProviderError, match="Zeitüberschreitung"):
        asyncio.run(run_analysis(SlowProvider(), request, timeout_seconds=0.05))


def test_timeout_returns_502_and_stores_nothing(tmp_path: Path) -> None:
    client = make_client(tmp_path, ai_timeout_seconds=0.05)
    client.app.state.provider = SlowProvider()  # type: ignore[attr-defined]
    project_id = client.post("/projects", json={"name": "P"}).json()["id"]

    response = upload(client, project_id)

    assert response.status_code == 502
    assert "Zeitüberschreitung" in response.json()["detail"]
    assert list((tmp_path / "st").glob("*")) == []
