"""Vercel-Einstiegspunkt: stellt das FastAPI-Backend unter /api bereit.

Dauerhaft (ADR 0013): Ist eine Postgres-Datenbank verbunden (Neon über den Vercel-Marketplace
setzt `DATABASE_URL`/`POSTGRES_URL`), liegen Projekte, Analysen und Fotos dort.
Ohne Datenbank bleibt der Demo-Betrieb aus ADR 0007: /tmp, flüchtig, mit Hinweis.
"""

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "apps" / "api"))

# Nur Standardwerte – im Vercel-Dashboard gesetzte Variablen haben Vorrang.
os.environ.setdefault("SMARTCRAFT_ENVIRONMENT", "production")
HAS_DATABASE = any(
    os.environ.get(k, "").startswith("postgres")
    for k in ("SMARTCRAFT_DATABASE_URL", "DATABASE_URL", "POSTGRES_URL")
)
if HAS_DATABASE:
    os.environ.setdefault("SMARTCRAFT_STORAGE_BACKEND", "database")
    os.environ.setdefault("SMARTCRAFT_PERSISTENT_STORAGE", "true")
else:
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
