from pydantic import BaseModel, Field
from app.models.workflow import Workflow


class GenerateWorkflowRequest(BaseModel):
    description: str = Field(..., min_length=1, max_length=2000)


class GenerateWorkflowResponse(BaseModel):
    workflow: Workflow


class ValidateWorkflowRequest(BaseModel):
    workflow: Workflow


class ValidationResult(BaseModel):
    valid: bool
    errors: list[str] = []
    warnings: list[str] = []


class ValidateWorkflowResponse(BaseModel):
    valid: bool
    errors: list[str] = []
    warnings: list[str] = []
