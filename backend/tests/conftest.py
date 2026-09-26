"""
Shared pytest fixtures for AiFlow backend tests.

dependency_overrides let tests bypass real JWT/Supabase auth while still
exercising route logic.
"""
from datetime import datetime
from unittest.mock import AsyncMock, patch

import pytest
from app.api.deps import get_current_user, require_admin, require_approved
from app.main import app
from app.models.user import UserProfile


def _make_profile(**kwargs) -> UserProfile:
    defaults = dict(
        id="test-user-id",
        email="test@example.com",
        access_status="approved",
        role="user",
        must_change_password=False,
        created_at=datetime(2026, 1, 1),
        updated_at=datetime(2026, 1, 1),
    )
    return UserProfile(**{**defaults, **kwargs})


APPROVED_USER = _make_profile()
ADMIN_USER = _make_profile(id="admin-user-id", email="admin@example.com", role="admin")
PENDING_USER = _make_profile(id="pending-user-id", email="pending@example.com", access_status="pending")
DISABLED_USER = _make_profile(id="disabled-user-id", email="disabled@example.com", access_status="disabled")
DEMO_USER = _make_profile(id="demo-user-id", email="demo@example.com", role="demo", access_status="demo")

# Supabase usage stub returned by mocked get_usage_today
_ZERO_USAGE = {"executions": 0, "llm_requests": 0}


@pytest.fixture(autouse=False)
def override_approved_user():
    """Override auth deps and stub Supabase usage calls for an approved user."""
    app.dependency_overrides[get_current_user] = lambda: APPROVED_USER
    app.dependency_overrides[require_approved] = lambda: APPROVED_USER
    with patch("app.api.routes.get_usage_today", new_callable=AsyncMock, return_value=_ZERO_USAGE), \
         patch("app.api.routes.increment_usage", new_callable=AsyncMock):
        yield
    app.dependency_overrides.pop(get_current_user, None)
    app.dependency_overrides.pop(require_approved, None)


@pytest.fixture(autouse=False)
def override_admin_user():
    """Override auth deps and stub Supabase usage calls for an admin user."""
    app.dependency_overrides[get_current_user] = lambda: ADMIN_USER
    app.dependency_overrides[require_approved] = lambda: ADMIN_USER
    app.dependency_overrides[require_admin] = lambda: ADMIN_USER
    with patch("app.api.routes.get_usage_today", new_callable=AsyncMock, return_value=_ZERO_USAGE), \
         patch("app.api.routes.increment_usage", new_callable=AsyncMock):
        yield
    app.dependency_overrides.pop(get_current_user, None)
    app.dependency_overrides.pop(require_approved, None)
    app.dependency_overrides.pop(require_admin, None)
