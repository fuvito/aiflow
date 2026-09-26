import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.api.deps import get_current_user, require_approved
from app.providers.base import LLMProvider
from tests.conftest import DEMO_USER

BASE = "http://test"

# All workflow routes require an authenticated approved user.
# The override_approved_user fixture (from conftest.py) satisfies that.
pytestmark = pytest.mark.usefixtures("override_approved_user")


def _transport():
    return ASGITransport(app=app)


def _valid_workflow_dict() -> dict:
    return {
        "version": "1.0",
        "id": "api-test-id",
        "name": "API Test Workflow",
        "description": "",
        "nodes": [
            {"id": "start", "type": "START", "name": "Start", "position": {"x": 300, "y": 100}, "config": {}},
            {"id": "end",   "type": "END",   "name": "End",   "position": {"x": 300, "y": 260}, "config": {}},
        ],
        "edges": [{"source": "start", "target": "end"}],
        "metadata": {},
    }


# ── Health ──────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_health():
    async with AsyncClient(transport=_transport(), base_url=BASE) as client:
        res = await client.get("/api/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


# ── Validate: valid workflow ────────────────────────────────────────

@pytest.mark.asyncio
async def test_validate_valid_workflow():
    async with AsyncClient(transport=_transport(), base_url=BASE) as client:
        res = await client.post("/api/workflows/validate", json={"workflow": _valid_workflow_dict()})
    assert res.status_code == 200
    body = res.json()
    assert body["valid"] is True
    assert body["errors"] == []


# ── Validate: missing START ─────────────────────────────────────────

@pytest.mark.asyncio
async def test_validate_missing_start():
    wf = _valid_workflow_dict()
    wf["nodes"] = [n for n in wf["nodes"] if n["type"] != "START"]
    wf["edges"] = []
    async with AsyncClient(transport=_transport(), base_url=BASE) as client:
        res = await client.post("/api/workflows/validate", json={"workflow": wf})
    assert res.status_code == 200
    body = res.json()
    assert body["valid"] is False
    assert any("START" in e for e in body["errors"])


# ── Validate: duplicate node IDs ────────────────────────────────────

@pytest.mark.asyncio
async def test_validate_duplicate_ids():
    wf = _valid_workflow_dict()
    wf["nodes"].append(
        {"id": "start", "type": "LLM", "name": "Dupe", "position": {"x": 0, "y": 0}, "config": {}}
    )
    async with AsyncClient(transport=_transport(), base_url=BASE) as client:
        res = await client.post("/api/workflows/validate", json={"workflow": wf})
    body = res.json()
    assert body["valid"] is False
    assert any("Duplicate" in e for e in body["errors"])


# ── Validate: unknown node type ─────────────────────────────────────

@pytest.mark.asyncio
async def test_validate_unknown_node_type():
    wf = _valid_workflow_dict()
    wf["nodes"][0]["type"] = "BOGUS"
    async with AsyncClient(transport=_transport(), base_url=BASE) as client:
        res = await client.post("/api/workflows/validate", json={"workflow": wf})
    assert res.status_code == 422  # Pydantic rejects unknown NodeType


# ── Generate: no API key → 503 ─────────────────────────────────────

@pytest.mark.asyncio
async def test_generate_no_api_key_returns_503():
    with patch("app.api.routes.get_provider", side_effect=RuntimeError("LLM_API_KEY is not set")):
        async with AsyncClient(transport=_transport(), base_url=BASE) as client:
            res = await client.post("/api/workflows/generate", json={"description": "test"})
    assert res.status_code == 503
    assert "LLM_API_KEY" in res.json()["detail"]


# ── Generate: mock provider → 200 ──────────────────────────────────

@pytest.mark.asyncio
async def test_generate_success_with_mock_provider():
    class _MockProvider(LLMProvider):
        async def generate_workflow(self, description: str) -> dict:
            return _valid_workflow_dict()

    with patch("app.api.routes.get_provider", return_value=_MockProvider()):
        async with AsyncClient(transport=_transport(), base_url=BASE) as client:
            res = await client.post(
                "/api/workflows/generate",
                json={"description": "simple test workflow"},
            )
    assert res.status_code == 200
    body = res.json()
    assert "workflow" in body
    assert body["workflow"]["name"] == "API Test Workflow"


# ── Generate: invalid LLM output → 422 ─────────────────────────────

@pytest.mark.asyncio
async def test_generate_invalid_llm_output_returns_422():
    class _BadProvider(LLMProvider):
        async def generate_workflow(self, description: str) -> dict:
            return {"garbage": True}  # missing nodes, edges, etc.

    with patch("app.api.routes.get_provider", return_value=_BadProvider()):
        async with AsyncClient(transport=_transport(), base_url=BASE) as client:
            res = await client.post(
                "/api/workflows/generate",
                json={"description": "test"},
            )
    assert res.status_code == 422


# ── Chat: no API key → 503 ──────────────────────────────────────────

@pytest.mark.asyncio
async def test_chat_no_api_key_returns_503():
    with patch("app.api.routes.get_provider", side_effect=RuntimeError("LLM_API_KEY is not set")):
        async with AsyncClient(transport=_transport(), base_url=BASE) as client:
            res = await client.post(
                "/api/workflows/chat",
                json={"messages": [{"role": "user", "content": "I want a support workflow"}]},
            )
    assert res.status_code == 503
    assert "LLM_API_KEY" in res.json()["detail"]


# ── Chat: mock provider gathering → 200 ────────────────────────────

@pytest.mark.asyncio
async def test_chat_gathering_response():
    class _GatheringProvider(LLMProvider):
        async def generate_workflow(self, description: str) -> dict:
            return {}

        async def chat_workflow(self, messages, current_workflow) -> dict:
            return {"status": "gathering", "reply": "Tell me more."}

    with patch("app.api.routes.get_provider", return_value=_GatheringProvider()):
        async with AsyncClient(transport=_transport(), base_url=BASE) as client:
            res = await client.post(
                "/api/workflows/chat",
                json={"messages": [{"role": "user", "content": "I want a workflow"}]},
            )
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "gathering"
    assert body["workflow"] is None


# ── Usage limits → 429 ─────────────────────────────────────────────

@pytest.mark.asyncio
async def test_generate_returns_429_when_llm_limit_exceeded():
    # Use a demo user (has finite limits) and stub usage at the limit.
    app.dependency_overrides[get_current_user] = lambda: DEMO_USER
    app.dependency_overrides[require_approved] = lambda: DEMO_USER
    try:
        with patch(
            "app.api.routes.get_usage_today",
            new_callable=AsyncMock,
            return_value={"llm_requests": 9999, "executions": 0},
        ):
            async with AsyncClient(transport=_transport(), base_url=BASE) as client:
                res = await client.post("/api/workflows/generate", json={"description": "test"})
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(require_approved, None)

    assert res.status_code == 429
    assert "limit" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_simulate_returns_429_when_execution_limit_exceeded():
    app.dependency_overrides[get_current_user] = lambda: DEMO_USER
    app.dependency_overrides[require_approved] = lambda: DEMO_USER
    try:
        with patch(
            "app.api.routes.get_usage_today",
            new_callable=AsyncMock,
            return_value={"llm_requests": 0, "executions": 9999},
        ):
            async with AsyncClient(transport=_transport(), base_url=BASE) as client:
                res = await client.post(
                    "/api/workflows/simulate",
                    json={
                        "workflow": _valid_workflow_dict(),
                        "input": {},
                    },
                )
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(require_approved, None)

    assert res.status_code == 429
    assert "limit" in res.json()["detail"].lower()
