from fastapi import APIRouter
from pydantic import BaseModel

from smartcraft_api.domain.trades import TRADE_LABELS, Trade
from smartcraft_api.services.analysis_service import (
    ALLOWED_MEDIA_TYPES,
    MAX_IMAGES,
    MAX_NOTE_LENGTH,
)

router = APIRouter(prefix="/meta", tags=["meta"])


class TradeOut(BaseModel):
    id: Trade
    label: str


class AnalysisLimitsOut(BaseModel):
    max_images: int
    max_note_length: int
    allowed_media_types: list[str]


@router.get("/trades", response_model=list[TradeOut])
def list_trades() -> list[TradeOut]:
    """Gewerke mit Anzeigenamen – eine Quelle für alle Clients (Web, später AR)."""
    return [TradeOut(id=trade, label=TRADE_LABELS[trade]) for trade in Trade]


@router.get("/analysis-limits", response_model=AnalysisLimitsOut)
def analysis_limits() -> AnalysisLimitsOut:
    return AnalysisLimitsOut(
        max_images=MAX_IMAGES,
        max_note_length=MAX_NOTE_LENGTH,
        allowed_media_types=sorted(ALLOWED_MEDIA_TYPES),
    )
