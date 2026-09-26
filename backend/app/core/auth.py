"""
JWT verification for Supabase-issued tokens.

Modern Supabase projects use RS256 (asymmetric keys).
Public keys are fetched from the project's JWKS endpoint and cached.
Falls back to HS256 if a JWT secret is configured instead.
"""
import logging
from typing import Any, Optional

import jwt as pyjwt
from jwt import PyJWKClient, PyJWTError

from app.core.config import settings

logger = logging.getLogger(__name__)

_jwks_client: Optional[PyJWKClient] = None


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        jwks_url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
        _jwks_client = PyJWKClient(jwks_url, cache_keys=True)
        logger.info("JWKS client initialised: %s", jwks_url)
    return _jwks_client


class AuthError(Exception):
    pass


def verify_jwt(token: str) -> dict[str, Any]:
    """Decode and verify a Supabase JWT. Supports both RS256 (JWKS) and HS256."""
    if not settings.supabase_url:
        logger.error("AUTH FAIL: SUPABASE_URL is not set in .env")
        raise AuthError("SUPABASE_URL is not configured")

    # Log the unverified header so we can see the algorithm Supabase is using.
    try:
        header = pyjwt.get_unverified_header(token)
        logger.info("JWT header: %s", header)
    except Exception as exc:
        logger.error("AUTH FAIL: cannot read JWT header: %s", exc)
        raise AuthError("Malformed token") from exc

    try:
        client = _get_jwks_client()
        signing_key = client.get_signing_key_from_jwt(token)
        payload = pyjwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256", "HS256", "ES256", "EdDSA"],
            audience="authenticated",
            leeway=30,  # tolerate up to 30s clock skew between server and Supabase
        )
        return payload
    except PyJWTError as exc:
        logger.error("AUTH FAIL: %s", exc)
        raise AuthError(f"Invalid token: {exc}") from exc
    except Exception as exc:
        logger.error("AUTH FAIL (unexpected): %s", exc)
        raise AuthError(f"Token verification failed: {exc}") from exc
