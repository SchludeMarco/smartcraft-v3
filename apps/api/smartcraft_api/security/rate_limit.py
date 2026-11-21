"""Einfaches Rate-Limit (gleitendes Fenster) gegen Missbrauch, Endlosschleifen und Kosten.

Grenzen sind pro Client (IP) und – für Analysen – zusätzlich global pro Tag. Der Zustand liegt
im Speicher der jeweiligen Instanz. Auf Vercel kann es mehrere Instanzen geben; das Limit
greift dann pro Instanz. Für die Demo genügt das; mit dauerhafter Speicherung wandert der
Zähler in die Datenbank (siehe docs/07-betrieb-und-fehler.md).
"""

import threading
import time
from collections import OrderedDict, deque
from collections.abc import Callable
from dataclasses import dataclass


@dataclass(frozen=True)
class Window:
    limit: int
    seconds: int


@dataclass(frozen=True)
class Decision:
    allowed: bool
    retry_after: int = 0


class RateLimiter:
    def __init__(
        self,
        clock: Callable[[], float] = time.monotonic,
        max_keys: int = 10_000,
    ) -> None:
        self._clock = clock
        self._max_keys = max_keys
        self._hits: OrderedDict[tuple[str, str], deque[float]] = OrderedDict()
        self._lock = threading.Lock()

    def hit(self, bucket: str, key: str, windows: list[Window]) -> Decision:
        """Zählt einen Zugriff, wenn alle Fenster ihn erlauben; sonst nicht."""
        if not windows:
            return Decision(allowed=True)
        now = self._clock()
        longest = max(w.seconds for w in windows)
        with self._lock:
            hits = self._hits.pop((bucket, key), deque())
            while hits and hits[0] <= now - longest:
                hits.popleft()
            retry_after = 0
            for window in windows:
                in_window = [t for t in hits if t > now - window.seconds]
                if len(in_window) >= window.limit:
                    retry_after = max(retry_after, int(in_window[0] + window.seconds - now) + 1)
            if retry_after == 0:
                hits.append(now)
            self._hits[(bucket, key)] = hits
            while len(self._hits) > self._max_keys:
                self._hits.popitem(last=False)
        return Decision(allowed=retry_after == 0, retry_after=retry_after)
