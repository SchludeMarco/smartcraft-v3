"""Zentrale Konfiguration. Werte kommen aus Umgebungsvariablen (Präfix SMARTCRAFT_) oder .env."""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import AliasChoices, Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="SMARTCRAFT_", env_file=".env", extra="ignore")

    environment: Literal["development", "test", "production"] = "development"
    # Standard ist die kostenlose Mock-KI. "gemini" = wie V2 (Schlüssel des Betreibers).
    ai_provider: Literal["mock", "gemini"] = "mock"
    # Gemini-Schlüssel nur als Umgebungsvariable (Vercel), nie im Repo.
    gemini_api_key: SecretStr | None = Field(
        default=None,
        validation_alias=AliasChoices("SMARTCRAFT_GEMINI_API_KEY", "GEMINI_API_KEY"),
    )
    gemini_model: str = "gemini-flash-lite-latest"
    # Optionales Ausweichmodell für den letzten Versuch bei Überlastung (leer = keins)
    gemini_fallback_model: str = ""
    cors_origins: list[str] = ["http://localhost:5173"]
    # Lokal SQLite; dauerhaft Postgres (z. B. Neon über Vercel: DATABASE_URL / POSTGRES_URL)
    database_url: str = Field(
        default="sqlite:///./smartcraft.db",
        validation_alias=AliasChoices("SMARTCRAFT_DATABASE_URL", "DATABASE_URL", "POSTGRES_URL"),
    )
    # Ablage der bereinigten Fotos: "local" = Dateien in storage_dir, "database" = in der DB
    storage_backend: Literal["local", "database"] = "local"
    storage_dir: Path = Path("./storage")
    max_upload_mb: int = Field(default=15, ge=1, le=50)
    max_image_megapixels: int = Field(default=50, ge=1, le=200)
    # Längste Kante nach dem Verkleinern (V2-Erfahrung: 1600 px reichen für Beschriftungen)
    max_image_edge: int = Field(default=1600, ge=320, le=4096)
    # False = Daten liegen in flüchtigem Speicher (z. B. /tmp auf Vercel) und können
    # jederzeit verschwinden. Die Oberfläche zeigt dann einen Demo-Hinweis.
    persistent_storage: bool = True

    # --- Härtung ---------------------------------------------------------------------
    # Analysen pro Client; bremst Endlosschleifen und – mit echter KI – Kosten
    rate_analyses_per_minute: int = Field(default=10, ge=1)
    rate_analyses_per_day: int = Field(default=200, ge=1)
    # Kostenbremse: Analysen pro Tag über alle Clients (pro Instanz)
    max_analyses_per_day: int = Field(default=500, ge=1)
    # Übrige schreibende Anfragen pro Client
    rate_writes_per_minute: int = Field(default=120, ge=1)
    # Maximale Dauer eines KI-Aufrufs (Vercel-Funktion: 30 s)
    ai_timeout_seconds: float = Field(default=45, gt=0, le=120)


def normalize_database_url(url: str) -> str:
    """Neon/Vercel liefern `postgres://…` oder `postgresql://…`; SQLAlchemy braucht den Treiber."""
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix) :]
    return url


@lru_cache
def get_settings() -> Settings:
    return Settings()
