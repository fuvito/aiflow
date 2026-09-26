import pytest
from unittest.mock import AsyncMock, patch
from app.services.workflow_generator import (
    generate_workflow,
    chat_workflow_service,
    _parse_workflow_from_raw,
    WorkflowGenerationError,
)
from app.providers.base import LLMProvider
from app.models.workflow import NodeType
from app.schemas.requests import ChatMessage


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


# ── _parse_workflow_from_raw ─────────────────────────────────────────

def test_parse_workflow_from_raw_valid():
    raw = _valid_raw()
    wf = _parse_workflow_from_raw(raw, {"input": "test"})
    assert wf is not None
    assert wf.metadata.get("sample_input") == {"input": "test"}


def test_parse_workflow_from_raw_returns_none_for_invalid():
    # Missing required nodes → validation fails → returns None
    raw = _valid_raw()
    raw["nodes"] = []  # no START/END → invalid
    raw["edges"] = []
    result = _parse_workflow_from_raw(raw, None)
    assert result is None


# ── chat_workflow_service ────────────────────────────────────────────

class ChatMockProvider(LLMProvider):
    def __init__(self, response: dict):
        self._response = response

    async def generate_workflow(self, description: str) -> dict:  # required by ABC
        return {}

    async def chat_workflow(self, messages: list, current_workflow) -> dict:
        return dict(self._response)


@pytest.mark.asyncio
async def test_chat_service_returns_gathering_status():
    provider = ChatMockProvider({"status": "gathering", "reply": "Tell me more about the workflow."})
    msgs = [ChatMessage(role="user", content="I want a support bot")]
    result = await chat_workflow_service(msgs, None, provider)
    assert result.status == "gathering"
    assert "Tell me more" in result.reply
    assert result.workflow is None


@pytest.mark.asyncio
async def test_chat_service_returns_ready_with_valid_workflow():
    provider = ChatMockProvider({
        "status": "ready",
        "reply": "Here is your workflow.",
        "workflow": _valid_raw(),
        "sample_input": {"message": "hello"},
    })
    msgs = [ChatMessage(role="user", content="Support workflow")]
    result = await chat_workflow_service(msgs, None, provider)
    assert result.status == "ready"
    assert result.workflow is not None
    assert result.workflow.name == "Test Workflow"


@pytest.mark.asyncio
async def test_chat_service_falls_back_to_gathering_on_invalid_workflow():
    provider = ChatMockProvider({
        "status": "ready",
        "reply": "Here you go.",
        "workflow": {"nodes": [], "edges": []},  # fails validation
    })
    msgs = [ChatMessage(role="user", content="Support workflow")]
    result = await chat_workflow_service(msgs, None, provider)
    assert result.status == "gathering"
    assert result.workflow is None
    assert "snag" in result.reply


@pytest.mark.asyncio
async def test_chat_service_raises_on_provider_error():
    class FailingChatProvider(LLMProvider):
        async def generate_workflow(self, description: str) -> dict:
            return {}

        async def chat_workflow(self, messages: list, current_workflow) -> dict:
            raise RuntimeError("LLM unavailable")

    msgs = [ChatMessage(role="user", content="test")]
    with pytest.raises(WorkflowGenerationError, match="LLM call failed"):
        await chat_workflow_service(msgs, None, FailingChatProvider())
