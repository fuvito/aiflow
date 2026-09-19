from abc import ABC, abstractmethod
from app.models.workflow import Workflow


class LLMProvider(ABC):
    @abstractmethod
    async def generate_workflow(self, description: str) -> Workflow:
        """Generate a Workflow from a natural-language description."""
        ...
