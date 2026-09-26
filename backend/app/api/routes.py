from fastapi import APIRouter, HTTPException, status as http_status
from app.schemas.requests import (
    GenerateWorkflowRequest,
    GenerateWorkflowResponse,
    ValidateWorkflowRequest,
    ValidateWorkflowResponse,
    WorkflowChatRequest,
    WorkflowChatResponse,
)
from app.schemas.simulation import (
    LLMMode,
    ResumeSimulationRequest,
    SimulateWorkflowRequest,
    SimulateWorkflowResponse,
)
from app.services.validator import validate_workflow
from app.services.workflow_generator import generate_workflow, chat_workflow_service, WorkflowGenerationError
from app.services.simulator import simulate, resume_simulation, get_paused_settings, SimulationError
from app.services.evaluator import mock_evaluate, llm_evaluate, EvaluationError
from app.providers.factory import get_provider
from app.api.deps import ApprovedUser
from app.core.config import settings
from app.core.supabase_client import get_usage_today, increment_usage, insert_analytics_event
from app.models.user import UserProfile

router = APIRouter(prefix="/api")


async def _check_llm_limit(user: UserProfile) -> None:
    """Raise 429 if the user has hit their daily LLM request limit."""
    max_llm = (
        settings.demo_max_llm_requests_per_day
        if user.role == "demo"
        else settings.approved_max_llm_requests_per_day
    )
    if max_llm <= 0:
        return  # 0 = unlimited
    usage = await get_usage_today(user.id)
    if usage.get("llm_requests", 0) >= max_llm:
        raise HTTPException(
            status_code=http_status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Daily AI request limit ({max_llm}) reached. Try again tomorrow.",
        )


async def _check_execution_limit(user: UserProfile) -> None:
    """Raise 429 if the user has hit their daily execution limit."""
    max_exec = (
        settings.demo_max_executions_per_day
        if user.role == "demo"
        else settings.approved_max_executions_per_day
    )
    if max_exec <= 0:
        return
    usage = await get_usage_today(user.id)
    if usage.get("executions", 0) >= max_exec:
        raise HTTPException(
            status_code=http_status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Daily execution limit ({max_exec}) reached. Try again tomorrow.",
        )


@router.get("/health")
async def health():
    return {"status": "ok"}


@router.post("/workflows/validate", response_model=ValidateWorkflowResponse)
async def validate(request: ValidateWorkflowRequest, user: ApprovedUser):
    result = validate_workflow(request.workflow)
    return ValidateWorkflowResponse(
        valid=result.valid,
        errors=result.errors,
        warnings=result.warnings,
    )


@router.post("/workflows/generate", response_model=GenerateWorkflowResponse)
async def generate(request: GenerateWorkflowRequest, user: ApprovedUser):
    await _check_llm_limit(user)

    try:
        provider = get_provider()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    try:
        workflow = await generate_workflow(request.description, provider)
    except WorkflowGenerationError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    await increment_usage(user.id, "llm_requests")
    await insert_analytics_event("workflow_generate", user_id=user.id)
    return GenerateWorkflowResponse(workflow=workflow)


@router.post("/workflows/chat", response_model=WorkflowChatResponse)
async def chat_workflow(request: WorkflowChatRequest, user: ApprovedUser):
    await _check_llm_limit(user)

    try:
        provider = get_provider()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    try:
        result = await chat_workflow_service(request.messages, request.current_workflow, provider)
    except WorkflowGenerationError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    await increment_usage(user.id, "llm_requests")
    return result


@router.post("/workflows/simulate", response_model=SimulateWorkflowResponse)
async def simulate_workflow(request: SimulateWorkflowRequest, user: ApprovedUser):
    await _check_execution_limit(user)

    try:
        trace = await simulate(request.workflow, request.input, request.settings)
    except SimulationError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    await increment_usage(user.id, "executions")
    await insert_analytics_event("workflow_simulate", user_id=user.id)

    evaluation = None
    if request.settings.evaluate and trace.status == "complete":
        if request.settings.llm_mode == LLMMode.MOCK:
            evaluation = mock_evaluate(request.workflow, trace)
        else:
            await _check_llm_limit(user)
            try:
                provider = get_provider()
                evaluation = await llm_evaluate(request.workflow, trace, provider)
                await increment_usage(user.id, "llm_requests")
            except (RuntimeError, EvaluationError):
                evaluation = mock_evaluate(request.workflow, trace)

    return SimulateWorkflowResponse(trace=trace, evaluation=evaluation)


@router.post("/workflows/simulate/resume", response_model=SimulateWorkflowResponse)
async def resume_simulation_endpoint(request: ResumeSimulationRequest, user: ApprovedUser):
    paused_info = get_paused_settings(request.trace_id)

    try:
        trace = await resume_simulation(request.trace_id, request.node_id, request.decision)
    except SimulationError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    evaluation = None
    if paused_info and trace.status == "complete":
        resume_workflow, resume_settings = paused_info
        if resume_settings.evaluate:
            if resume_settings.llm_mode == LLMMode.MOCK:
                evaluation = mock_evaluate(resume_workflow, trace)
            else:
                try:
                    provider = get_provider()
                    evaluation = await llm_evaluate(resume_workflow, trace, provider)
                    await increment_usage(user.id, "llm_requests")
                except (RuntimeError, EvaluationError):
                    evaluation = mock_evaluate(resume_workflow, trace)

    return SimulateWorkflowResponse(trace=trace, evaluation=evaluation)
