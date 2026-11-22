"""Kostenlose, vollständig lokale Mock-KI.

Liefert feste Beispielszenarien aus `mock_scenarios/*.json` – das Foto wird NICHT
ausgewertet. Ergebnisse sind über `ProviderInfo.is_test_data` und die Safety-Policy
unübersehbar als Testdaten gekennzeichnet.

Die Szenarien simulieren absichtlich typische Modellschwächen (zu niedriges Risiko,
fehlende Fachkraft-Pflicht, Freigabe-Formulierungen), damit die Safety-Policy daran
nachweisbar greift.

Szenario-Wahl (reproduzierbar):
1. Notiz enthält `[mock:<id>]` → dieses Szenario.
2. Sonst: SHA-256 des ersten Fotos (ohne Foto: der Beschreibung) bestimmt das Szenario –
   gleiche Eingabe, gleiches Ergebnis.
"""

import hashlib
import json
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
    if request.images:
        seed = request.images[0].data
    elif request.note:
        seed = request.note.encode("utf-8")
    else:
        raise ProviderError("Foto oder Beschreibung erforderlich")
    digest = hashlib.sha256(seed).digest()
    scenarios = list(MockScenario)
    return scenarios[digest[0] % len(scenarios)]


class MockProvider:
    @property
    def info(self) -> ProviderInfo:
        return MOCK_INFO

    async def analyze(self, request: AnalysisRequest) -> AnalysisDraft:
        return load_scenario(select_scenario(request))

    async def complete(self, system: str, user: str, *, json_mode: bool = False) -> str:
        return mock_tool_text(system, user, json_mode=json_mode)


def mock_tool_text(system: str, user: str, *, json_mode: bool) -> str:
    """Feste Beispielantwort für KI-Werkzeuge – unabhängig von der Eingabe, klar als Testdaten."""
    if json_mode:
        return json.dumps(
            [
                {
                    "category": "Material",
                    "item": "[TESTDATEN] Beispielartikel",
                    "quantity": "1 Stk",
                },
                {
                    "category": "Werkzeug",
                    "item": "[TESTDATEN] Schraubendreher-Set",
                    "quantity": "1 Set",
                },
            ],
            ensure_ascii=False,
        )
    return (
        "**[TESTDATEN]** Beispielantwort der Mock-KI – die Eingabe wurde nicht ausgewertet.\n\n"
        "- Erster Beispielpunkt\n- Zweiter Beispielpunkt\n\n"
        "## Hinweis\nNicht für Entscheidungen verwenden."
    )
