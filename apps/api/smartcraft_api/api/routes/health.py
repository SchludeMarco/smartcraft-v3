from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel

from smartcraft_api import __version__
from smartcraft_api.api.deps import SettingsDep

router = APIRouter(tags=["system"])


class HealthResponse(BaseModel):
    status: Literal["ok"]
    version: str
    environment: str
    ai_provider: str
    persistent_storage: bool


@router.get("/health", response_model=HealthResponse)
def health(settings: SettingsDep) -> HealthResponse:
    return HealthResponse(
        status="ok",
        version=__version__,
        environment=settings.environment,
        ai_provider=settings.ai_provider,
        persistent_storage=settings.persistent_storage,
    )
