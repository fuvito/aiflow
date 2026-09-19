from pydantic import BaseModel
from app.models.workflow import Workflow


class GenerateWorkflowRequest(BaseModel):
    description: str


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
