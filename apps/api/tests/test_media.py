import io
from pathlib import Path

import pytest
from PIL import ExifTags, Image

from smartcraft_api.media.processing import InvalidImageError, process_image
from smartcraft_api.media.storage import LocalStorage, StorageError
from tests.images import CAMERA_MARKER, exif_of, make_image

LIMITS = {"max_bytes": 5 * 1024 * 1024, "max_pixels": 50_000_000, "max_edge": 1600}


def test_gps_and_camera_metadata_are_removed() -> None:
    raw = make_image(with_gps=True)
    assert ExifTags.IFD.GPSInfo in exif_of(raw)  # Testbild enthält wirklich GPS
    assert CAMERA_MARKER.encode() in raw

    processed = process_image(raw, **LIMITS)

    assert exif_of(processed.data) == {}
    assert CAMERA_MARKER.encode() not in processed.data
    assert processed.media_type == "image/jpeg"


def test_large_image_is_downscaled_keeping_aspect_ratio() -> None:
    processed = process_image(make_image(size=(4000, 3000)), **LIMITS)

    assert (processed.width, processed.height) == (1600, 1200)


def test_small_image_is_not_upscaled() -> None:
    processed = process_image(make_image(size=(640, 480)), **LIMITS)

    assert (processed.width, processed.height) == (640, 480)


def test_exif_orientation_is_applied_before_metadata_is_dropped() -> None:
    # Orientation 6 = Kamera um 90° gedreht → Bild muss hochkant herauskommen
    processed = process_image(make_image(size=(400, 200), orientation=6), **LIMITS)

    assert (processed.width, processed.height) == (200, 400)
    top_pixel = Image.open(io.BytesIO(processed.data)).convert("RGB").getpixel((100, 10))
    assert isinstance(top_pixel, tuple)
    assert top_pixel[0] > 200 and top_pixel[1] < 60  # rote Hälfte liegt jetzt oben


@pytest.mark.parametrize(
    ("fmt", "mode"), [("PNG", "RGBA"), ("PNG", "P"), ("WEBP", "RGB"), ("PNG", "L")]
)
def test_png_and_webp_are_converted_to_jpeg(fmt: str, mode: str) -> None:
    processed = process_image(make_image(fmt=fmt, mode=mode), **LIMITS)

    assert Image.open(io.BytesIO(processed.data)).format == "JPEG"


@pytest.mark.parametrize(
    "raw",
    [
        b"",
        b"das ist kein bild",
        b"\xff\xd8\xff\xe0kaputtes-jpeg",
        b"%PDF-1.7 ...",
    ],
)
def test_invalid_files_are_rejected(raw: bytes) -> None:
    with pytest.raises(InvalidImageError):
        process_image(raw, **LIMITS)


def test_unsupported_real_image_format_is_rejected() -> None:
    with pytest.raises(InvalidImageError, match="Bildformat"):
        process_image(make_image(fmt="GIF", mode="P"), **LIMITS)


def test_file_size_limit() -> None:
    raw = make_image()

    with pytest.raises(InvalidImageError, match="zu groß"):
        process_image(raw, max_bytes=len(raw) - 1, max_pixels=50_000_000, max_edge=1600)


def test_pixel_limit_protects_against_decompression_bombs() -> None:
    # 1-Bit-PNG: winzige Datei, aber 9 Megapixel
    bomb = make_image(size=(3000, 3000), fmt="PNG", mode="1")
    assert len(bomb) < 100_000

    with pytest.raises(InvalidImageError, match="auflösung"):
        process_image(bomb, max_bytes=5_000_000, max_pixels=1_000_000, max_edge=1600)


def test_processing_is_deterministic() -> None:
    raw = make_image(with_gps=True)

    assert process_image(raw, **LIMITS).sha256 == process_image(raw, **LIMITS).sha256


# --- Storage -----------------------------------------------------------------------


def test_local_storage_roundtrip_and_delete(tmp_path: Path) -> None:
    storage = LocalStorage(tmp_path)

    key = storage.save(b"abc")

    assert storage.read(key) == b"abc"
    assert list(tmp_path.iterdir()) == [tmp_path / key]
    storage.delete(key)
    storage.delete(key)  # idempotent
    assert list(tmp_path.iterdir()) == []


@pytest.mark.parametrize("key", ["../geheim.jpg", "/etc/passwd", "abc.jpg", "x" * 36 + ".png"])
def test_local_storage_rejects_foreign_keys(tmp_path: Path, key: str) -> None:
    storage = LocalStorage(tmp_path)

    with pytest.raises(StorageError):
        storage.read(key)
    with pytest.raises(StorageError):
        storage.delete(key)
