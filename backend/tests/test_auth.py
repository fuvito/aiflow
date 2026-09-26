"""
Unit tests for app.core.auth.verify_jwt.

All tests mock network/crypto calls so no real Supabase project is needed.
"""
import time
from unittest.mock import MagicMock, patch

import jwt as pyjwt
import pytest

from app.core.auth import AuthError, verify_jwt, _get_jwks_client
import app.core.auth as auth_module


# ── Helpers ────────────────────────────────────────────────────────────────

def _reset_jwks_client():
    """Force the module-level JWKS client to be re-created next call."""
    auth_module._jwks_client = None


# ── Tests ──────────────────────────────────────────────────────────────────

def test_verify_jwt_raises_when_supabase_url_missing():
    _reset_jwks_client()
    with patch("app.core.auth.settings") as mock_settings:
        mock_settings.supabase_url = ""
        with pytest.raises(AuthError, match="SUPABASE_URL"):
            verify_jwt("any.token.here")


def test_verify_jwt_raises_on_malformed_token():
    _reset_jwks_client()
    with patch("app.core.auth.settings") as mock_settings:
        mock_settings.supabase_url = "https://test.supabase.co"
        # "not.a.jwt" has only two parts; pyjwt can't parse the header
        with pytest.raises(AuthError, match="Malformed token"):
            verify_jwt("notajwt")


def test_verify_jwt_raises_on_invalid_signature():
    _reset_jwks_client()
    # Build a real RS256 JWT with a throwaway key, then try to verify
    # it with a *different* key (simulating signature mismatch).
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.hazmat.backends import default_backend

    signing_key = rsa.generate_private_key(
        public_exponent=65537, key_size=2048, backend=default_backend()
    )
    wrong_key = rsa.generate_private_key(
        public_exponent=65537, key_size=2048, backend=default_backend()
    )

    now = int(time.time())
    token = pyjwt.encode(
        {"sub": "uid", "aud": "authenticated", "iat": now, "exp": now + 300},
        signing_key,
        algorithm="RS256",
    )

    mock_signing_key = MagicMock()
    mock_signing_key.key = wrong_key.public_key()

    mock_client = MagicMock()
    mock_client.get_signing_key_from_jwt.return_value = mock_signing_key

    with patch("app.core.auth.settings") as mock_settings, \
         patch("app.core.auth._get_jwks_client", return_value=mock_client):
        mock_settings.supabase_url = "https://test.supabase.co"
        with pytest.raises(AuthError, match="Invalid token"):
            verify_jwt(token)


def test_verify_jwt_raises_on_expired_token():
    _reset_jwks_client()
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.hazmat.backends import default_backend

    key = rsa.generate_private_key(
        public_exponent=65537, key_size=2048, backend=default_backend()
    )
    public_key = key.public_key()

    now = int(time.time())
    # expired 10 minutes ago; leeway is only 30s
    token = pyjwt.encode(
        {"sub": "uid", "aud": "authenticated", "iat": now - 900, "exp": now - 600},
        key,
        algorithm="RS256",
    )

    mock_signing_key = MagicMock()
    mock_signing_key.key = public_key
    mock_client = MagicMock()
    mock_client.get_signing_key_from_jwt.return_value = mock_signing_key

    with patch("app.core.auth.settings") as mock_settings, \
         patch("app.core.auth._get_jwks_client", return_value=mock_client):
        mock_settings.supabase_url = "https://test.supabase.co"
        with pytest.raises(AuthError, match="Invalid token"):
            verify_jwt(token)


def test_verify_jwt_returns_payload_on_valid_token():
    _reset_jwks_client()
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.hazmat.backends import default_backend

    key = rsa.generate_private_key(
        public_exponent=65537, key_size=2048, backend=default_backend()
    )
    public_key = key.public_key()

    now = int(time.time())
    expected_sub = "user-abc-123"
    token = pyjwt.encode(
        {"sub": expected_sub, "aud": "authenticated", "iat": now, "exp": now + 3600},
        key,
        algorithm="RS256",
    )

    mock_signing_key = MagicMock()
    mock_signing_key.key = public_key
    mock_client = MagicMock()
    mock_client.get_signing_key_from_jwt.return_value = mock_signing_key

    with patch("app.core.auth.settings") as mock_settings, \
         patch("app.core.auth._get_jwks_client", return_value=mock_client):
        mock_settings.supabase_url = "https://test.supabase.co"
        payload = verify_jwt(token)

    assert payload["sub"] == expected_sub
    assert payload["aud"] == "authenticated"
