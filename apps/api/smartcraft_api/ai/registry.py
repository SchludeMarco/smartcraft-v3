from smartcraft_api.ai.mock import MockProvider
from smartcraft_api.ai.provider import AnalysisProvider
from smartcraft_api.config import Settings


def get_provider(settings: Settings) -> AnalysisProvider:
    """Liefert den konfigurierten Provider. Bis zur Freigabe gibt es nur den Mock."""
    if settings.ai_provider == "mock":
        return MockProvider()
    raise ValueError(f"Unbekannter KI-Provider: {settings.ai_provider}")
