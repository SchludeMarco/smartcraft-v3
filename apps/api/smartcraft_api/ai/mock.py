"""Kostenlose, vollständig lokale Mock-KI.

Liefert feste Beispielszenarien aus `mock_scenarios/*.json` – das Foto wird NICHT
ausgewertet. Ergebnisse sind über `ProviderInfo.is_test_data` und die Safety-Policy
unübersehbar als Testdaten gekennzeichnet.

Die Szenarien simulieren absichtlich typische Modellschwächen (zu niedriges Risiko,
fehlende Fachkraft-Pflicht, Freigabe-Formulierungen), damit die Safety-Policy daran
nachweisbar greift.

Szenario-Wahl (reproduzierbar):
1. Notiz enthält `[mock:<id>]` → dieses Szenario.
2. Sonst: SHA-256 des ersten Fotos bestimmt das Szenario – gleiches Foto, gleiches Ergebnis.
"""

import hashlib
import re
from enum import StrEnum
from functools import cache
from importlib import resources

from smartcraft_api.ai.provider import AnalysisRequest, ProviderError, ProviderInfo, parse_draft
from smartcraft_api.domain.analysis import AnalysisDraft


class MockScenario(StrEnum):
    UNTERVERTEILUNG = "unterverteilung"
    HEIZUNG = "heizung"
    UNBRAUCHBARES_FOTO = "unbrauchbares_foto"


_TAG = re.compile(r"\[mock:([a-z_]+)\]")

MOCK_INFO = ProviderInfo(provider_id="mock", model_id="mock-scenarios-v1", is_test_data=True)


@cache
def load_scenario(scenario: MockScenario) -> AnalysisDraft:
    path = resources.files("smartcraft_api.ai") / "mock_scenarios" / f"{scenario.value}.json"
    return parse_draft(path.read_text(encoding="utf-8"))


def select_scenario(request: AnalysisRequest) -> MockScenario:
    if request.note and (match := _TAG.search(request.note)):
        try:
            return MockScenario(match.group(1))
        except ValueError as exc:
            raise ProviderError(f"Unbekanntes Mock-Szenario: {match.group(1)}") from exc
    if not request.images:
        raise ProviderError("Mindestens ein Foto erforderlich")
    digest = hashlib.sha256(request.images[0].data).digest()
    scenarios = list(MockScenario)
    return scenarios[digest[0] % len(scenarios)]


class MockProvider:
    @property
    def info(self) -> ProviderInfo:
        return MOCK_INFO

    async def analyze(self, request: AnalysisRequest) -> AnalysisDraft:
        return load_scenario(select_scenario(request))
