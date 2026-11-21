"""Vercel-Einstiegspunkt: stellt das FastAPI-Backend unter /api bereit.

Demo-Betrieb (Entscheidung Marco, 21.11.2026): Vercel-Funktionen haben keinen dauerhaften
Speicher. Datenbank und Fotos liegen daher in /tmp und können jederzeit verschwinden;
`SMARTCRAFT_PERSISTENT_STORAGE=false` lässt die Oberfläche das deutlich anzeigen.
Siehe docs/adr/0007-vercel-demo-deployment.md.
"""

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "apps" / "api"))

# Nur Standardwerte – im Vercel-Dashboard gesetzte Variablen haben Vorrang.
os.environ.setdefault("SMARTCRAFT_ENVIRONMENT", "production")
os.environ.setdefault("SMARTCRAFT_DATABASE_URL", "sqlite:////tmp/smartcraft.db")
os.environ.setdefault("SMARTCRAFT_STORAGE_DIR", "/tmp/smartcraft-storage")
os.environ.setdefault("SMARTCRAFT_PERSISTENT_STORAGE", "false")
# Vercel nimmt pro Anfrage höchstens 4,5 MB an
os.environ.setdefault("SMARTCRAFT_MAX_UPLOAD_MB", "4")
os.environ.setdefault("SMARTCRAFT_AI_PROVIDER", "mock")

from fastapi import FastAPI  # noqa: E402

from smartcraft_api.main import create_app  # noqa: E402

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
app.mount("/api", create_app())
