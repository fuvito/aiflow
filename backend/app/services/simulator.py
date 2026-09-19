"""
WorkflowSimulator — MVP2

Executes a workflow against mock node handlers, producing a step-by-step
execution trace without calling real external services.

Responsibilities:
  - Walk the workflow graph from START to END, following edge conditions
  - Dispatch each node to a registered mock handler (LLM, API, DB, RAG, etc.)
  - Capture input/output at every step
  - Support error and retry simulation
  - Return an ExecutionTrace for display in the frontend

Future usage::

    simulator = WorkflowSimulator(handlers=default_mock_handlers())
    trace = await simulator.run(workflow, initial_input={"message": "..."})
    # trace.steps — list of NodeExecutionStep

Not implemented in MVP1.
"""
from __future__ import annotations
from typing import Any
from app.models.workflow import Workflow


class NodeExecutionStep:
    node_id: str
    node_name: str
    input: Any
    output: Any
    duration_ms: float
    status: str  # "success" | "error" | "skipped"
    error: str | None


class ExecutionTrace:
    workflow_id: str
    started_at: str
    completed_at: str
    steps: list[NodeExecutionStep]
    final_output: Any
    status: str  # "success" | "error"


class WorkflowSimulator:
    async def run(self, workflow: Workflow, initial_input: Any) -> ExecutionTrace:
        raise NotImplementedError("WorkflowSimulator is not yet implemented (planned for MVP2).")
