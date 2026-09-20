"""Mock node handlers for workflow simulation.

Each handler receives the node, its input data, and simulation settings,
and returns a dict representing the node's output.

Real LLM calls are not implemented here — the llm_mode='real' branch is
stubbed with NotImplementedError so it can be wired in without restructuring.
"""
import random as _random
from typing import Any

from app.models.workflow import NodeType, WorkflowNode
from app.schemas.simulation import SimulationSettings, LLMMode


def dispatch(
    node: WorkflowNode,
    input_data: dict[str, Any],
    settings: SimulationSettings,
) -> dict[str, Any]:
    handlers = {
        NodeType.START: _handle_start,
        NodeType.END: _handle_end,
        NodeType.LLM: _handle_llm,
        NodeType.TOOL: _handle_tool,
        NodeType.API: _handle_api,
        NodeType.DATABASE: _handle_database,
        NodeType.RAG: _handle_rag,
        NodeType.CONDITION: _handle_condition,
        NodeType.HITL: _handle_hitl,
        NodeType.TRANSFORM: _handle_transform,
    }
    handler = handlers.get(node.type, _handle_unknown)
    return handler(node, input_data, settings)


# ── Handlers ─────────────────────────────────────────────────────────────────

def _handle_start(
    node: WorkflowNode, input_data: dict[str, Any], _settings: SimulationSettings
) -> dict[str, Any]:
    return dict(input_data)


def _handle_end(
    node: WorkflowNode, input_data: dict[str, Any], _settings: SimulationSettings
) -> dict[str, Any]:
    return {"result": input_data}


def _handle_llm(
    node: WorkflowNode, input_data: dict[str, Any], settings: SimulationSettings
) -> dict[str, Any]:
    if settings.llm_mode == LLMMode.MOCK:
        prompt = node.config.get("prompt", "")
        return {
            "result": f"Mock LLM output for prompt: {prompt[:80]}",
            "_mock": True,
            "node_id": node.id,
            "node_name": node.name,
        }
    # Future: call LLMProvider.generate(prompt, structured_output_schema)
    # Provider is already implemented in providers/openai_provider.py
    raise NotImplementedError("Real LLM simulation is not yet enabled")


def _handle_tool(
    node: WorkflowNode, _input: dict[str, Any], _settings: SimulationSettings
) -> dict[str, Any]:
    return {"tool": node.name, "result": "mock tool output", "_mock": True}


def _handle_api(
    node: WorkflowNode, _input: dict[str, Any], _settings: SimulationSettings
) -> dict[str, Any]:
    return {"status": 200, "body": {"mock": True}, "_mock": True}


def _handle_database(
    node: WorkflowNode, _input: dict[str, Any], _settings: SimulationSettings
) -> dict[str, Any]:
    return {"rows": [], "_mock": True}


def _handle_rag(
    node: WorkflowNode, _input: dict[str, Any], _settings: SimulationSettings
) -> dict[str, Any]:
    return {"documents": [], "answer": "Mock RAG answer", "_mock": True}


def _handle_condition(
    node: WorkflowNode, input_data: dict[str, Any], _settings: SimulationSettings
) -> dict[str, Any]:
    """Returns the input unchanged; branch selection is handled by the simulator."""
    return dict(input_data)


def _handle_hitl(
    node: WorkflowNode, input_data: dict[str, Any], settings: SimulationSettings
) -> dict[str, Any]:
    # Pause behavior is implemented in Task 22 via the resume endpoint.
    # Auto-approve always produces an unbroken trace.
    return {"approved": True, "reviewer": "auto", "_mock": True}


def _handle_transform(
    node: WorkflowNode, input_data: dict[str, Any], _settings: SimulationSettings
) -> dict[str, Any]:
    return {**input_data, "_transformed": True}


def _handle_unknown(
    node: WorkflowNode, _input: dict[str, Any], _settings: SimulationSettings
) -> dict[str, Any]:
    return {"_mock": True, "node_type": str(node.type)}


# ── Edge selection for CONDITION nodes ───────────────────────────────────────

def select_condition_edges(
    node: WorkflowNode,
    outgoing_edges: list,
    output_data: dict[str, Any],
    settings: SimulationSettings,
) -> list:
    """Return the subset of outgoing_edges to follow after a CONDITION node."""
    from app.schemas.simulation import ConditionMode

    if not outgoing_edges:
        return []

    if settings.condition_mode == ConditionMode.RANDOM:
        return [_random.choice(outgoing_edges)]

    if settings.condition_mode == ConditionMode.USER_PICK:
        # Full pause/resume is Task 22. Default to first edge for now.
        return outgoing_edges[:1]

    # EXPRESSION mode: try to evaluate config.expression against data context.
    # With mock data the expression will usually fail — fall back to all edges
    # so the full graph is explored.
    expression = node.config.get("expression", "")
    if expression:
        try:
            result = eval(expression, {"__builtins__": {}}, output_data)  # noqa: S307
            # Map truthy/falsy result to edge conditions
            truthy_labels = {"true", "yes", "complex", "1"}
            falsy_labels = {"false", "no", "simple", "0"}
            if result:
                conditioned = [e for e in outgoing_edges if str(e.condition).lower() in truthy_labels]
            else:
                conditioned = [e for e in outgoing_edges if str(e.condition).lower() in falsy_labels]
            if conditioned:
                return conditioned
        except Exception:
            pass

    # Fallback: follow all outgoing edges (explores full graph with mock data)
    return outgoing_edges
