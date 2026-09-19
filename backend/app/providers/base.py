from abc import ABC, abstractmethod


class LLMProvider(ABC):
    @abstractmethod
    async def generate_workflow(self, description: str) -> dict:
        """Call the LLM and return a raw workflow dict."""
        ...
