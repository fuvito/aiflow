from fastapi import APIRouter, HTTPException
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

router = APIRouter(prefix="/api")


@router.get("/health")
async def health():
    return {"status": "ok"}


@router.post("/workflows/validate", response_model=ValidateWorkflowResponse)
async def validate(request: ValidateWorkflowRequest):
    result = validate_workflow(request.workflow)
    return ValidateWorkflowResponse(
        valid=result.valid,
        errors=result.errors,
        warnings=result.warnings,
    )


@router.post("/workflows/generate", response_model=GenerateWorkflowResponse)
async def generate(request: GenerateWorkflowRequest):
    try:
        provider = get_provider()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    try:
        workflow = await generate_workflow(request.description, provider)
    except WorkflowGenerationError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    return GenerateWorkflowResponse(workflow=workflow)


@router.post("/workflows/chat", response_model=WorkflowChatResponse)
async def chat_workflow(request: WorkflowChatRequest):
    try:
        provider = get_provider()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    try:
        return await chat_workflow_service(request.messages, request.current_workflow, provider)
    except WorkflowGenerationError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


@router.post("/workflows/simulate", response_model=SimulateWorkflowResponse)
async def simulate_workflow(request: SimulateWorkflowRequest):
    try:
        trace = simulate(request.workflow, request.input, request.settings)
    except SimulationError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    evaluation = None
    if request.settings.evaluate and trace.status == "complete":
        if request.settings.llm_mode == LLMMode.MOCK:
            evaluation = mock_evaluate(request.workflow, trace)
        else:
            # Real LLM path — active when llm_mode='real' is added to the enum.
            try:
                provider = get_provider()
                evaluation = await llm_evaluate(request.workflow, trace, provider)
            except (RuntimeError, EvaluationError):
                evaluation = mock_evaluate(request.workflow, trace)

    return SimulateWorkflowResponse(trace=trace, evaluation=evaluation)


@router.post("/workflows/simulate/resume", response_model=SimulateWorkflowResponse)
async def resume_simulation_endpoint(request: ResumeSimulationRequest):
    # Read settings/workflow before resume_simulation consumes the paused state.
    paused_info = get_paused_settings(request.trace_id)

    try:
        trace = resume_simulation(request.trace_id, request.node_id, request.decision)
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
                except (RuntimeError, EvaluationError):
                    evaluation = mock_evaluate(resume_workflow, trace)

    return SimulateWorkflowResponse(trace=trace, evaluation=evaluation)
