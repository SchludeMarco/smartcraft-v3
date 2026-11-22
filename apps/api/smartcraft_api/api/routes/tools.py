from typing import Literal

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from smartcraft_api.ai.provider import ProviderError, ProviderOutputError, TextProvider
from smartcraft_api.api.deps import ProviderDep, SessionDep, SettingsDep
from smartcraft_api.domain.tools import ToolResult
from smartcraft_api.domain.trades import Trade
from smartcraft_api.persistence import repository as repo
from smartcraft_api.services.analysis_service import MAX_NOTE_LENGTH
from smartcraft_api.services.tool_service import InvalidToolRequestError, run_tool
from smartcraft_api.tools.catalog import ALL_TOOLS

router = APIRouter(prefix="/tools", tags=["tools"])


class ToolOut(BaseModel):
    id: str
    label: str
    trade: Trade | None
    kind: Literal["text", "materials"]
    requires_analysis: bool


class ToolRequest(BaseModel):
    trade: Trade
    analysis_id: str | None = None
    note: str | None = Field(default=None, max_length=MAX_NOTE_LENGTH)


@router.get("", response_model=list[ToolOut])
def list_tools() -> list[ToolOut]:
    """Alle KI-Werkzeuge: allgemeine (brauchen eine Analyse) und Berufs-Spezial-Tools."""
    return [
        ToolOut(
            id=t.id,
            label=t.label,
            trade=t.trade,
            kind=t.kind,
            requires_analysis=t.requires_analysis,
        )
        for t in ALL_TOOLS.values()
    ]


@router.post(
    "/{tool_id}",
    response_model=ToolResult,
    responses={
        404: {"description": "Werkzeug oder Analyse nicht gefunden"},
        422: {"description": "Ungültige Eingabe"},
        502: {"description": "KI-Provider fehlgeschlagen"},
    },
)
async def call_tool(
    tool_id: str,
    data: ToolRequest,
    session: SessionDep,
    provider: ProviderDep,
    settings: SettingsDep,
) -> ToolResult:
    """KI-Werkzeug ausführen. Grundlage wie V2: Analyse > Beschreibung > nur der Beruf.

    Die Antwort ist immer durch die Text-Policy geprüft und enthält einen Sicherheitsblock.
    """
    spec = ALL_TOOLS.get(tool_id)
    if spec is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Werkzeug nicht gefunden")
    if not isinstance(provider, TextProvider):
        raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "KI-Provider kann keine Werkzeuge")
    analysis = None
    if data.analysis_id is not None:
        row = repo.get_analysis(session, data.analysis_id)
        if row is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Analyse nicht gefunden")
        analysis = repo.load_result(row)
    note = data.note.strip() or None if data.note else None
    try:
        return await run_tool(
            provider=provider,
            spec=spec,
            trade=data.trade,
            analysis_id=data.analysis_id,
            analysis=analysis,
            note=note,
            timeout_seconds=settings.ai_timeout_seconds,
        )
    except InvalidToolRequestError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from exc
    except ProviderOutputError as exc:
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY, "KI-Antwort entsprach nicht dem erwarteten Format."
        ) from exc
    except ProviderError as exc:
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY, f"KI-Werkzeug fehlgeschlagen: {exc}"
        ) from exc
