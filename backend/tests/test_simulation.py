import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.models.workflow import Workflow, WorkflowNode, WorkflowEdge, NodeType
from app.providers.base import LLMProvider
from app.schemas.simulation import SimulationSettings, ConditionMode, HITLMode
from app.services.simulator import simulate, resume_simulation, SimulationError, _paused_store
from app.services.evaluator import mock_evaluate, llm_evaluate, EvaluationError

BASE = "http://test"


def _transport():
    return ASGITransport(app=app)


# ── Workflow builders ────────────────────────────────────────────────────────

def _minimal() -> Workflow:
    return Workflow(
        name="Minimal",
        nodes=[
            WorkflowNode(id="s", type=NodeType.START, name="Start"),
            WorkflowNode(id="e", type=NodeType.END, name="End"),
        ],
        edges=[WorkflowEdge(source="s", target="e")],
    )


def _linear() -> Workflow:
    """START → LLM → END"""
    return Workflow(
        name="Linear",
        nodes=[
            WorkflowNode(id="s", type=NodeType.START, name="Start"),
            WorkflowNode(id="l", type=NodeType.LLM, name="Chat", config={"prompt": "Say hello"}),
            WorkflowNode(id="e", type=NodeType.END, name="End"),
        ],
        edges=[
            WorkflowEdge(source="s", target="l"),
            WorkflowEdge(source="l", target="e"),
        ],
    )


def _branching() -> Workflow:
    """START → CONDITION → [A_END | B_END]"""
    return Workflow(
        name="Branching",
        nodes=[
            WorkflowNode(id="s", type=NodeType.START, name="Start"),
            WorkflowNode(id="c", type=NodeType.CONDITION, name="Router", config={"expression": "x > 0"}),
            WorkflowNode(id="ea", type=NodeType.END, name="End A"),
            WorkflowNode(id="eb", type=NodeType.END, name="End B"),
        ],
        edges=[
            WorkflowEdge(source="s", target="c"),
            WorkflowEdge(source="c", target="ea", condition="complex"),
            WorkflowEdge(source="c", target="eb", condition="simple"),
        ],
    )


def _with_cycle() -> Workflow:
    return Workflow(
        name="Cyclic",
        nodes=[
            WorkflowNode(id="s", type=NodeType.START, name="Start"),
            WorkflowNode(id="a", type=NodeType.LLM, name="A", config={"prompt": "p"}),
            WorkflowNode(id="e", type=NodeType.END, name="End"),
        ],
        edges=[
            WorkflowEdge(source="s", target="a"),
            WorkflowEdge(source="a", target="s"),  # cycle back to START
            WorkflowEdge(source="a", target="e"),
        ],
    )


def _default_settings(**overrides) -> SimulationSettings:
    return SimulationSettings(**overrides)


# ── Unit tests: simulate() ───────────────────────────────────────────────────

def test_minimal_workflow_produces_complete_trace():
    trace = simulate(_minimal(), {}, _default_settings())
    assert trace.status == "complete"
    assert len(trace.steps) == 2
    node_ids = [s.node_id for s in trace.steps]
    assert node_ids == ["s", "e"]


def test_all_steps_succeed():
    trace = simulate(_minimal(), {}, _default_settings())
    for step in trace.steps:
        assert step.status == "success"


def test_trace_has_workflow_metadata():
    wf = _minimal()
    trace = simulate(wf, {}, _default_settings())
    assert trace.workflow_id == wf.id
    assert trace.workflow_name == wf.name
    assert trace.started_at
    assert trace.completed_at


def test_linear_workflow_visits_all_nodes():
    trace = simulate(_linear(), {"user": "hello"}, _default_settings())
    assert trace.status == "complete"
    assert len(trace.steps) == 3
    types = [s.node_type for s in trace.steps]
    assert types == ["START", "LLM", "END"]


def test_llm_mock_handler_output_shape():
    trace = simulate(_linear(), {}, _default_settings())
    llm_step = next(s for s in trace.steps if s.node_type == "LLM")
    assert llm_step.output is not None
    assert llm_step.output["_mock"] is True
    assert "Mock LLM output" in llm_step.output["result"]
    assert "Say hello" in llm_step.output["result"]


def test_start_node_passes_input_through():
    trace = simulate(_minimal(), {"key": "val"}, _default_settings())
    start_step = trace.steps[0]
    assert start_step.node_type == "START"
    assert start_step.output == {"key": "val"}


def test_end_node_wraps_input():
    trace = simulate(_minimal(), {"key": "val"}, _default_settings())
    end_step = trace.steps[-1]
    assert end_step.node_type == "END"
    assert "result" in end_step.output


def test_condition_expression_fallback_follows_all_edges():
    # Expression can't eval against mock data → all edges followed
    trace = simulate(_branching(), {}, _default_settings(condition_mode=ConditionMode.EXPRESSION))
    assert trace.status == "complete"
    visited = {s.node_id for s in trace.steps}
    # Both end nodes reachable
    assert "ea" in visited
    assert "eb" in visited


def test_condition_random_mode_follows_exactly_one_edge():
    trace = simulate(_branching(), {}, _default_settings(condition_mode=ConditionMode.RANDOM))
    assert trace.status == "complete"
    end_steps = [s for s in trace.steps if s.node_type == "END"]
    assert len(end_steps) == 1


def test_condition_user_pick_follows_first_edge():
    trace = simulate(_branching(), {}, _default_settings(condition_mode=ConditionMode.USER_PICK))
    assert trace.status == "complete"
    end_steps = [s for s in trace.steps if s.node_type == "END"]
    assert len(end_steps) == 1
    assert end_steps[0].node_id == "ea"


def test_cycle_detection_raises():
    with pytest.raises(SimulationError, match="cycle"):
        simulate(_with_cycle(), {}, _default_settings())


def test_missing_start_raises():
    wf = Workflow(
        name="NoStart",
        nodes=[WorkflowNode(id="e", type=NodeType.END, name="End")],
        edges=[],
    )
    with pytest.raises(SimulationError, match="START"):
        simulate(wf, {}, _default_settings())


def test_missing_end_raises():
    wf = Workflow(
        name="NoEnd",
        nodes=[WorkflowNode(id="s", type=NodeType.START, name="Start")],
        edges=[],
    )
    with pytest.raises(SimulationError, match="END"):
        simulate(wf, {}, _default_settings())


def test_bad_edge_reference_raises():
    wf = Workflow(
        name="BadEdge",
        nodes=[
            WorkflowNode(id="s", type=NodeType.START, name="Start"),
            WorkflowNode(id="e", type=NodeType.END, name="End"),
        ],
        edges=[WorkflowEdge(source="s", target="nonexistent")],
    )
    with pytest.raises(SimulationError, match="unknown"):
        simulate(wf, {}, _default_settings())


def test_hitl_auto_approve_does_not_block():
    wf = Workflow(
        name="HITL",
        nodes=[
            WorkflowNode(id="s", type=NodeType.START, name="Start"),
            WorkflowNode(id="h", type=NodeType.HITL, name="Review",
                         config={"instructions": "Approve me"}),
            WorkflowNode(id="e", type=NodeType.END, name="End"),
        ],
        edges=[
            WorkflowEdge(source="s", target="h"),
            WorkflowEdge(source="h", target="e"),
        ],
    )
    trace = simulate(wf, {}, _default_settings())
    assert trace.status == "complete"
    hitl_step = next(s for s in trace.steps if s.node_type == "HITL")
    assert hitl_step.output["approved"] is True


def test_all_node_types_produce_mock_output():
    """Every node type handler must return a dict (not raise)."""
    node_configs = {
        NodeType.START: {},
        NodeType.END: {},
        NodeType.LLM: {"prompt": "test"},
        NodeType.TOOL: {},
        NodeType.API: {"method": "GET", "url": "http://x"},
        NodeType.DATABASE: {"query": "SELECT 1"},
        NodeType.RAG: {"knowledgeBase": "kb"},
        NodeType.CONDITION: {"expression": "True"},
        NodeType.HITL: {"instructions": "review"},
        NodeType.TRANSFORM: {},
    }
    from app.services.node_handlers import dispatch
    settings = _default_settings()
    for node_type, config in node_configs.items():
        node = WorkflowNode(id="n", type=node_type, name="N", config=config)
        result = dispatch(node, {}, settings)
        assert isinstance(result, dict), f"Handler for {node_type} did not return dict"


# ── API tests: POST /api/workflows/simulate ──────────────────────────────────

@pytest.mark.asyncio
async def test_simulate_endpoint_returns_complete_trace():
    payload = {
        "workflow": {
            "version": "1.0",
            "id": "sim-test",
            "name": "Sim Test",
            "description": "",
            "nodes": [
                {"id": "s", "type": "START", "name": "Start", "position": {"x": 0, "y": 0}, "config": {}},
                {"id": "e", "type": "END",   "name": "End",   "position": {"x": 0, "y": 1}, "config": {}},
            ],
            "edges": [{"source": "s", "target": "e"}],
            "metadata": {},
        },
        "input": {"message": "hello"},
        "settings": {
            "llm_mode": "mock",
            "hitl_mode": "auto-approve",
            "condition_mode": "expression",
            "display_mode": "animated",
            "animation_delay_ms": 600,
        },
    }
    async with AsyncClient(transport=_transport(), base_url=BASE) as client:
        res = await client.post("/api/workflows/simulate", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["trace"]["status"] == "complete"
    assert len(data["trace"]["steps"]) == 2


@pytest.mark.asyncio
async def test_simulate_endpoint_rejects_cycle():
    payload = {
        "workflow": {
            "version": "1.0",
            "id": "cyclic",
            "name": "Cyclic",
            "description": "",
            "nodes": [
                {"id": "s", "type": "START", "name": "Start", "position": {"x": 0, "y": 0}, "config": {}},
                {"id": "a", "type": "LLM",   "name": "A",     "position": {"x": 0, "y": 1}, "config": {"prompt": "p"}},
                {"id": "e", "type": "END",   "name": "End",   "position": {"x": 0, "y": 2}, "config": {}},
            ],
            "edges": [
                {"source": "s", "target": "a"},
                {"source": "a", "target": "s"},
                {"source": "a", "target": "e"},
            ],
            "metadata": {},
        },
        "input": {},
    }
    async with AsyncClient(transport=_transport(), base_url=BASE) as client:
        res = await client.post("/api/workflows/simulate", json=payload)
    assert res.status_code == 422
    assert "cycle" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_simulate_endpoint_default_settings():
    """Settings field is optional; defaults should work."""
    payload = {
        "workflow": {
            "version": "1.0",
            "id": "def-test",
            "name": "Default Settings",
            "description": "",
            "nodes": [
                {"id": "s", "type": "START", "name": "Start", "position": {"x": 0, "y": 0}, "config": {}},
                {"id": "e", "type": "END",   "name": "End",   "position": {"x": 0, "y": 1}, "config": {}},
            ],
            "edges": [{"source": "s", "target": "e"}],
            "metadata": {},
        },
    }
    async with AsyncClient(transport=_transport(), base_url=BASE) as client:
        res = await client.post("/api/workflows/simulate", json=payload)
    assert res.status_code == 200


# ── Unit tests: HITL pause / resume ─────────────────────────────────────────

def _hitl_workflow() -> Workflow:
    """START → HITL → END"""
    return Workflow(
        name="HITL Pause",
        nodes=[
            WorkflowNode(id="s", type=NodeType.START, name="Start"),
            WorkflowNode(id="h", type=NodeType.HITL, name="Review",
                         config={"instructions": "Please review"}),
            WorkflowNode(id="e", type=NodeType.END, name="End"),
        ],
        edges=[
            WorkflowEdge(source="s", target="h"),
            WorkflowEdge(source="h", target="e"),
        ],
    )


def _pause_settings() -> SimulationSettings:
    return SimulationSettings(hitl_mode=HITLMode.PAUSE)


def test_hitl_pause_returns_paused_status():
    trace = simulate(_hitl_workflow(), {}, _pause_settings())
    assert trace.status == "paused"


def test_hitl_pause_step_has_waiting_status():
    trace = simulate(_hitl_workflow(), {}, _pause_settings())
    hitl_step = next(s for s in trace.steps if s.node_type == "HITL")
    assert hitl_step.status.value == "waiting"
    assert hitl_step.output is None  # decision not yet made


def test_hitl_pause_trace_stored():
    _paused_store.clear()
    trace = simulate(_hitl_workflow(), {}, _pause_settings())
    assert trace.trace_id in _paused_store


def test_hitl_pause_end_node_not_yet_executed():
    trace = simulate(_hitl_workflow(), {}, _pause_settings())
    executed_types = [s.node_type for s in trace.steps]
    assert "END" not in executed_types


def test_hitl_resume_approve_completes_trace():
    _paused_store.clear()
    paused_trace = simulate(_hitl_workflow(), {}, _pause_settings())
    hitl_step = next(s for s in paused_trace.steps if s.node_type == "HITL")
    completed = resume_simulation(paused_trace.trace_id, hitl_step.node_id, "approve")
    assert completed.status == "complete"


def test_hitl_resume_reject_completes_trace():
    _paused_store.clear()
    paused_trace = simulate(_hitl_workflow(), {}, _pause_settings())
    hitl_step = next(s for s in paused_trace.steps if s.node_type == "HITL")
    completed = resume_simulation(paused_trace.trace_id, hitl_step.node_id, "reject")
    assert completed.status == "complete"


def test_hitl_resume_approve_sets_approved_true():
    _paused_store.clear()
    paused_trace = simulate(_hitl_workflow(), {}, _pause_settings())
    hitl_step = next(s for s in paused_trace.steps if s.node_type == "HITL")
    completed = resume_simulation(paused_trace.trace_id, hitl_step.node_id, "approve")
    resolved_hitl = next(s for s in completed.steps if s.node_type == "HITL")
    assert resolved_hitl.output["approved"] is True
    assert resolved_hitl.output["decision"] == "approve"


def test_hitl_resume_reject_sets_approved_false():
    _paused_store.clear()
    paused_trace = simulate(_hitl_workflow(), {}, _pause_settings())
    hitl_step = next(s for s in paused_trace.steps if s.node_type == "HITL")
    completed = resume_simulation(paused_trace.trace_id, hitl_step.node_id, "reject")
    resolved_hitl = next(s for s in completed.steps if s.node_type == "HITL")
    assert resolved_hitl.output["approved"] is False
    assert resolved_hitl.output["decision"] == "reject"


def test_hitl_resume_executes_all_remaining_nodes():
    _paused_store.clear()
    paused_trace = simulate(_hitl_workflow(), {}, _pause_settings())
    hitl_step = next(s for s in paused_trace.steps if s.node_type == "HITL")
    completed = resume_simulation(paused_trace.trace_id, hitl_step.node_id, "approve")
    node_types = [s.node_type for s in completed.steps]
    assert node_types == ["START", "HITL", "END"]


def test_hitl_resume_removed_from_store_after_resume():
    _paused_store.clear()
    paused_trace = simulate(_hitl_workflow(), {}, _pause_settings())
    trace_id = paused_trace.trace_id
    hitl_step = next(s for s in paused_trace.steps if s.node_type == "HITL")
    resume_simulation(trace_id, hitl_step.node_id, "approve")
    assert trace_id not in _paused_store


def test_hitl_resume_unknown_trace_id_raises():
    with pytest.raises(SimulationError, match="No paused simulation"):
        resume_simulation("nonexistent-id", "h", "approve")


def test_hitl_resume_wrong_node_id_raises():
    _paused_store.clear()
    paused_trace = simulate(_hitl_workflow(), {}, _pause_settings())
    with pytest.raises(SimulationError, match="not the paused HITL node"):
        resume_simulation(paused_trace.trace_id, "wrong-node", "approve")


def test_hitl_auto_approve_still_works_unaffected():
    """Ensure auto-approve path from Task 21 still passes after refactor."""
    trace = simulate(_hitl_workflow(), {}, _default_settings())
    assert trace.status == "complete"
    hitl_step = next(s for s in trace.steps if s.node_type == "HITL")
    assert hitl_step.output["approved"] is True


# ── API tests: POST /api/workflows/simulate/resume ───────────────────────────

def _hitl_payload(hitl_mode: str = "pause") -> dict:
    return {
        "workflow": {
            "version": "1.0",
            "id": "hitl-api-test",
            "name": "HITL API",
            "description": "",
            "nodes": [
                {"id": "s", "type": "START", "name": "Start",  "position": {"x": 0, "y": 0}, "config": {}},
                {"id": "h", "type": "HITL",  "name": "Review", "position": {"x": 0, "y": 1}, "config": {"instructions": "Check it"}},
                {"id": "e", "type": "END",   "name": "End",    "position": {"x": 0, "y": 2}, "config": {}},
            ],
            "edges": [
                {"source": "s", "target": "h"},
                {"source": "h", "target": "e"},
            ],
            "metadata": {},
        },
        "input": {},
        "settings": {"hitl_mode": hitl_mode},
    }


@pytest.mark.asyncio
async def test_api_hitl_pause_returns_paused():
    async with AsyncClient(transport=_transport(), base_url=BASE) as client:
        res = await client.post("/api/workflows/simulate", json=_hitl_payload("pause"))
    assert res.status_code == 200
    data = res.json()
    assert data["trace"]["status"] == "paused"
    hitl_steps = [s for s in data["trace"]["steps"] if s["node_type"] == "HITL"]
    assert hitl_steps[0]["status"] == "waiting"


@pytest.mark.asyncio
async def test_api_hitl_resume_approve_completes():
    async with AsyncClient(transport=_transport(), base_url=BASE) as client:
        sim_res = await client.post("/api/workflows/simulate", json=_hitl_payload("pause"))
    trace = sim_res.json()["trace"]
    trace_id = trace["trace_id"]
    hitl_node_id = next(s["node_id"] for s in trace["steps"] if s["node_type"] == "HITL")

    async with AsyncClient(transport=_transport(), base_url=BASE) as client:
        resume_res = await client.post(
            "/api/workflows/simulate/resume",
            json={"trace_id": trace_id, "node_id": hitl_node_id, "decision": "approve"},
        )
    assert resume_res.status_code == 200
    completed = resume_res.json()["trace"]
    assert completed["status"] == "complete"
    hitl_step = next(s for s in completed["steps"] if s["node_type"] == "HITL")
    assert hitl_step["output"]["approved"] is True


@pytest.mark.asyncio
async def test_api_hitl_resume_reject_completes():
    async with AsyncClient(transport=_transport(), base_url=BASE) as client:
        sim_res = await client.post("/api/workflows/simulate", json=_hitl_payload("pause"))
    trace = sim_res.json()["trace"]
    trace_id = trace["trace_id"]
    hitl_node_id = next(s["node_id"] for s in trace["steps"] if s["node_type"] == "HITL")

    async with AsyncClient(transport=_transport(), base_url=BASE) as client:
        resume_res = await client.post(
            "/api/workflows/simulate/resume",
            json={"trace_id": trace_id, "node_id": hitl_node_id, "decision": "reject"},
        )
    assert resume_res.status_code == 200
    completed = resume_res.json()["trace"]
    hitl_step = next(s for s in completed["steps"] if s["node_type"] == "HITL")
    assert hitl_step["output"]["approved"] is False


@pytest.mark.asyncio
async def test_api_resume_unknown_trace_returns_404():
    async with AsyncClient(transport=_transport(), base_url=BASE) as client:
        res = await client.post(
            "/api/workflows/simulate/resume",
            json={"trace_id": "no-such-id", "node_id": "h", "decision": "approve"},
        )
    assert res.status_code == 404


# ── Unit tests: mock_evaluate ────────────────────────────────────────────────

def test_mock_evaluate_returns_evaluation_model():
    trace = simulate(_minimal(), {}, _default_settings())
    result = mock_evaluate(_minimal(), trace)
    assert result.score >= 1
    assert result.score <= 10
    assert isinstance(result.summary, str) and result.summary
    assert isinstance(result.strengths, list)
    assert isinstance(result.issues, list)
    assert isinstance(result.recommendations, list)


def test_mock_evaluate_score_in_range():
    trace = simulate(_linear(), {}, _default_settings())
    result = mock_evaluate(_linear(), trace)
    assert 1 <= result.score <= 10


def test_mock_evaluate_mentions_workflow_name():
    trace = simulate(_minimal(), {}, _default_settings())
    result = mock_evaluate(_minimal(), trace)
    assert _minimal().name in result.summary


def test_mock_evaluate_hitl_in_strengths_when_present():
    wf = Workflow(
        name="HITL Wf",
        nodes=[
            WorkflowNode(id="s", type=NodeType.START, name="Start"),
            WorkflowNode(id="h", type=NodeType.HITL, name="Review",
                         config={"instructions": "review"}),
            WorkflowNode(id="e", type=NodeType.END, name="End"),
        ],
        edges=[WorkflowEdge(source="s", target="h"), WorkflowEdge(source="h", target="e")],
    )
    trace = simulate(wf, {}, _default_settings())
    result = mock_evaluate(wf, trace)
    assert any("human" in s.lower() or "hitl" in s.lower() for s in result.strengths)


def test_mock_evaluate_condition_in_strengths_when_present():
    trace = simulate(_branching(), {}, _default_settings())
    result = mock_evaluate(_branching(), trace)
    assert any("condition" in s.lower() or "branch" in s.lower() for s in result.strengths)


def test_mock_evaluate_no_error_handling_flagged_in_issues():
    # _minimal() has no CONDITION node
    trace = simulate(_minimal(), {}, _default_settings())
    result = mock_evaluate(_minimal(), trace)
    all_text = " ".join(result.issues).lower()
    assert "error" in all_text or "condition" in all_text or "handling" in all_text


# ── Unit tests: llm_evaluate ─────────────────────────────────────────────────

class _MockLLMProvider(LLMProvider):
    def __init__(self, response: dict):
        self._response = response

    async def generate_workflow(self, description: str) -> dict:
        raise NotImplementedError

    async def complete_json(self, system: str, user: str) -> dict:
        return dict(self._response)


class _FailingLLMProvider(LLMProvider):
    async def generate_workflow(self, description: str) -> dict:
        raise NotImplementedError

    async def complete_json(self, system: str, user: str) -> dict:
        raise ConnectionError("Provider unreachable")


@pytest.mark.asyncio
async def test_llm_evaluate_parses_provider_response():
    provider = _MockLLMProvider({
        "score": 8,
        "summary": "Good workflow.",
        "strengths": ["Clear structure"],
        "issues": ["No error handling"],
        "recommendations": ["Add CONDITION nodes"],
    })
    trace = simulate(_linear(), {}, _default_settings())
    result = await llm_evaluate(_linear(), trace, provider)
    assert result.score == 8
    assert result.summary == "Good workflow."
    assert result.strengths == ["Clear structure"]
    assert result.issues == ["No error handling"]
    assert result.recommendations == ["Add CONDITION nodes"]


@pytest.mark.asyncio
async def test_llm_evaluate_clamps_score_to_range():
    provider = _MockLLMProvider({"score": 99, "summary": "x", "strengths": [], "issues": [], "recommendations": []})
    trace = simulate(_minimal(), {}, _default_settings())
    result = await llm_evaluate(_minimal(), trace, provider)
    assert result.score == 10


@pytest.mark.asyncio
async def test_llm_evaluate_raises_on_provider_failure():
    trace = simulate(_minimal(), {}, _default_settings())
    with pytest.raises(EvaluationError, match="LLM evaluation call failed"):
        await llm_evaluate(_minimal(), trace, _FailingLLMProvider())


@pytest.mark.asyncio
async def test_llm_evaluate_prompt_contains_workflow_name():
    captured: list[str] = []

    class _CapturingProvider(LLMProvider):
        async def generate_workflow(self, description: str) -> dict:
            raise NotImplementedError

        async def complete_json(self, system: str, user: str) -> dict:
            captured.append(user)
            return {"score": 5, "summary": "ok", "strengths": [], "issues": [], "recommendations": []}

    trace = simulate(_linear(), {}, _default_settings())
    await llm_evaluate(_linear(), trace, _CapturingProvider())
    assert _linear().name in captured[0]


# ── Integration: evaluate=True in simulate endpoint ──────────────────────────

def _sim_payload(evaluate: bool = False) -> dict:
    return {
        "workflow": {
            "version": "1.0",
            "id": "eval-test",
            "name": "Eval Test",
            "description": "A test workflow for evaluation",
            "nodes": [
                {"id": "s", "type": "START", "name": "Start", "position": {"x": 0, "y": 0}, "config": {}},
                {"id": "l", "type": "LLM",   "name": "Chat",  "position": {"x": 0, "y": 1}, "config": {"prompt": "Say hi"}},
                {"id": "e", "type": "END",   "name": "End",   "position": {"x": 0, "y": 2}, "config": {}},
            ],
            "edges": [{"source": "s", "target": "l"}, {"source": "l", "target": "e"}],
            "metadata": {},
        },
        "input": {},
        "settings": {"evaluate": evaluate},
    }


@pytest.mark.asyncio
async def test_api_evaluate_false_returns_null_evaluation():
    async with AsyncClient(transport=_transport(), base_url=BASE) as client:
        res = await client.post("/api/workflows/simulate", json=_sim_payload(evaluate=False))
    assert res.status_code == 200
    assert res.json()["evaluation"] is None


@pytest.mark.asyncio
async def test_api_evaluate_true_returns_evaluation():
    async with AsyncClient(transport=_transport(), base_url=BASE) as client:
        res = await client.post("/api/workflows/simulate", json=_sim_payload(evaluate=True))
    assert res.status_code == 200
    data = res.json()
    assert data["evaluation"] is not None
    ev = data["evaluation"]
    assert 1 <= ev["score"] <= 10
    assert isinstance(ev["summary"], str) and ev["summary"]
    assert isinstance(ev["strengths"], list)
    assert isinstance(ev["issues"], list)
    assert isinstance(ev["recommendations"], list)


@pytest.mark.asyncio
async def test_api_evaluate_skipped_when_trace_paused():
    """evaluate=True should not produce evaluation when trace is paused."""
    payload = {
        "workflow": {
            "version": "1.0",
            "id": "eval-pause",
            "name": "Eval Pause",
            "description": "",
            "nodes": [
                {"id": "s", "type": "START", "name": "Start",  "position": {"x": 0, "y": 0}, "config": {}},
                {"id": "h", "type": "HITL",  "name": "Review", "position": {"x": 0, "y": 1}, "config": {"instructions": "check"}},
                {"id": "e", "type": "END",   "name": "End",    "position": {"x": 0, "y": 2}, "config": {}},
            ],
            "edges": [{"source": "s", "target": "h"}, {"source": "h", "target": "e"}],
            "metadata": {},
        },
        "input": {},
        "settings": {"hitl_mode": "pause", "evaluate": True},
    }
    async with AsyncClient(transport=_transport(), base_url=BASE) as client:
        res = await client.post("/api/workflows/simulate", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["trace"]["status"] == "paused"
    assert data["evaluation"] is None
