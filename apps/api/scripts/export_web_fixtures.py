"""Erzeugt Frontend-Testdaten aus echten Backend-Antworten (Mock-KI).

cd apps/api && uv run python -m scripts.export_web_fixtures
"""

import json
import tempfile
from pathlib import Path
from typing import Any

from fastapi.testclient import TestClient

from smartcraft_api.config import Settings
from smartcraft_api.main import create_app
from tests.images import make_image

OUT = Path(__file__).resolve().parents[2] / "web" / "src" / "test" / "fixtures"
SCENARIOS = [("unterverteilung", "elektriker"), ("unbrauchbares_foto", "allround")]


def _write(name: str, data: Any) -> None:
    path = OUT / name
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _analyse(client: TestClient, project_id: str, scenario: str, trade: str) -> Any:
    return client.post(
        f"/projects/{project_id}/analyses",
        data={"trade": trade, "note": f"[mock:{scenario}]"},
        files=[("files", ("a.jpg", make_image(), "image/jpeg"))],
    ).json()


def _stabilize_analysis(analysis: Any, analysis_id: str) -> None:
    """Stabile IDs/Zeitstempel, damit die Dateien nur bei echten Änderungen abweichen."""
    analysis.update(id=analysis_id, project_id="p1", created_at="2026-11-21T12:00:00Z")
    for i, capture in enumerate(analysis["captures"]):
        capture["id"] = f"{analysis_id}-c{i}"
    for i, check in enumerate(analysis["checks"]):
        check["id"] = f"{analysis_id}-k{i}"
        if check["completed_at"]:
            check["completed_at"] = "2026-11-21T13:00:00Z"


def _report(client: TestClient) -> Any:
    """Projekt mit zwei Analysen, einer Notiz und einem dokumentierten Fachkraft-Schritt."""
    project_id = client.post(
        "/projects",
        json={"name": "EFH Müller", "address": "Hauptstraße 5", "client": "Familie Müller"},
    ).json()["id"]
    analyses = [_analyse(client, project_id, s, t) for s, t in SCENARIOS]
    check = next(c for c in analyses[0]["checks"] if c["requires_qualified_person"])
    client.patch(
        f"/analyses/{analyses[0]['id']}/checks/{check['id']}",
        json={
            "status": "done",
            "completed_by": "Max Elektro",
            "comment": "Messprotokoll liegt vor",
            "qualified_person_confirmed": True,
        },
    )
    client.post(
        f"/projects/{project_id}/notes", json={"text": "Kunde informiert", "author": "Marco"}
    )
    report = client.get(f"/projects/{project_id}/report").json()
    report["generated_at"] = "2026-11-21T18:00:00Z"
    report["project"].update(
        id="p1", created_at="2026-11-21T10:00:00Z", updated_at="2026-11-21T12:00:00Z"
    )
    for i, note in enumerate(report["notes"]):
        note.update(id=f"n{i}", created_at="2026-11-21T12:30:00Z")
    for i, analysis in enumerate(report["analyses"]):
        _stabilize_analysis(analysis, f"r{i}")
    return report


def main() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        client = TestClient(create_app(Settings(database_url="sqlite://", storage_dir=Path(tmp))))
        OUT.mkdir(parents=True, exist_ok=True)
        for scenario, trade in SCENARIOS:
            project_id = client.post("/projects", json={"name": "Fixture"}).json()["id"]
            detail = _analyse(client, project_id, scenario, trade)
            overlay = client.get(f"/analyses/{detail['id']}/overlay").json()
            _stabilize_analysis(detail, f"a-{scenario}")
            _write(f"analysis-{scenario}.json", detail)
            _write(f"overlay-{scenario}.json", overlay)
        _write("report.json", _report(client))


if __name__ == "__main__":
    main()
