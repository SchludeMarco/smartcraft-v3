from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from smartcraft_api import __version__
from smartcraft_api.ai.registry import get_provider
from smartcraft_api.api.routes import analyses, health, projects
from smartcraft_api.config import Settings, get_settings
from smartcraft_api.media.storage import LocalStorage
from smartcraft_api.persistence.db import init_db, make_engine, make_sessionmaker


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    app = FastAPI(title="Sm@rtCraft API", version=__version__)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["GET", "POST", "PATCH", "DELETE"],
        allow_headers=["*"],
    )
    engine = make_engine(settings.database_url)
    init_db(engine)
    app.state.engine = engine
    app.state.sessionmaker = make_sessionmaker(engine)
    app.state.settings = settings
    app.state.storage = LocalStorage(settings.storage_dir)
    app.state.provider = get_provider(settings)
    app.include_router(health.router)
    app.include_router(projects.router)
    app.include_router(analyses.router)
    return app
