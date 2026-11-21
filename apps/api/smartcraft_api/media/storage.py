"""Dateiablage für Fotos. Lokal im MVP; später S3-kompatibel über dieselbe Schnittstelle."""

import re
import uuid
from pathlib import Path
from typing import Protocol

_KEY = re.compile(r"^[a-f0-9-]{36}\.jpg$")


class StorageError(Exception):
    pass


class Storage(Protocol):
    def save(self, data: bytes) -> str: ...

    def read(self, key: str) -> bytes: ...

    def delete(self, key: str) -> None: ...


class LocalStorage:
    def __init__(self, root: Path) -> None:
        self.root = root
        self.root.mkdir(parents=True, exist_ok=True)

    def _path(self, key: str) -> Path:
        # Keys erzeugt nur der Server; strenge Prüfung verhindert Pfad-Tricks wie "../".
        if not _KEY.fullmatch(key):
            raise StorageError(f"Ungültiger Storage-Key: {key!r}")
        return self.root / key

    def save(self, data: bytes) -> str:
        key = f"{uuid.uuid4()}.jpg"
        path = self._path(key)
        tmp = path.with_suffix(".tmp")
        tmp.write_bytes(data)
        tmp.replace(path)
        return key

    def read(self, key: str) -> bytes:
        try:
            return self._path(key).read_bytes()
        except FileNotFoundError as exc:
            raise StorageError(f"Datei fehlt: {key}") from exc

    def delete(self, key: str) -> None:
        self._path(key).unlink(missing_ok=True)
