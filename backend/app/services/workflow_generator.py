import uuid
from app.models.workflow import Workflow
from app.providers.base import LLMProvider
from app.schemas.requests import ChatMessage, WorkflowChatResponse
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


def _parse_workflow_from_raw(raw_wf: dict, sample_input: dict | None) -> Workflow | None:
    """Validate and hydrate a raw workflow dict from an LLM chat response."""
    raw_wf.setdefault("id", str(uuid.uuid4()))
    raw_wf.setdefault("version", "1.0")
    raw_wf.setdefault("name", "Generated Workflow")
    raw_wf.setdefault("description", "")
    raw_wf.setdefault("nodes", [])
    raw_wf.setdefault("edges", [])
    raw_wf.setdefault("metadata", {})
    if isinstance(sample_input, dict):
        raw_wf["metadata"]["sample_input"] = sample_input
    try:
        workflow = Workflow.model_validate(raw_wf)
    except Exception:
        return None
    result = validate_workflow(workflow)
    return workflow if result.valid else None


async def chat_workflow_service(
    messages: list[ChatMessage],
    current_workflow: Workflow | None,
    provider: LLMProvider,
) -> WorkflowChatResponse:
    try:
        raw = await provider.chat_workflow(
            [{"role": m.role, "content": m.content} for m in messages],
            current_workflow.model_dump(mode="json") if current_workflow else None,
        )
    except Exception as exc:
        raise WorkflowGenerationError(f"LLM call failed: {exc}") from exc

    status = raw.get("status", "gathering")
    reply = str(raw.get("reply", ""))
    workflow = None

    if status == "ready":
        raw_wf = raw.get("workflow")
        sample_input = raw.get("sample_input")
        if isinstance(raw_wf, dict):
            workflow = _parse_workflow_from_raw(raw_wf, sample_input if isinstance(sample_input, dict) else None)
        if workflow is None:
            status = "gathering"
            reply = reply + " (I hit a snag building the workflow structure — could you add a little more detail?)"

    return WorkflowChatResponse(status=status, reply=reply, workflow=workflow)
