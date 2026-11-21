"""Schreibt das OpenAPI-Schema als JSON – Grundlage der generierten Frontend-Typen.

uv run python -m smartcraft_api.openapi_export ../web/openapi.json
"""

import json
import sys
import tempfile
from pathlib import Path

from smartcraft_api.config import Settings
from smartcraft_api.main import create_app


def export_schema() -> str:
    with tempfile.TemporaryDirectory() as tmp:
        app = create_app(Settings(database_url="sqlite://", storage_dir=Path(tmp)))
        schema = app.openapi()
    return json.dumps(schema, indent=2, ensure_ascii=False, sort_keys=True) + "\n"


def main(argv: list[str]) -> int:
    content = export_schema()
    if len(argv) > 1:
        Path(argv[1]).write_text(content, encoding="utf-8")
    else:
        sys.stdout.write(content)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
