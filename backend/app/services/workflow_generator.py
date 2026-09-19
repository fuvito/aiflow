import uuid
from app.models.workflow import Workflow
from app.providers.base import LLMProvider
from app.services.validator import validate_workflow


class WorkflowGenerationError(Exception):
    pass


async def generate_workflow(description: str, provider: LLMProvider) -> Workflow:
    try:
        raw = await provider.generate_workflow(description)
    except Exception as exc:
        raise WorkflowGenerationError(f"LLM call failed: {exc}") from exc

    # Ensure required top-level fields exist before Pydantic parsing
    raw.setdefault("id", str(uuid.uuid4()))
    raw.setdefault("version", "1.0")
    raw.setdefault("name", "Generated Workflow")
    raw.setdefault("description", description[:120])
    raw.setdefault("nodes", [])
    raw.setdefault("edges", [])
    raw.setdefault("metadata", {})

    try:
        workflow = Workflow.model_validate(raw)
    except Exception as exc:
        raise WorkflowGenerationError(f"LLM returned invalid workflow structure: {exc}") from exc

    result = validate_workflow(workflow)
    if not result.valid:
        raise WorkflowGenerationError(
            "Generated workflow failed validation: " + "; ".join(result.errors)
        )

    return workflow
