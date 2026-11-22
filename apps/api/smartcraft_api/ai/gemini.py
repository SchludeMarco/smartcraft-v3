"""Google-Gemini-Provider – wie in V2 (`gemini-flash-lite-latest`, REST-API).

Unterschiede zu V2:
- Der Schlüssel geht im Header `x-goog-api-key` mit, nicht in der URL (taucht so nicht
  in Logs auf).
- Prompt und Schema liegen im Backend (versioniert, `ai/prompts.py`), nicht im Client.
- Die Antwort wird streng gegen `AnalysisDraft` geprüft und läuft danach durch die
  Safety-Policy – der Provider entscheidet nichts über Sicherheit.

Kosten: Abrechnung über den Gemini-API-Schlüssel des Betreibers. Aktiv nur, wenn
`SMARTCRAFT_AI_PROVIDER=gemini` UND ein Schlüssel gesetzt ist; Standard bleibt der Mock.
"""

import base64
import json
from typing import Any

import httpx

from smartcraft_api.ai.prompts import PROMPT_VERSION, system_prompt, user_prompt
from smartcraft_api.ai.provider import (
    AnalysisRequest,
    ProviderError,
    ProviderInfo,
    ProviderOutputError,
    parse_draft,
)
from smartcraft_api.domain.analysis import AnalysisDraft

DEFAULT_MODEL = "gemini-flash-lite-latest"
API_BASE = "https://generativelanguage.googleapis.com/v1beta"


class GeminiProvider:
    def __init__(
        self,
        api_key: str,
        model: str = DEFAULT_MODEL,
        *,
        timeout_seconds: float = 25,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        if not api_key:
            raise ValueError("Gemini-API-Schlüssel fehlt")
        self._api_key = api_key
        self._model = model
        self._timeout = timeout_seconds
        self._transport = transport
        self._info = ProviderInfo(
            provider_id="gemini",
            model_id=f"{model}+prompt-{PROMPT_VERSION}",
            is_test_data=False,
        )

    @property
    def info(self) -> ProviderInfo:
        return self._info

    def build_body(self, request: AnalysisRequest) -> dict[str, Any]:
        parts: list[dict[str, Any]] = [
            {
                "inline_data": {
                    "mime_type": image.media_type,
                    "data": base64.b64encode(image.data).decode("ascii"),
                }
            }
            for image in request.images
        ]
        parts.append({"text": user_prompt(request.trade, len(request.images), request.note)})
        return {
            "systemInstruction": {"parts": [{"text": system_prompt()}]},
            "contents": [{"role": "user", "parts": parts}],
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.2,
            },
        }

    async def analyze(self, request: AnalysisRequest) -> AnalysisDraft:
        return parse_draft(await self._generate(self.build_body(request)))

    async def complete(self, system: str, user: str, *, json_mode: bool = False) -> str:
        """Freitext für die KI-Werkzeuge (Ergebnis läuft danach durch die Text-Policy)."""
        config: dict[str, Any] = {"temperature": 0.3}
        if json_mode:
            config["responseMimeType"] = "application/json"
        body = {
            "systemInstruction": {"parts": [{"text": system}]},
            "contents": [{"role": "user", "parts": [{"text": user}]}],
            "generationConfig": config,
        }
        return await self._generate(body)

    async def _generate(self, body: dict[str, Any]) -> str:
        url = f"{API_BASE}/models/{self._model}:generateContent"
        headers = {"x-goog-api-key": self._api_key, "Content-Type": "application/json"}
        try:
            async with httpx.AsyncClient(
                timeout=self._timeout, transport=self._transport
            ) as client:
                response = await client.post(url, headers=headers, json=body)
        except httpx.TimeoutException as exc:
            raise ProviderError("Zeitüberschreitung bei der Gemini-API") from exc
        except httpx.HTTPError as exc:
            raise ProviderError(f"Gemini-API nicht erreichbar ({type(exc).__name__})") from exc

        if response.status_code == 429:
            raise ProviderError("Gemini-Kontingent erschöpft (429) – später erneut versuchen")
        if response.status_code >= 400:
            raise ProviderError(f"Gemini-API antwortete mit Status {response.status_code}")
        return extract_text(response)


def extract_text(response: httpx.Response) -> str:
    try:
        payload = response.json()
    except json.JSONDecodeError as exc:
        raise ProviderOutputError("Gemini-Antwort ist kein JSON") from exc
    if not isinstance(payload, dict):
        raise ProviderOutputError("Gemini-Antwort hat unerwartete Form")
    feedback = payload.get("promptFeedback") or {}
    if block := feedback.get("blockReason"):
        raise ProviderOutputError(f"Gemini hat die Anfrage blockiert ({block})")
    candidates = payload.get("candidates") or []
    if not candidates:
        raise ProviderOutputError("Gemini lieferte keine Antwort")
    candidate = candidates[0]
    finish = candidate.get("finishReason")
    if finish not in (None, "STOP"):
        raise ProviderOutputError(f"Gemini-Antwort unvollständig ({finish})")
    parts = (candidate.get("content") or {}).get("parts") or []
    text = "".join(p.get("text", "") for p in parts if isinstance(p, dict)).strip()
    if not text:
        raise ProviderOutputError("Gemini lieferte leeren Text")
    return _strip_code_fence(text)


def _strip_code_fence(text: str) -> str:
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else ""
        if text.rstrip().endswith("```"):
            text = text.rstrip()[:-3]
    return text.strip()
