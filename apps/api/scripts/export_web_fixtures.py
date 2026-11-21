"""Erzeugt Frontend-Testdaten aus echten Backend-Antworten (Mock-KI).

cd apps/api && uv run python -m scripts.export_web_fixtures
"""

import json
import tempfile
from pathlib import Path

from fastapi.testclient import TestClient

from smartcraft_api.config import Settings
from smartcraft_api.main import create_app
from tests.images import make_image

OUT = Path(__file__).resolve().parents[2] / "web" / "src" / "test" / "fixtures"
SCENARIOS = [("unterverteilung", "elektriker"), ("unbrauchbares_foto", "allround")]


def main() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        client = TestClient(create_app(Settings(database_url="sqlite://", storage_dir=Path(tmp))))
        OUT.mkdir(parents=True, exist_ok=True)
        for scenario, trade in SCENARIOS:
            project_id = client.post("/projects", json={"name": "Fixture"}).json()["id"]
            detail = client.post(
                f"/projects/{project_id}/analyses",
                data={"trade": trade, "note": f"[mock:{scenario}]"},
                files=[("files", ("a.jpg", make_image(), "image/jpeg"))],
            ).json()
            overlay = client.get(f"/analyses/{detail['id']}/overlay").json()
            # Stabile IDs/Zeitstempel, damit die Dateien nur bei echten Änderungen abweichen
            detail["id"], detail["project_id"] = f"a-{scenario}", "p1"
            detail["created_at"] = "2026-11-21T12:00:00Z"
            for i, capture in enumerate(detail["captures"]):
                capture["id"] = f"c{i}"
            for i, check in enumerate(detail["checks"]):
                check["id"] = f"k{i}"
            for name, data in (("analysis", detail), ("overlay", overlay)):
                path = OUT / f"{name}-{scenario}.json"
                path.write_text(
                    json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
                )


if __name__ == "__main__":
    main()
