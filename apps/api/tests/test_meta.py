from fastapi.testclient import TestClient

from smartcraft_api.domain.trades import Trade


def test_trades_lists_all_trades_with_labels(client: TestClient) -> None:
    trades = client.get("/meta/trades").json()

    assert [t["id"] for t in trades] == [t.value for t in Trade]
    assert {"id": "klempner", "label": "Klempner (Sanitär/Heizung)"} in trades


def test_analysis_limits(client: TestClient) -> None:
    limits = client.get("/meta/analysis-limits").json()

    assert limits["max_images"] == 5
    assert "image/jpeg" in limits["allowed_media_types"]
