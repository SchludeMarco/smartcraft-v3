"""KI-Werkzeuge ausführen: Grundlage bauen → Provider → Schema → Text-Policy."""

import asyncio
import json
from typing import Literal

from pydantic import ValidationError

from smartcraft_api.ai.provider import ProviderError, ProviderOutputError, TextProvider
from smartcraft_api.domain.analysis import AnalysisResult, AnalysisSource
from smartcraft_api.domain.tools import MaterialItem, ToolResult
from smartcraft_api.domain.trades import TRADE_LABELS, Trade
from smartcraft_api.safety.text_policy import apply_text_policy
from smartcraft_api.tools.catalog import COMMON_RULES, TOOLS_PROMPT_VERSION, ToolSpec

MAX_TEXT = 8000
MAX_MATERIALS = 60


class InvalidToolRequestError(ValueError):
    pass


def _analysis_basis(result: AnalysisResult) -> str:
    lines = []
    if result.diagnosis:
        lines.append(f"Diagnose: {result.diagnosis}")
    lines.append(f"Befund: {result.summary}")
    if result.solution_steps:
        lines.append("Lösungsschritte:")
        lines += [f"{i}. {step}" for i, step in enumerate(result.solution_steps, 1)]
    return "\n".join(lines)


Basis = Literal["analysis", "description", "trade"]


def build_user_message(
    spec: ToolSpec, trade: Trade, result: AnalysisResult | None, note: str | None
) -> tuple[Basis, str]:
    """Wie V2 (`buildTradeToolQuery`): Analyse > Beschreibung > nur der Beruf."""
    head = f"{spec.topic}\nGewerk: {TRADE_LABELS[trade]}"
    if result is not None:
        return "analysis", f"{head}\nKonkrete Lösung:\n<<<\n{_analysis_basis(result)}\n>>>"
    if note:
        return "description", f"{head}\nProblembeschreibung:\n<<<\n{note}\n>>>"
    return "trade", (
        f"{head}\nEs liegt noch keine konkrete Diagnose oder Problembeschreibung vor – gib "
        f"allgemeine, praxisnahe Hinweise für den Beruf {TRADE_LABELS[trade]}."
    )


def parse_materials(raw: str) -> list[MaterialItem]:
    try:
        data = json.loads(raw)
        if isinstance(data, dict):  # manche Modelle verpacken die Liste
            data = next((v for v in data.values() if isinstance(v, list)), data)
        if not isinstance(data, list):
            raise ProviderOutputError("Materialliste ist keine Liste")
        return [MaterialItem.model_validate(item) for item in data[:MAX_MATERIALS]]
    except (json.JSONDecodeError, ValidationError, TypeError) as exc:
        raise ProviderOutputError(f"Ungültige Materialliste: {exc}") from exc


async def run_tool(
    *,
    provider: TextProvider,
    spec: ToolSpec,
    trade: Trade,
    analysis_id: str | None,
    analysis: AnalysisResult | None,
    note: str | None,
    timeout_seconds: float,
) -> ToolResult:
    if spec.requires_analysis and analysis is None:
        raise InvalidToolRequestError(f"„{spec.label}“ braucht zuerst eine Analyse.")
    basis, user = build_user_message(spec, trade, analysis, note)
    try:
        raw = await asyncio.wait_for(
            provider.complete(spec.system + COMMON_RULES, user, json_mode=spec.kind == "materials"),
            timeout=timeout_seconds,
        )
    except TimeoutError as exc:
        raise ProviderError(
            f"Zeitüberschreitung: keine Antwort der KI nach {timeout_seconds:g} Sekunden"
        ) from exc

    text: str | None = None
    materials: list[MaterialItem] | None = None
    if spec.kind == "materials":
        materials = parse_materials(raw)
    else:
        text = raw.strip()[:MAX_TEXT]
        if not text:
            raise ProviderOutputError("Leere Antwort")

    info = provider.info
    source = AnalysisSource(
        provider_id=info.provider_id, model_id=info.model_id, is_test_data=info.is_test_data
    )
    context_texts: list[str] = [note or ""]
    if analysis is not None:
        context_texts.append(_analysis_basis(analysis))
    text, materials, safety, policy = apply_text_policy(
        text=text,
        materials=materials,
        trade=trade,
        context_texts=context_texts,
        context_hazards=analysis.safety.hazards if analysis else [],
        context_qualified=analysis.safety.qualified_person_required if analysis else False,
        source=source,
    )
    return ToolResult(
        tool_id=spec.id,
        label=spec.label,
        trade=trade,
        analysis_id=analysis_id,
        basis=basis,
        text=text,
        materials=materials,
        safety=safety,
        source=source,
        policy=policy,
        prompt_version=TOOLS_PROMPT_VERSION,
    )
