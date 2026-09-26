"""
Integration tests for user and admin API routes.

Auth dependencies are overridden via conftest.py fixtures or inline overrides
so no real Supabase project is required.
"""
from contextlib import contextmanager
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.api.deps import get_current_user, require_admin, require_approved
from app.main import app
from tests.conftest import (
    ADMIN_USER,
    APPROVED_USER,
    DEMO_USER,
    DISABLED_USER,
    PENDING_USER,
)

BASE = "http://test"

_ZERO_USAGE = {"executions": 0, "llm_requests": 0}


def _transport():
    return ASGITransport(app=app)


# ── Helpers ────────────────────────────────────────────────────────────────

@contextmanager
def _as_user(profile):
    """Context manager: override all auth deps + stub Supabase usage for profile."""
    app.dependency_overrides[get_current_user] = lambda: profile
    app.dependency_overrides[require_approved] = lambda: profile
    app.dependency_overrides[require_admin] = lambda: profile
    with patch("app.api.routes.get_usage_today", new_callable=AsyncMock, return_value=_ZERO_USAGE), \
         patch("app.api.routes.increment_usage", new_callable=AsyncMock):
        yield
    app.dependency_overrides.pop(get_current_user, None)
    app.dependency_overrides.pop(require_approved, None)
    app.dependency_overrides.pop(require_admin, None)


def _clear_overrides():
    app.dependency_overrides.pop(get_current_user, None)
    app.dependency_overrides.pop(require_approved, None)
    app.dependency_overrides.pop(require_admin, None)


# ── Public: access requests ────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_submit_access_request_success():
    with patch("app.api.user_routes.insert_access_request", new_callable=AsyncMock) as mock_insert:
        mock_insert.return_value = None
        async with AsyncClient(transport=_transport(), base_url=BASE) as client:
            res = await client.post("/api/access-requests", json={
                "name": "Alice",
                "email": "alice@example.com",
                "linkedin_url": "https://linkedin.com/in/alice",
            })

    assert res.status_code == 201
    assert "received" in res.json()["message"].lower()
    mock_insert.assert_awaited_once()


@pytest.mark.asyncio
async def test_submit_access_request_missing_required_fields():
    async with AsyncClient(transport=_transport(), base_url=BASE) as client:
        res = await client.post("/api/access-requests", json={"name": "Bob"})
    assert res.status_code == 422


# ── GET /api/users/me ─────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_me_unauthenticated():
    _clear_overrides()
    async with AsyncClient(transport=_transport(), base_url=BASE) as client:
        res = await client.get("/api/users/me")
    assert res.status_code == 403  # HTTPBearer returns 403 when no token


@pytest.mark.asyncio
async def test_get_me_approved_user(override_approved_user):
    async with AsyncClient(transport=_transport(), base_url=BASE) as client:
        res = await client.get("/api/users/me")
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == APPROVED_USER.email
    assert data["access_status"] == "approved"


@pytest.mark.asyncio
async def test_get_me_as_demo_user():
    with _as_user(DEMO_USER):
        async with AsyncClient(transport=_transport(), base_url=BASE) as client:
            res = await client.get("/api/users/me")
    assert res.status_code == 200
    assert res.json()["role"] == "demo"


# ── GET /api/users/me/usage ───────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_usage_approved_user(override_approved_user):
    from app.core.config import settings

    with patch("app.api.user_routes.get_usage_today", new_callable=AsyncMock) as mock_usage:
        mock_usage.return_value = {"executions": 2, "llm_requests": 5}
        async with AsyncClient(transport=_transport(), base_url=BASE) as client:
            res = await client.get("/api/users/me/usage")

    assert res.status_code == 200
    data = res.json()
    assert data["executions"] == 2
    assert data["llm_requests"] == 5
    assert data["max_executions"] == settings.approved_max_executions_per_day
    assert data["max_llm_requests"] == settings.approved_max_llm_requests_per_day


@pytest.mark.asyncio
async def test_get_usage_demo_user():
    with _as_user(DEMO_USER):
        with patch("app.api.user_routes.get_usage_today", new_callable=AsyncMock) as mock_usage:
            mock_usage.return_value = {"executions": 3, "llm_requests": 8}
            async with AsyncClient(transport=_transport(), base_url=BASE) as client:
                res = await client.get("/api/users/me/usage")
    assert res.status_code == 200
    data = res.json()
    assert data["max_executions"] > 0
    assert data["max_llm_requests"] > 0


# ── POST /api/users/me/password-changed ───────────────────────────────────

@pytest.mark.asyncio
async def test_password_changed_clears_flag(override_approved_user):
    with patch("app.api.user_routes.update_user_profile", new_callable=AsyncMock), \
         patch("app.api.user_routes.invalidate_profile_cache"):
        async with AsyncClient(transport=_transport(), base_url=BASE) as client:
            res = await client.post("/api/users/me/password-changed")
    assert res.status_code == 204


# ── Admin routes: non-admin gets 403 ──────────────────────────────────────

@pytest.mark.asyncio
async def test_admin_list_users_requires_admin():
    # Set get_current_user to return an approved non-admin, but leave require_admin
    # as its real implementation so it correctly rejects the non-admin user.
    app.dependency_overrides[get_current_user] = lambda: APPROVED_USER
    app.dependency_overrides.pop(require_admin, None)
    try:
        async with AsyncClient(transport=_transport(), base_url=BASE) as client:
            res = await client.get("/api/admin/users")
    finally:
        app.dependency_overrides.pop(get_current_user, None)
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_admin_list_users_as_admin(override_admin_user):
    with patch("app.api.user_routes.get_all_users", new_callable=AsyncMock) as mock_users:
        mock_users.return_value = [APPROVED_USER.model_dump()]
        async with AsyncClient(transport=_transport(), base_url=BASE) as client:
            res = await client.get("/api/admin/users")
    assert res.status_code == 200
    assert isinstance(res.json(), list)


@pytest.mark.asyncio
async def test_admin_update_user_invalid_status(override_admin_user):
    async with AsyncClient(transport=_transport(), base_url=BASE) as client:
        res = await client.patch(
            "/api/admin/users/some-user-id",
            json={"access_status": "banana"},
        )
    assert res.status_code == 400


@pytest.mark.asyncio
async def test_admin_update_user_valid_status(override_admin_user):
    with patch("app.api.user_routes.update_user_profile", new_callable=AsyncMock), \
         patch("app.api.user_routes.invalidate_profile_cache"):
        async with AsyncClient(transport=_transport(), base_url=BASE) as client:
            res = await client.patch(
                "/api/admin/users/some-user-id",
                json={"access_status": "approved"},
            )
    assert res.status_code == 200


@pytest.mark.asyncio
async def test_admin_update_user_nothing_to_update(override_admin_user):
    async with AsyncClient(transport=_transport(), base_url=BASE) as client:
        res = await client.patch("/api/admin/users/some-user-id", json={})
    assert res.status_code == 400


@pytest.mark.asyncio
async def test_admin_list_access_requests(override_admin_user):
    with patch("app.api.user_routes.get_access_requests", new_callable=AsyncMock) as mock_req:
        mock_req.return_value = []
        async with AsyncClient(transport=_transport(), base_url=BASE) as client:
            res = await client.get("/api/admin/access-requests")
    assert res.status_code == 200
    assert res.json() == []


@pytest.mark.asyncio
async def test_admin_update_access_request_invalid_status(override_admin_user):
    async with AsyncClient(transport=_transport(), base_url=BASE) as client:
        res = await client.patch(
            "/api/admin/access-requests/req-123",
            json={"access_status": "invalid"},
        )
    assert res.status_code == 400


@pytest.mark.asyncio
async def test_admin_update_access_request_approve(override_admin_user):
    with patch("app.api.user_routes.update_access_request", new_callable=AsyncMock):
        async with AsyncClient(transport=_transport(), base_url=BASE) as client:
            res = await client.patch(
                "/api/admin/access-requests/req-123",
                json={"access_status": "approved"},
            )
    assert res.status_code == 200
