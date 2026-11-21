from collections.abc import Iterator
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from smartcraft_api.ai.provider import AnalysisProvider
from smartcraft_api.config import Settings
from smartcraft_api.media.storage import Storage


def get_session(request: Request) -> Iterator[Session]:
    with request.app.state.sessionmaker() as session:
        yield session


def get_storage(request: Request) -> Storage:
    storage: Storage = request.app.state.storage
    return storage


def get_provider(request: Request) -> AnalysisProvider:
    provider: AnalysisProvider = request.app.state.provider
    return provider


def get_app_settings(request: Request) -> Settings:
    settings: Settings = request.app.state.settings
    return settings


SessionDep = Annotated[Session, Depends(get_session)]
StorageDep = Annotated[Storage, Depends(get_storage)]
ProviderDep = Annotated[AnalysisProvider, Depends(get_provider)]
SettingsDep = Annotated[Settings, Depends(get_app_settings)]
