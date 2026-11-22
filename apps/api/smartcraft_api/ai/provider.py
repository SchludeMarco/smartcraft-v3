"""Schnittstelle für KI-Provider.

Ein Provider bekommt Fotos und Kontext und liefert einen `AnalysisDraft`. Er entscheidet
NICHT über Sicherheit, Haftungshinweis oder Kennzeichnung – das macht der Server danach
(`services/analysis_service.py` → `safety/policy.py`).

Neue Provider (z. B. Gemini, OpenAI, lokales Modell) implementieren `AnalysisProvider`
und nutzen `parse_draft()` für die Modellausgabe. Echte Provider erst nach Freigabe.
"""

import json
from collections.abc import Sequence
from dataclasses import dataclass
from typing import Any, Protocol, runtime_checkable

from pydantic import ValidationError

from smartcraft_api.domain.analysis import AnalysisDraft
from smartcraft_api.domain.trades import Trade


@dataclass(frozen=True)
class ImageInput:
    data: bytes
    media_type: str


@dataclass(frozen=True)
class AnalysisRequest:
    trade: Trade
    images: Sequence[ImageInput]
    note: str | None = None


@dataclass(frozen=True)
class ProviderInfo:
    provider_id: str
    model_id: str
    # True, wenn der Provider keine echte Analyse durchführt (Mock, Fixtures).
    is_test_data: bool


class ProviderError(Exception):
    """Provider nicht erreichbar oder Anfrage fehlgeschlagen."""


class ProviderOutputError(ProviderError):
    """Provider hat geantwortet, aber nicht im erwarteten Schema."""


@runtime_checkable
class AnalysisProvider(Protocol):
    @property
    def info(self) -> ProviderInfo: ...

    async def analyze(self, request: AnalysisRequest) -> AnalysisDraft: ...


@runtime_checkable
class TextProvider(Protocol):
    """Freitext/JSON für die KI-Werkzeuge (Materialliste, Kundenbericht …).

    Das Ergebnis ist ungeprüfter Text – es läuft danach immer durch `apply_text_policy`.
    """

    @property
    def info(self) -> ProviderInfo: ...

    async def complete(self, system: str, user: str, *, json_mode: bool = False) -> str: ...


def parse_draft(raw: str | bytes | dict[str, Any]) -> AnalysisDraft:
    """Modellausgabe (JSON-Text oder dict) streng gegen das Schema validieren."""
    try:
        data = json.loads(raw) if isinstance(raw, str | bytes) else raw
        return AnalysisDraft.model_validate(data)
    except (json.JSONDecodeError, ValidationError) as exc:
        raise ProviderOutputError(f"Ungültige Provider-Ausgabe: {exc}") from exc
