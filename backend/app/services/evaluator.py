"""Simulation trace evaluator.

Two paths:
  mock_evaluate  — deterministic, reflects workflow structure; no API call.
  llm_evaluate   — calls the configured LLM provider; raises EvaluationError on failure.

The route selects the path based on SimulationSettings.llm_mode:
  mock  → mock_evaluate
  real  → llm_evaluate (provider required)
"""
from app.models.workflow import NodeType, Workflow
from app.providers.base import LLMProvider
from app.schemas.simulation import ExecutionTrace, SimulationEvaluation


class EvaluationError(Exception):
    pass


_EVAL_SYSTEM_PROMPT = (
    "You are a workflow quality evaluator. "
    "Analyse the workflow design and its simulation trace, then respond with a "
    "single valid JSON object — no markdown, no explanation. "
    "Schema: "
    '{"score": <integer 1-10>, '
    '"summary": "<2-3 sentence assessment>", '
    '"strengths": ["<strength>", ...], '
    '"issues": ["<issue>", ...], '
    '"recommendations": ["<recommendation>", ...]}'
)


# ── Mock evaluator ────────────────────────────────────────────────────────────

def mock_evaluate(workflow: Workflow, trace: ExecutionTrace) -> SimulationEvaluation:
    """Return a deterministic evaluation derived from workflow structure."""
    node_types = {n.type for n in workflow.nodes}
    step_count = len(trace.steps)
    has_hitl = NodeType.HITL in node_types
    has_condition = NodeType.CONDITION in node_types
    has_rag = NodeType.RAG in node_types
    has_api = NodeType.API in node_types

    strengths: list[str] = [
        f"Workflow completed all {step_count} steps without errors.",
        "Clear entry and exit path via START and END nodes.",
    ]
    if has_hitl:
        strengths.append("Human-in-the-loop review step adds quality control.")
    if has_condition:
        strengths.append("Conditional branching enables dynamic routing based on runtime data.")
    if has_rag:
        strengths.append("Knowledge retrieval (RAG) grounds responses in factual content.")

    issues: list[str] = [
        "Mock simulation: node outputs are synthetic and not representative of production data.",
    ]
    if not has_condition:
        issues.append(
            "No error-handling branches detected — consider adding CONDITION nodes "
            "to route failures to a fallback path."
        )
    if has_api and not has_condition:
        issues.append(
            "API node is present but there is no conditional branch to handle non-2xx responses."
        )

    recommendations: list[str] = [
        "Run the simulation with real LLM mode enabled to validate prompt quality.",
        "Add a CONDITION node after each API or DATABASE call to handle failure cases.",
        "Review node config fields — empty prompts or queries will produce poor results in production.",
    ]
    if not has_hitl:
        recommendations.append(
            "Consider adding a HITL node before the final response for high-stakes decisions."
        )

    # Score: base 6, +1 for HITL, +1 for CONDITION, -1 if no error handling
    score = 6
    if has_hitl:
        score += 1
    if has_condition:
        score += 1
    if not has_condition:
        score -= 1
    score = max(1, min(10, score))

    return SimulationEvaluation(
        score=score,
        summary=(
            f"The '{workflow.name}' workflow executed successfully across {step_count} step(s). "
            f"The overall structure is {'well-designed' if score >= 7 else 'functional but could be improved'} "
            f"with {'good' if has_condition else 'limited'} error-handling coverage."
        ),
        strengths=strengths,
        issues=issues,
        recommendations=recommendations,
    )


# ── LLM evaluator ─────────────────────────────────────────────────────────────

async def llm_evaluate(
    workflow: Workflow,
    trace: ExecutionTrace,
    provider: LLMProvider,
) -> SimulationEvaluation:
    """Call the LLM to evaluate the trace and return a structured report."""
    user_prompt = _build_prompt(workflow, trace)
    try:
        raw = await provider.complete_json(_EVAL_SYSTEM_PROMPT, user_prompt)
    except Exception as exc:
        raise EvaluationError(f"LLM evaluation call failed: {exc}") from exc

    try:
        score = max(1, min(10, int(raw.get("score", 5))))
        return SimulationEvaluation(
            score=score,
            summary=str(raw.get("summary", "")),
            strengths=[str(s) for s in raw.get("strengths", [])],
            issues=[str(i) for i in raw.get("issues", [])],
            recommendations=[str(r) for r in raw.get("recommendations", [])],
        )
    except Exception as exc:
        raise EvaluationError(f"Failed to parse LLM evaluation response: {exc}") from exc


def _build_prompt(workflow: Workflow, trace: ExecutionTrace) -> str:
    lines: list[str] = [
        f"Workflow name: {workflow.name}",
        f"Description: {workflow.description or '(none)'}",
        f"Node count: {len(workflow.nodes)}",
        "Nodes:",
    ]
    for node in workflow.nodes:
        config_keys = list(node.config.keys()) if node.config else []
        lines.append(f"  [{node.type.value}] {node.name}" +
                     (f" — config: {config_keys}" if config_keys else ""))

    lines.append(f"\nExecution trace ({len(trace.steps)} steps):")
    for step in trace.steps:
        out = ""
        if step.output:
            raw_out = str(step.output)
            out = f" → {raw_out[:120]}{'...' if len(raw_out) > 120 else ''}"
        err = f" ERROR: {step.error}" if step.error else ""
        lines.append(f"  [{step.node_type}] {step.node_name}: {step.status.value}{out}{err}")

    return "\n".join(lines)
