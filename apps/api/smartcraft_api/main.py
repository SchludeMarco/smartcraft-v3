from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from smartcraft_api import __version__
from smartcraft_api.api.routes import health
from smartcraft_api.config import Settings, get_settings


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    app = FastAPI(title="Sm@rtCraft API", version=__version__)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["GET", "POST", "PATCH", "DELETE"],
        allow_headers=["*"],
    )
    app.include_router(health.router)
    return app


app = create_app()
