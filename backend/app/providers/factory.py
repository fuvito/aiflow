from app.providers.base import LLMProvider
from app.core.config import settings


def get_provider() -> LLMProvider:
    provider_name = settings.llm_provider.lower()

    if provider_name == "openai":
        from app.providers.openai_provider import OpenAIProvider
        if not settings.llm_api_key:
            raise RuntimeError("LLM_API_KEY is not set. Add it to backend/.env")
        return OpenAIProvider(api_key=settings.llm_api_key, model=settings.llm_model)

    raise RuntimeError(
        f"Unknown LLM_PROVIDER '{provider_name}'. "
        "Supported values: openai"
    )
