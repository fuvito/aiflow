from typing import Literal
from pydantic import BaseModel, Field
from app.models.workflow import Workflow


class GenerateWorkflowRequest(BaseModel):
    description: str = Field(..., min_length=1, max_length=2000)


class GenerateWorkflowResponse(BaseModel):
    workflow: Workflow


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1, max_length=2000)


class WorkflowChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(..., min_length=1, max_length=50)
    current_workflow: Workflow | None = None


class WorkflowChatResponse(BaseModel):
    status: Literal["gathering", "ready"]
    reply: str
    workflow: Workflow | None = None


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
