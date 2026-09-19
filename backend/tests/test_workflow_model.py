import json
import pytest
from app.models.workflow import Workflow, WorkflowNode, WorkflowEdge, NodeType, Position
from app.services.validator import validate_workflow


def make_simple_workflow() -> Workflow:
    return Workflow(
        name="Test Workflow",
        nodes=[
            WorkflowNode(id="start", type=NodeType.START, name="Start"),
            WorkflowNode(id="end", type=NodeType.END, name="End"),
        ],
        edges=[WorkflowEdge(source="start", target="end")],
    )


# ── Model construction ──────────────────────────────────────────────────────

def test_workflow_has_defaults():
    wf = Workflow()
    assert wf.version == "1.0"
    assert wf.name == "Untitled Workflow"
    assert wf.nodes == []
    assert wf.edges == []


def test_node_type_enum_values():
    assert NodeType.LLM == "LLM"
    assert NodeType.CONDITION == "CONDITION"
    assert len(NodeType) == 10


def test_position_defaults():
    pos = Position()
    assert pos.x == 0.0
    assert pos.y == 0.0


# ── JSON serialization round-trip ───────────────────────────────────────────

def test_workflow_json_round_trip():
    wf = make_simple_workflow()
    json_str = wf.model_dump_json()
    loaded = Workflow.model_validate_json(json_str)
    assert loaded.name == wf.name
    assert len(loaded.nodes) == 2
    assert loaded.nodes[0].type == NodeType.START
    assert loaded.edges[0].source == "start"


def test_workflow_dict_round_trip():
    wf = make_simple_workflow()
    data = wf.model_dump()
    loaded = Workflow.model_validate(data)
    assert loaded.id == wf.id


# ── Validation: valid workflow ──────────────────────────────────────────────

def test_valid_workflow_passes():
    result = validate_workflow(make_simple_workflow())
    assert result.valid is True
    assert result.errors == []


# ── Validation: missing START ───────────────────────────────────────────────

def test_missing_start_node():
    wf = Workflow(
        nodes=[WorkflowNode(id="end", type=NodeType.END, name="End")],
        edges=[],
    )
    result = validate_workflow(wf)
    assert result.valid is False
    assert any("START" in e for e in result.errors)


# ── Validation: multiple START nodes ───────────────────────────────────────

def test_multiple_start_nodes():
    wf = Workflow(
        nodes=[
            WorkflowNode(id="s1", type=NodeType.START, name="Start 1"),
            WorkflowNode(id="s2", type=NodeType.START, name="Start 2"),
            WorkflowNode(id="end", type=NodeType.END, name="End"),
        ],
        edges=[],
    )
    result = validate_workflow(wf)
    assert result.valid is False
    assert any("2 START" in e for e in result.errors)


# ── Validation: missing END ─────────────────────────────────────────────────

def test_missing_end_node():
    wf = Workflow(
        nodes=[WorkflowNode(id="start", type=NodeType.START, name="Start")],
        edges=[],
    )
    result = validate_workflow(wf)
    assert result.valid is False
    assert any("END" in e for e in result.errors)


# ── Validation: duplicate node IDs ─────────────────────────────────────────

def test_duplicate_node_ids():
    wf = Workflow(
        nodes=[
            WorkflowNode(id="start", type=NodeType.START, name="Start"),
            WorkflowNode(id="start", type=NodeType.END, name="End"),
        ],
        edges=[],
    )
    result = validate_workflow(wf)
    assert result.valid is False
    assert any("Duplicate" in e for e in result.errors)


# ── Validation: invalid edge references ────────────────────────────────────

def test_edge_references_nonexistent_node():
    wf = Workflow(
        nodes=[
            WorkflowNode(id="start", type=NodeType.START, name="Start"),
            WorkflowNode(id="end", type=NodeType.END, name="End"),
        ],
        edges=[WorkflowEdge(source="start", target="ghost")],
    )
    result = validate_workflow(wf)
    assert result.valid is False
    assert any("ghost" in e for e in result.errors)


# ── Validation: disconnected node warning ───────────────────────────────────

def test_disconnected_node_warning():
    wf = Workflow(
        nodes=[
            WorkflowNode(id="start", type=NodeType.START, name="Start"),
            WorkflowNode(id="end", type=NodeType.END, name="End"),
            WorkflowNode(id="orphan", type=NodeType.LLM, name="Orphan LLM"),
        ],
        edges=[WorkflowEdge(source="start", target="end")],
    )
    result = validate_workflow(wf)
    assert result.valid is True  # warning only
    assert any("orphan" in w for w in result.warnings)


# ── Validation: missing required config (warning) ───────────────────────────

def test_missing_llm_config_warns():
    wf = Workflow(
        nodes=[
            WorkflowNode(id="start", type=NodeType.START, name="Start"),
            WorkflowNode(id="llm", type=NodeType.LLM, name="LLM Node", config={}),
            WorkflowNode(id="end", type=NodeType.END, name="End"),
        ],
        edges=[
            WorkflowEdge(source="start", target="llm"),
            WorkflowEdge(source="llm", target="end"),
        ],
    )
    result = validate_workflow(wf)
    assert result.valid is True
    assert any("prompt" in w for w in result.warnings)
