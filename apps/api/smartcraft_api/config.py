"""Zentrale Konfiguration. Werte kommen aus Umgebungsvariablen (Präfix SMARTCRAFT_) oder .env."""

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="SMARTCRAFT_", env_file=".env", extra="ignore")

    environment: Literal["development", "test", "production"] = "development"
    # Standard ist die kostenlose Mock-KI. Echte Provider nur nach ausdrücklicher Freigabe.
    ai_provider: Literal["mock"] = "mock"
    cors_origins: list[str] = ["http://localhost:5173"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
