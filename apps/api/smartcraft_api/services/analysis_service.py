"""Analyse-Ablauf: Eingabe prüfen → Provider → Schema → Safety-Policy.

Einziger Weg, auf dem ein Ergebnis entsteht. Kein Provider-Ergebnis verlässt den Server,
ohne durch `apply_safety_policy` gelaufen zu sein.
"""

import asyncio

from pydantic import ValidationError

from smartcraft_api.ai.provider import (
    AnalysisProvider,
    AnalysisRequest,
    ProviderError,
    ProviderOutputError,
)
from smartcraft_api.domain.analysis import AnalysisDraft, AnalysisResult, AnalysisSource
from smartcraft_api.safety import apply_safety_policy

MAX_IMAGES = 5
MAX_NOTE_LENGTH = 2000
ALLOWED_MEDIA_TYPES = frozenset({"image/jpeg", "image/png", "image/webp"})


class InvalidAnalysisRequestError(ValueError):
    pass


def validate_request(request: AnalysisRequest) -> None:
    # Wie V2: Foto ODER Beschreibung reicht.
    if not request.images and not (request.note and request.note.strip()):
        raise InvalidAnalysisRequestError("Bitte ein Foto aufnehmen oder das Problem beschreiben.")
    if len(request.images) > MAX_IMAGES:
        raise InvalidAnalysisRequestError(f"Höchstens {MAX_IMAGES} Fotos pro Analyse.")
    for image in request.images:
        if image.media_type not in ALLOWED_MEDIA_TYPES:
            raise InvalidAnalysisRequestError(f"Nicht unterstütztes Bildformat: {image.media_type}")
        if not image.data:
            raise InvalidAnalysisRequestError("Leere Bilddatei.")
    if request.note and len(request.note) > MAX_NOTE_LENGTH:
        raise InvalidAnalysisRequestError(f"Notiz zu lang (max. {MAX_NOTE_LENGTH} Zeichen).")


DEFAULT_TIMEOUT_SECONDS = 45.0


async def run_analysis(
    provider: AnalysisProvider,
    request: AnalysisRequest,
    timeout_seconds: float = DEFAULT_TIMEOUT_SECONDS,
) -> AnalysisResult:
    validate_request(request)
    try:
        draft = await asyncio.wait_for(provider.analyze(request), timeout=timeout_seconds)
    except TimeoutError as exc:
        raise ProviderError(
            f"Zeitüberschreitung: keine Antwort der KI nach {timeout_seconds:g} Sekunden"
        ) from exc
    # Auch ein Provider, der fälschlich ein dict o. Ä. liefert, wird hier gestoppt.
    if not isinstance(draft, AnalysisDraft):
        raise ProviderOutputError(f"Provider lieferte {type(draft).__name__} statt AnalysisDraft")
    try:
        draft = AnalysisDraft.model_validate(draft.model_dump())
    except ValidationError as exc:
        raise ProviderOutputError(str(exc)) from exc
    if not request.images and any(c.region for c in draft.components):
        # Ohne Foto gibt es keine Bildposition – erfundene Markierungen verwerfen.
        draft = draft.model_copy(
            update={"components": [c.model_copy(update={"region": None}) for c in draft.components]}
        )
    for component in draft.components:
        if component.region and component.region.capture_index >= len(request.images):
            raise ProviderOutputError(
                f"Bauteil '{component.name}' verweist auf Foto {component.region.capture_index}, "
                f"es gibt aber nur {len(request.images)}"
            )
    info = provider.info
    source = AnalysisSource(
        provider_id=info.provider_id, model_id=info.model_id, is_test_data=info.is_test_data
    )
    return apply_safety_policy(draft, request.trade, source, image_count=len(request.images))
