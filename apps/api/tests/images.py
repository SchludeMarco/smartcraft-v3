"""Hilfen zum Erzeugen von Testbildern (keine echten Fotos im Repo)."""

import io
import random

from PIL import ExifTags, Image

CAMERA_MARKER = "SmartCraftTestCam"


def make_image(
    size: tuple[int, int] = (400, 300),
    fmt: str = "JPEG",
    mode: str = "RGB",
    orientation: int | None = None,
    with_gps: bool = False,
) -> bytes:
    image = Image.new(mode, size, color="gray" if mode in ("RGB", "L") else None)
    if mode == "RGB":
        # Linke Hälfte rot – damit lässt sich die Drehung prüfen
        image.paste((255, 0, 0), (0, 0, size[0] // 2, size[1]))
    exif = Image.Exif()
    exif[ExifTags.Base.Make] = CAMERA_MARKER
    if orientation is not None:
        exif[ExifTags.Base.Orientation] = orientation
    if with_gps:
        exif[ExifTags.IFD.GPSInfo] = {
            ExifTags.GPS.GPSLatitudeRef: "N",
            ExifTags.GPS.GPSLatitude: (52.0, 31.0, 12.0),
            ExifTags.GPS.GPSLongitudeRef: "E",
            ExifTags.GPS.GPSLongitude: (13.0, 24.0, 36.0),
        }
    out = io.BytesIO()
    kwargs = {"exif": exif.tobytes()} if fmt in ("JPEG", "WEBP", "PNG") else {}
    image.save(out, format=fmt, **kwargs)
    return out.getvalue()


def exif_of(data: bytes) -> dict[int, object]:
    return dict(Image.open(io.BytesIO(data)).getexif())


def make_noise_png(size: tuple[int, int]) -> bytes:
    rng = random.Random(42)
    image = Image.frombytes("RGB", size, rng.randbytes(size[0] * size[1] * 3))
    out = io.BytesIO()
    image.save(out, format="PNG")
    return out.getvalue()
