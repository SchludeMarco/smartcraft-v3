"""Zentrale Konfiguration. Werte kommen aus Umgebungsvariablen (Präfix SMARTCRAFT_) oder .env."""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="SMARTCRAFT_", env_file=".env", extra="ignore")

    environment: Literal["development", "test", "production"] = "development"
    # Standard ist die kostenlose Mock-KI. Echte Provider nur nach ausdrücklicher Freigabe.
    ai_provider: Literal["mock"] = "mock"
    cors_origins: list[str] = ["http://localhost:5173"]
    # Lokale SQLite-Datei; später z. B. postgresql+psycopg://…
    database_url: str = "sqlite:///./smartcraft.db"
    # Ablage der bereinigten Fotos (lokal)
    storage_dir: Path = Path("./storage")
    max_upload_mb: int = Field(default=15, ge=1, le=50)
    max_image_megapixels: int = Field(default=50, ge=1, le=200)
    # Längste Kante nach dem Verkleinern (V2-Erfahrung: 1600 px reichen für Beschriftungen)
    max_image_edge: int = Field(default=1600, ge=320, le=4096)
    # False = Daten liegen in flüchtigem Speicher (z. B. /tmp auf Vercel) und können
    # jederzeit verschwinden. Die Oberfläche zeigt dann einen Demo-Hinweis.
    persistent_storage: bool = True


@lru_cache
def get_settings() -> Settings:
    return Settings()
