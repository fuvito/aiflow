from fastapi import APIRouter, HTTPException
from app.schemas.requests import (
    GenerateWorkflowRequest,
    GenerateWorkflowResponse,
    ValidateWorkflowRequest,
    ValidateWorkflowResponse,
)
from app.services.validator import validate_workflow
from app.services.workflow_generator import generate_workflow, WorkflowGenerationError
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
