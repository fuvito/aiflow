import pytest
from unittest.mock import AsyncMock, patch
from app.services.workflow_generator import generate_workflow, WorkflowGenerationError
from app.providers.base import LLMProvider
from app.models.workflow import NodeType


class MockProvider(LLMProvider):
    def __init__(self, response: dict):
        self._response = response

    async def generate_workflow(self, description: str) -> dict:
        return dict(self._response)


def _valid_raw() -> dict:
    return {
        "version": "1.0",
        "id": "test-id",
        "name": "Test Workflow",
        "description": "A test workflow",
        "nodes": [
            {"id": "start", "type": "START", "name": "Start", "position": {"x": 300, "y": 100}, "config": {}},
            {"id": "llm-1", "type": "LLM", "name": "Process", "position": {"x": 300, "y": 260},
             "config": {"prompt": "Process the input", "temperature": 0}},
            {"id": "end", "type": "END", "name": "End", "position": {"x": 300, "y": 420}, "config": {}},
        ],
        "edges": [
            {"source": "start", "target": "llm-1"},
            {"source": "llm-1", "target": "end"},
        ],
        "metadata": {},
    }


# ── Happy path ──────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_generate_returns_workflow():
    provider = MockProvider(_valid_raw())
    wf = await generate_workflow("process the input", provider)
    assert wf.name == "Test Workflow"
    assert len(wf.nodes) == 3
    assert wf.nodes[0].type == NodeType.START


@pytest.mark.asyncio
async def test_generate_fills_missing_id():
    raw = _valid_raw()
    del raw["id"]
    provider = MockProvider(raw)
    wf = await generate_workflow("test", provider)
    assert wf.id  # auto-generated


@pytest.mark.asyncio
async def test_generate_fills_missing_version():
    raw = _valid_raw()
    del raw["version"]
    provider = MockProvider(raw)
    wf = await generate_workflow("test", provider)
    assert wf.version == "1.0"


# ── Validation failures ─────────────────────────────────────────────

@pytest.mark.asyncio
async def test_generate_raises_on_missing_start():
    raw = _valid_raw()
    raw["nodes"] = [n for n in raw["nodes"] if n["type"] != "START"]
    # Also fix edges
    raw["edges"] = [e for e in raw["edges"] if e["source"] != "start"]
    provider = MockProvider(raw)
    with pytest.raises(WorkflowGenerationError, match="validation"):
        await generate_workflow("test", provider)


@pytest.mark.asyncio
async def test_generate_raises_on_invalid_node_type():
    raw = _valid_raw()
    raw["nodes"][1]["type"] = "BOGUS"
    provider = MockProvider(raw)
    with pytest.raises(WorkflowGenerationError):
        await generate_workflow("test", provider)


# ── Provider failure ────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_generate_raises_on_provider_error():
    class FailingProvider(LLMProvider):
        async def generate_workflow(self, description: str) -> dict:
            raise ConnectionError("API unreachable")

    with pytest.raises(WorkflowGenerationError, match="LLM call failed"):
        await generate_workflow("test", FailingProvider())
