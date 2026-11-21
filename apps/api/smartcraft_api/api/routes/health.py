from typing import Annotated, Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from smartcraft_api import __version__
from smartcraft_api.config import Settings, get_settings

router = APIRouter(tags=["system"])


class HealthResponse(BaseModel):
    status: Literal["ok"]
    version: str
    environment: str
    ai_provider: str


@router.get("/health", response_model=HealthResponse)
def health(settings: Annotated[Settings, Depends(get_settings)]) -> HealthResponse:
    return HealthResponse(
        status="ok",
        version=__version__,
        environment=settings.environment,
        ai_provider=settings.ai_provider,
    )
