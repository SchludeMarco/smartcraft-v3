"""Bildpipeline: prüfen, ausrichten, verkleinern, Metadaten entfernen.

Jedes Foto wird vollständig neu als JPEG kodiert. Dadurch fallen sämtliche Metadaten weg
(EXIF inkl. GPS-Position, Kameradaten, XMP, ICC). Das bereinigte Bild ist das einzige, das
gespeichert und an KI-Provider übergeben wird.
"""

import hashlib
import io
import warnings
from dataclasses import dataclass

from PIL import Image, ImageOps, UnidentifiedImageError

# Format laut Dateiinhalt – die vom Client angegebene Endung/MIME zählt nicht.
ALLOWED_FORMATS = {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp"}
OUTPUT_MEDIA_TYPE = "image/jpeg"
JPEG_QUALITY = 85


class InvalidImageError(ValueError):
    pass


@dataclass(frozen=True)
class ProcessedImage:
    data: bytes
    media_type: str
    width: int
    height: int
    sha256: str

    @property
    def size_bytes(self) -> int:
        return len(self.data)


def process_image(raw: bytes, *, max_bytes: int, max_pixels: int, max_edge: int) -> ProcessedImage:
    if not raw:
        raise InvalidImageError("Leere Datei.")
    if len(raw) > max_bytes:
        raise InvalidImageError(f"Datei zu groß (max. {max_bytes // (1024 * 1024)} MB).")

    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            image: Image.Image = Image.open(io.BytesIO(raw))
            if image.format not in ALLOWED_FORMATS:
                raise InvalidImageError(
                    f"Nicht unterstütztes Bildformat: {image.format or 'unbekannt'}"
                )
            width, height = image.size
            if width * height > max_pixels:
                raise InvalidImageError("Bildauflösung zu hoch.")
            image.load()
    except InvalidImageError:
        raise
    except (UnidentifiedImageError, OSError, SyntaxError, ValueError) as exc:
        raise InvalidImageError("Datei ist kein gültiges Bild.") from exc
    except (Image.DecompressionBombError, Image.DecompressionBombWarning) as exc:
        raise InvalidImageError("Bildauflösung zu hoch.") from exc

    # Handy-Fotos liegen oft gedreht vor und tragen die Drehung nur im EXIF.
    image = ImageOps.exif_transpose(image)
    if image.mode not in ("RGB", "L"):
        background = Image.new("RGB", image.size, (255, 255, 255))
        rgba = image.convert("RGBA")
        background.paste(rgba, mask=rgba.getchannel("A"))
        image = background
    image.thumbnail((max_edge, max_edge), Image.Resampling.LANCZOS)

    out = io.BytesIO()
    # Ohne exif=/icc_profile= schreibt Pillow keine Metadaten.
    image.save(out, format="JPEG", quality=JPEG_QUALITY, optimize=True)
    data = out.getvalue()
    return ProcessedImage(
        data=data,
        media_type=OUTPUT_MEDIA_TYPE,
        width=image.width,
        height=image.height,
        sha256=hashlib.sha256(data).hexdigest(),
    )
