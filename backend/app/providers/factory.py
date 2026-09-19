from app.providers.base import LLMProvider
from app.core.config import settings


def get_provider() -> LLMProvider:
    from app.providers.langchain_provider import LangChainProvider
    if not settings.llm_api_key:
        raise RuntimeError("LLM_API_KEY is not set. Add it to backend/.env")
    return LangChainProvider(
        base_url=settings.llm_base_url or None,
        api_key=settings.llm_api_key,
        model=settings.llm_model,
    )
