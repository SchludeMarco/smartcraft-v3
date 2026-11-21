"""Neue Analyse in einem Projekt: Fotos bereinigen → KI → Policy → Dateien + DB speichern.

Garantien:
- Originaldateien werden nie gespeichert und nie an einen Provider gegeben – nur die
  bereinigten (metadatenfreien, verkleinerten) Bilder.
- Schlägt ein Schritt fehl, bleiben keine verwaisten Dateien liegen.
"""

from collections.abc import Sequence
from dataclasses import dataclass

from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from smartcraft_api.ai.provider import AnalysisProvider, AnalysisRequest, ImageInput
from smartcraft_api.config import Settings
from smartcraft_api.domain.trades import Trade
from smartcraft_api.media.processing import ProcessedImage, process_image
from smartcraft_api.media.storage import Storage
from smartcraft_api.persistence import repository as repo
from smartcraft_api.persistence.models import AnalysisRow, ProjectRow
from smartcraft_api.services.analysis_service import (
    MAX_IMAGES,
    InvalidAnalysisRequestError,
    run_analysis,
)


@dataclass(frozen=True)
class ImageLimits:
    max_bytes: int
    max_pixels: int
    max_edge: int

    @classmethod
    def from_settings(cls, settings: Settings) -> "ImageLimits":
        return cls(
            max_bytes=settings.max_upload_mb * 1024 * 1024,
            max_pixels=settings.max_image_megapixels * 1_000_000,
            max_edge=settings.max_image_edge,
        )


def _process_all(uploads: Sequence[bytes], limits: ImageLimits) -> list[ProcessedImage]:
    return [
        process_image(
            raw, max_bytes=limits.max_bytes, max_pixels=limits.max_pixels, max_edge=limits.max_edge
        )
        for raw in uploads
    ]


async def create_project_analysis(
    *,
    session: Session,
    storage: Storage,
    provider: AnalysisProvider,
    project: ProjectRow,
    trade: Trade,
    note: str | None,
    uploads: Sequence[bytes],
    limits: ImageLimits,
    timeout_seconds: float = 25.0,
) -> AnalysisRow:
    if not uploads:
        raise InvalidAnalysisRequestError("Mindestens ein Foto erforderlich.")
    if len(uploads) > MAX_IMAGES:
        raise InvalidAnalysisRequestError(f"Höchstens {MAX_IMAGES} Fotos pro Analyse.")

    images = await run_in_threadpool(_process_all, uploads, limits)
    request = AnalysisRequest(
        trade=trade,
        images=[ImageInput(data=img.data, media_type=img.media_type) for img in images],
        note=note,
    )
    result = await run_analysis(provider, request, timeout_seconds=timeout_seconds)

    keys: list[str] = []
    try:
        for img in images:
            keys.append(storage.save(img.data))
        captures = [
            repo.StoredCapture(
                storage_key=key,
                media_type=img.media_type,
                sha256=img.sha256,
                size_bytes=img.size_bytes,
                width=img.width,
                height=img.height,
            )
            for key, img in zip(keys, images, strict=True)
        ]
        return repo.save_analysis(session, project, result, captures, note=note)
    except BaseException:
        session.rollback()
        for key in keys:
            storage.delete(key)
        raise
