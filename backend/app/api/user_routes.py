from typing import Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr

from app.api.deps import AdminUser, CurrentUser
from app.core.config import settings
from app.core.supabase_client import (
    get_access_requests,
    get_all_users,
    get_usage_today,
    insert_access_request,
    invalidate_profile_cache,
    update_access_request,
    update_user_profile,
)
from app.models.user import AccessRequest, UsageToday, UserProfile

router = APIRouter(prefix="/api")


# ── Public: submit access request ──────────────────────────────────────────


class AccessRequestBody(BaseModel):
    name: str
    email: str
    linkedin_url: Optional[str] = None
    company: Optional[str] = None
    message: Optional[str] = None


@router.post("/access-requests", status_code=status.HTTP_201_CREATED)
async def submit_access_request(body: AccessRequestBody):
    await insert_access_request(body.model_dump(exclude_none=False))
    return {"message": "Request received. You will be notified when approved."}


# ── Authenticated: current user ─────────────────────────────────────────────


@router.get("/users/me", response_model=UserProfile)
async def get_me(user: CurrentUser):
    return user


@router.get("/users/me/usage", response_model=UsageToday)
async def get_my_usage(user: CurrentUser):
    raw = await get_usage_today(user.id)

    if user.role in ("demo",):
        max_exec = settings.demo_max_executions_per_day
        max_llm = settings.demo_max_llm_requests_per_day
    else:
        max_exec = settings.approved_max_executions_per_day
        max_llm = settings.approved_max_llm_requests_per_day

    return UsageToday(
        executions=raw.get("executions", 0),
        llm_requests=raw.get("llm_requests", 0),
        max_executions=max_exec,
        max_llm_requests=max_llm,
    )


@router.post("/users/me/password-changed", status_code=status.HTTP_204_NO_CONTENT)
async def mark_password_changed(user: CurrentUser):
    """Called by the frontend after a successful forced password change."""
    await update_user_profile(user.id, {"must_change_password": False})
    invalidate_profile_cache(user.id)


# ── Admin: user management ──────────────────────────────────────────────────


@router.get("/admin/users")
async def list_users(admin: AdminUser):
    return await get_all_users()


class UpdateUserBody(BaseModel):
    access_status: Optional[str] = None
    role: Optional[str] = None
    must_change_password: Optional[bool] = None


@router.patch("/admin/users/{user_id}")
async def update_user(user_id: str, body: UpdateUserBody, admin: AdminUser):
    patch: dict = {}
    if body.access_status is not None:
        allowed = {"pending", "approved", "demo", "disabled"}
        if body.access_status not in allowed:
            raise HTTPException(status_code=400, detail=f"access_status must be one of {allowed}")
        patch["access_status"] = body.access_status
    if body.role is not None:
        allowed_roles = {"user", "demo", "admin"}
        if body.role not in allowed_roles:
            raise HTTPException(status_code=400, detail=f"role must be one of {allowed_roles}")
        patch["role"] = body.role
    if body.must_change_password is not None:
        patch["must_change_password"] = body.must_change_password
    if not patch:
        raise HTTPException(status_code=400, detail="Nothing to update.")

    await update_user_profile(user_id, patch)
    invalidate_profile_cache(user_id)
    return {"message": "User updated."}


@router.get("/admin/access-requests")
async def list_access_requests(status_filter: Optional[str] = None, admin: AdminUser = None):
    return await get_access_requests(status=status_filter)


@router.patch("/admin/access-requests/{request_id}")
async def update_access_request_status(
    request_id: str,
    body: UpdateUserBody,
    admin: AdminUser,
):
    if body.access_status not in ("pending", "approved", "rejected", None):
        raise HTTPException(status_code=400, detail="Invalid status.")
    if body.access_status:
        await update_access_request(request_id, {"status": body.access_status})
    return {"message": "Request updated."}
