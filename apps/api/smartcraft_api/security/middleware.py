"""Request-ID, Rate-Limit und einheitliche Fehlerantworten."""

import logging
import re
import uuid

from fastapi import Request
from fastapi.responses import JSONResponse, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.types import ASGIApp

from smartcraft_api.config import Settings
from smartcraft_api.security.rate_limit import RateLimiter, Window

logger = logging.getLogger("smartcraft")

_REQUEST_ID = re.compile(r"^[A-Za-z0-9-]{8,64}$")
# Alles, was die KI aufruft (und damit Kosten verursacht), zählt gegen das Analyse-Limit:
# Analysen mit/ohne Projekt und KI-Werkzeuge.
_ANALYSIS_POST = re.compile(r"^(?:/projects/[^/]+)?/analyses/?$|^/tools/[^/]+/?$")
_WRITE_METHODS = {"POST", "PATCH", "PUT", "DELETE"}


def client_key(request: Request) -> str:
    # Hinter Vercel steht die echte Client-IP als erster Eintrag in X-Forwarded-For.
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unbekannt"


def app_path(request: Request) -> str:
    """Pfad ohne Präfix eines Mounts (z. B. /api auf Vercel)."""
    path = str(request.scope.get("path", ""))
    root = str(request.scope.get("root_path", ""))
    return path[len(root) :] if root and path.startswith(root) else path


def _retry(prefix: str, seconds: int) -> str:
    return f"{prefix} Bitte in {seconds} Sekunden erneut versuchen."


def _rate_limited(retry_after: int, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=429,
        content={"detail": message, "code": "rate_limited", "retry_after": retry_after},
        headers={"Retry-After": str(retry_after)},
    )


class GuardMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp, settings: Settings, limiter: RateLimiter) -> None:
        super().__init__(app)
        self.settings = settings
        self.limiter = limiter

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        incoming = request.headers.get("x-request-id", "")
        request_id = incoming if _REQUEST_ID.fullmatch(incoming) else uuid.uuid4().hex
        request.state.request_id = request_id

        blocked = self._check_rate_limit(request)
        response = blocked if blocked is not None else await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response

    def _check_rate_limit(self, request: Request) -> Response | None:
        if request.method not in _WRITE_METHODS:
            return None
        s = self.settings
        client = client_key(request)
        if request.method == "POST" and _ANALYSIS_POST.match(app_path(request)):
            decision = self.limiter.hit(
                "analysis",
                client,
                [Window(s.rate_analyses_per_minute, 60), Window(s.rate_analyses_per_day, 86_400)],
            )
            if not decision.allowed:
                return _rate_limited(
                    decision.retry_after,
                    _retry("Zu viele Analysen.", decision.retry_after),
                )
            total = self.limiter.hit(
                "analysis-global", "*", [Window(s.max_analyses_per_day, 86_400)]
            )
            if not total.allowed:
                return _rate_limited(
                    total.retry_after,
                    "Das Tageslimit für Analysen ist erreicht. Bitte morgen erneut versuchen.",
                )
            return None
        decision = self.limiter.hit("write", client, [Window(s.rate_writes_per_minute, 60)])
        if not decision.allowed:
            return _rate_limited(
                decision.retry_after,
                _retry("Zu viele Anfragen.", decision.retry_after),
            )
        return None


async def unexpected_error_handler(request: Request, exc: Exception) -> JSONResponse:
    """Unerwartete Fehler: keine internen Details nach außen, aber eine Fehler-ID zum Finden."""
    error_id = getattr(request.state, "request_id", None) or uuid.uuid4().hex
    logger.exception(
        "Unerwarteter Fehler (Fehler-ID %s) bei %s %s", error_id, request.method, app_path(request)
    )
    return JSONResponse(
        status_code=500,
        content={
            "detail": f"Interner Fehler. Bitte später erneut versuchen (Fehler-ID {error_id}).",
            "code": "internal_error",
            "error_id": error_id,
        },
        headers={"X-Request-ID": error_id},
    )
