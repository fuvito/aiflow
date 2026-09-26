"""
FastAPI dependency functions for authentication and authorization.
"""
import logging
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.auth import AuthError, verify_jwt
from app.core.supabase_client import get_user_profile, update_user_profile
from app.models.user import UserProfile

logger = logging.getLogger(__name__)
_bearer = HTTPBearer()


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(_bearer)],
) -> UserProfile:
    """Verify JWT and return the authenticated user's profile."""
    try:
        payload = verify_jwt(credentials.credentials)
    except AuthError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc))

    user_id: str = payload.get("sub", "")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    profile = await get_user_profile(user_id)
    if profile is None:
        logger.warning("403 profile-not-found  user_id=%s", user_id)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User profile not found. Contact the owner to request access.",
        )

    logger.info("403 check  user_id=%s  status=%s  role=%s",
                user_id, profile["access_status"], profile["role"])

    if profile["access_status"] == "disabled":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled.")

    if profile["access_status"] == "pending":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access pending approval. You will be notified when approved.",
        )

    # Refresh last_login (best-effort, don't block the request)
    try:
        await update_user_profile(user_id, {"last_login": "now()"})
    except Exception:
        pass

    return UserProfile(**profile)


async def require_approved(user: Annotated[UserProfile, Depends(get_current_user)]) -> UserProfile:
    """Allow only approved and demo users (blocks pending/disabled which get_current_user already catches)."""
    return user


async def require_admin(user: Annotated[UserProfile, Depends(get_current_user)]) -> UserProfile:
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required.")
    return user


# Convenience type aliases
CurrentUser = Annotated[UserProfile, Depends(get_current_user)]
ApprovedUser = Annotated[UserProfile, Depends(require_approved)]
AdminUser = Annotated[UserProfile, Depends(require_admin)]
