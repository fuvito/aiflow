"""Workflow simulation engine.

Executes a Workflow as a mock simulation and returns an ExecutionTrace.
All node handlers produce deterministic mock output — no real LLM or API
calls are made.

Cycle detection uses DFS three-colour marking. Graph traversal uses BFS
from the START node; branching at CONDITION nodes is controlled by
SimulationSettings.condition_mode.

HITL pause/resume: when hitl_mode='pause' the BFS halts at the first HITL
node, persists the continuation state in an in-memory store, and returns
a trace with status='paused'. The caller then calls resume_simulation() to
continue from where it left off.
"""
from collections import defaultdict, deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from app.models.workflow import NodeType, Workflow, WorkflowEdge
from app.schemas.simulation import (
    ExecutionTrace,
    HITLMode,
    NodeExecution,
    NodeExecutionStatus,
    SimulationSettings,
)
from app.services import node_handlers


class SimulationError(Exception):
    pass


# ── In-memory paused-simulation store ────────────────────────────────────────
# Not thread-safe; sufficient for single-process MVP2 usage.

@dataclass
class _PausedState:
    trace: ExecutionTrace
    workflow: Workflow
    settings: SimulationSettings
    paused_node_id: str
    continuation_queue: list[tuple[str, dict[str, Any]]] = field(default_factory=list)
    visited: set[str] = field(default_factory=set)


_paused_store: dict[str, _PausedState] = {}


# ── Public entry points ───────────────────────────────────────────────────────

def simulate(
    workflow: Workflow,
    input_data: dict[str, Any],
    settings: SimulationSettings,
) -> ExecutionTrace:
    _validate_for_simulation(workflow)

    node_by_id = {n.id: n for n in workflow.nodes}
    edges_from: dict[str, list[WorkflowEdge]] = defaultdict(list)
    for edge in workflow.edges:
        edges_from[edge.source].append(edge)

    start_node = next(n for n in workflow.nodes if n.type == NodeType.START)

    trace = ExecutionTrace(
        workflow_id=workflow.id,
        workflow_name=workflow.name,
        started_at=_now(),
        status="running",
    )

    queue: deque[tuple[str, dict[str, Any]]] = deque([(start_node.id, input_data)])
    return _run_bfs(trace, workflow, settings, node_by_id, edges_from, queue, set())


def resume_simulation(trace_id: str, node_id: str, decision: str) -> ExecutionTrace:
    paused = _paused_store.get(trace_id)
    if not paused:
        raise SimulationError(f"No paused simulation found with trace_id '{trace_id}'.")
    if paused.paused_node_id != node_id:
        raise SimulationError(
            f"Node '{node_id}' is not the paused HITL node "
            f"(expected '{paused.paused_node_id}')."
        )

    del _paused_store[trace_id]

    hitl_output: dict[str, Any] = {
        "approved": decision == "approve",
        "reviewer": "human",
        "decision": decision,
    }

    # Promote the waiting step to success now that we have the decision.
    for step in paused.trace.steps:
        if step.node_id == node_id and step.status == NodeExecutionStatus.WAITING:
            step.status = NodeExecutionStatus.SUCCESS
            step.output = hitl_output
            step.completed_at = _now()
            break

    node_by_id = {n.id: n for n in paused.workflow.nodes}
    edges_from: dict[str, list[WorkflowEdge]] = defaultdict(list)
    for edge in paused.workflow.edges:
        edges_from[edge.source].append(edge)

    # Queue HITL successors (not yet visited), then the remaining BFS tail.
    hitl_successors = [
        (edge.target, hitl_output)
        for edge in edges_from.get(node_id, [])
        if edge.target not in paused.visited and edge.target in node_by_id
    ]
    queue: deque[tuple[str, dict[str, Any]]] = deque(
        hitl_successors + paused.continuation_queue
    )

    paused.trace.status = "running"
    return _run_bfs(
        paused.trace,
        paused.workflow,
        paused.settings,
        node_by_id,
        edges_from,
        queue,
        paused.visited,
    )


# ── Core BFS loop ─────────────────────────────────────────────────────────────

def _run_bfs(
    trace: ExecutionTrace,
    workflow: Workflow,
    settings: SimulationSettings,
    node_by_id: dict[str, Any],
    edges_from: dict[str, list[WorkflowEdge]],
    queue: deque[tuple[str, dict[str, Any]]],
    visited: set[str],
) -> ExecutionTrace:
    while queue:
        node_id, data = queue.popleft()
        if node_id in visited:
            continue
        visited.add(node_id)

        node = node_by_id[node_id]
        step_start = _now()

        # HITL pause: halt before dispatching, store continuation for resume.
        if node.type == NodeType.HITL and settings.hitl_mode == HITLMode.PAUSE:
            step = NodeExecution(
                node_id=node.id,
                node_name=node.name,
                node_type=node.type.value,
                status=NodeExecutionStatus.WAITING,
                started_at=step_start,
                input=data,
            )
            trace.steps.append(step)
            trace.status = "paused"
            trace.completed_at = _now()
            _paused_store[trace.trace_id] = _PausedState(
                trace=trace,
                workflow=workflow,
                settings=settings,
                paused_node_id=node.id,
                continuation_queue=list(queue),
                visited=visited,
            )
            return trace

        try:
            output = node_handlers.dispatch(node, data, settings)
            step = NodeExecution(
                node_id=node.id,
                node_name=node.name,
                node_type=node.type.value,
                status=NodeExecutionStatus.SUCCESS,
                started_at=step_start,
                completed_at=_now(),
                input=data,
                output=output,
            )
        except Exception as exc:
            step = NodeExecution(
                node_id=node.id,
                node_name=node.name,
                node_type=node.type.value,
                status=NodeExecutionStatus.ERROR,
                started_at=step_start,
                completed_at=_now(),
                input=data,
                error=str(exc),
            )
            trace.steps.append(step)
            trace.status = "error"
            trace.completed_at = _now()
            return trace

        trace.steps.append(step)

        if node.type == NodeType.END:
            continue

        outgoing = edges_from.get(node.id, [])
        if node.type == NodeType.CONDITION:
            chosen = node_handlers.select_condition_edges(node, outgoing, output, settings)
        else:
            chosen = outgoing

        for edge in chosen:
            if edge.target not in visited and edge.target in node_by_id:
                queue.append((edge.target, output))

    trace.status = "complete"
    trace.completed_at = _now()
    return trace


# ── Validation ────────────────────────────────────────────────────────────────

def _validate_for_simulation(workflow: Workflow) -> None:
    node_ids = {n.id for n in workflow.nodes}

    start_nodes = [n for n in workflow.nodes if n.type == NodeType.START]
    if not start_nodes:
        raise SimulationError("Workflow must have a START node.")
    if len(start_nodes) > 1:
        raise SimulationError(f"Workflow has {len(start_nodes)} START nodes; exactly one is required.")

    end_nodes = [n for n in workflow.nodes if n.type == NodeType.END]
    if not end_nodes:
        raise SimulationError("Workflow must have at least one END node.")

    for edge in workflow.edges:
        if edge.source not in node_ids:
            raise SimulationError(f"Edge references unknown source node: '{edge.source}'")
        if edge.target not in node_ids:
            raise SimulationError(f"Edge references unknown target node: '{edge.target}'")

    if _has_cycle(workflow):
        raise SimulationError("Workflow contains a cycle; simulation requires a DAG.")


def _has_cycle(workflow: Workflow) -> bool:
    edges_from: dict[str, list[str]] = defaultdict(list)
    for edge in workflow.edges:
        edges_from[edge.source].append(edge.target)

    WHITE, GRAY, BLACK = 0, 1, 2
    color: dict[str, int] = {n.id: WHITE for n in workflow.nodes}

    def dfs(node_id: str) -> bool:
        color[node_id] = GRAY
        for neighbor in edges_from.get(node_id, []):
            if color.get(neighbor) == GRAY:
                return True
            if color.get(neighbor) == WHITE and dfs(neighbor):
                return True
        color[node_id] = BLACK
        return False

    return any(
        color[n.id] == WHITE and dfs(n.id)
        for n in workflow.nodes
    )


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()
