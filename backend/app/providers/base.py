from abc import ABC, abstractmethod


class LLMProvider(ABC):
    @abstractmethod
    async def generate_workflow(self, description: str) -> dict:
        """Call the LLM and return a raw workflow dict."""
        ...

    async def complete_json(self, system: str, user: str) -> dict:
        """Call the LLM with arbitrary system/user prompts and return a JSON dict.

        Used by the simulation evaluator. Providers that don't implement this
        will raise NotImplementedError — evaluation falls back to mock mode.
        """
        raise NotImplementedError(
            f"{self.__class__.__name__} does not implement complete_json. "
            "Override this method to support LLM-based trace evaluation."
        )
