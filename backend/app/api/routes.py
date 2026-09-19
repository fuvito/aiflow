from fastapi import APIRouter, HTTPException
from app.schemas.requests import (
    GenerateWorkflowRequest,
    GenerateWorkflowResponse,
    ValidateWorkflowRequest,
    ValidateWorkflowResponse,
)
from app.services.validator import validate_workflow

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
    # Implemented in Task 11 — LLM provider wired here
    raise HTTPException(status_code=501, detail="Workflow generation not yet implemented.")
