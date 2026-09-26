"""Node handlers for workflow simulation.

Each handler receives the node, its input data, and simulation settings,
and returns a dict representing the node's output.

LLM nodes support two modes controlled by settings.llm_mode:
  mock — instant deterministic output, no API call
  real — calls the configured LLM provider (requires LLM_API_KEY)
"""
import asyncio
import json as _json
import random as _random
from typing import Any

from app.models.workflow import NodeType, WorkflowNode
from app.schemas.simulation import SimulationSettings, LLMMode


async def dispatch(
    node: WorkflowNode,
    input_data: dict[str, Any],
    settings: SimulationSettings,
) -> dict[str, Any]:
    if node.type == NodeType.LLM:
        return await _handle_llm(node, input_data, settings)
    handlers = {
        NodeType.START: _handle_start,
        NodeType.END: _handle_end,
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


_LLM_NODE_TIMEOUT = 60.0  # seconds per LLM node in real mode


async def _handle_llm(
    node: WorkflowNode, input_data: dict[str, Any], settings: SimulationSettings
) -> dict[str, Any]:
    prompt = node.config.get("prompt", "You are a helpful AI assistant.")
    if settings.llm_mode == LLMMode.REAL:
        from app.providers.factory import get_provider
        provider = get_provider()
        user_msg = (
            "Input data:\n"
            + _json.dumps(input_data, indent=2, default=str)
            + "\n\nProcess the input according to your role and respond with a JSON object."
        )
        try:
            result = await asyncio.wait_for(
                provider.complete_json(prompt, user_msg),
                timeout=_LLM_NODE_TIMEOUT,
            )
        except asyncio.TimeoutError:
            raise RuntimeError(
                f"LLM node '{node.name}' timed out after {int(_LLM_NODE_TIMEOUT)}s. "
                "Check your API key and network, or switch to Mock mode."
            )
        return {"result": result, "node_id": node.id, "node_name": node.name}
    return {
        "result": f"Mock LLM output for prompt: {prompt[:80]}",
        "_mock": True,
        "node_id": node.id,
        "node_name": node.name,
    }


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
