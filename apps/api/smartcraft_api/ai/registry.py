from smartcraft_api.ai.gemini import GeminiProvider
from smartcraft_api.ai.mock import MockProvider
from smartcraft_api.ai.provider import AnalysisProvider
from smartcraft_api.config import Settings


def get_provider(settings: Settings) -> AnalysisProvider:
    """Liefert den konfigurierten Provider. Standard ist die kostenlose Mock-KI."""
    if settings.ai_provider == "mock":
        return MockProvider()
    if settings.ai_provider == "gemini":
        if settings.gemini_api_key is None or not settings.gemini_api_key.get_secret_value():
            raise ValueError(
                "SMARTCRAFT_AI_PROVIDER=gemini, aber kein Schlüssel gesetzt "
                "(SMARTCRAFT_GEMINI_API_KEY oder GEMINI_API_KEY)"
            )
        return GeminiProvider(
            api_key=settings.gemini_api_key.get_secret_value(),
            model=settings.gemini_model,
            fallback_model=settings.gemini_fallback_model or None,
            timeout_seconds=settings.ai_timeout_seconds,
        )
    raise ValueError(f"Unbekannter KI-Provider: {settings.ai_provider}")
