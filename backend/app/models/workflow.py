from enum import Enum
from typing import Any, Optional
from pydantic import BaseModel, Field
import uuid


class NodeType(str, Enum):
    START = "START"
    END = "END"
    LLM = "LLM"
    TOOL = "TOOL"
    API = "API"
    DATABASE = "DATABASE"
    RAG = "RAG"
    CONDITION = "CONDITION"
    HITL = "HITL"
    TRANSFORM = "TRANSFORM"


class Position(BaseModel):
    x: float = 0.0
    y: float = 0.0


class WorkflowNode(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: NodeType
    name: str
    position: Position = Field(default_factory=Position)
    config: dict[str, Any] = Field(default_factory=dict)


class WorkflowEdge(BaseModel):
    source: str
    target: str
    condition: Optional[str] = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class Workflow(BaseModel):
    version: str = "1.0"
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = "Untitled Workflow"
    description: str = ""
    nodes: list[WorkflowNode] = Field(default_factory=list)
    edges: list[WorkflowEdge] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)
