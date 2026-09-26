"""
Thin async wrapper around the Supabase REST API using httpx.
Uses the service role key — never expose this to the frontend.
"""
import time
from typing import Any, Optional

import httpx

from app.core.config import settings

# Simple in-process cache: {user_id: (profile_dict, expires_at)}
_profile_cache: dict[str, tuple[dict, float]] = {}
_CACHE_TTL = 60  # seconds


def _base_headers() -> dict[str, str]:
    return {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


async def get_user_profile(user_id: str) -> Optional[dict[str, Any]]:
    cached = _profile_cache.get(user_id)
    if cached and cached[1] > time.time():
        return cached[0]

    url = f"{settings.supabase_url}/rest/v1/user_profiles"
    params = {"id": f"eq.{user_id}", "select": "*", "limit": "1"}
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=_base_headers(), params=params)
        resp.raise_for_status()
        rows = resp.json()
        if not rows:
            return None
        profile = rows[0]
        _profile_cache[user_id] = (profile, time.time() + _CACHE_TTL)
        return profile


def invalidate_profile_cache(user_id: str) -> None:
    _profile_cache.pop(user_id, None)


async def update_user_profile(user_id: str, patch: dict[str, Any]) -> None:
    url = f"{settings.supabase_url}/rest/v1/user_profiles"
    params = {"id": f"eq.{user_id}"}
    async with httpx.AsyncClient() as client:
        resp = await client.patch(url, headers=_base_headers(), params=params, json=patch)
        resp.raise_for_status()
    invalidate_profile_cache(user_id)


async def get_all_users() -> list[dict[str, Any]]:
    url = f"{settings.supabase_url}/rest/v1/user_profiles"
    params = {"select": "*", "order": "created_at.desc"}
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=_base_headers(), params=params)
        resp.raise_for_status()
        return resp.json()


async def get_access_requests(status: Optional[str] = None) -> list[dict[str, Any]]:
    url = f"{settings.supabase_url}/rest/v1/access_requests"
    params: dict[str, str] = {"select": "*", "order": "created_at.desc"}
    if status:
        params["status"] = f"eq.{status}"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=_base_headers(), params=params)
        resp.raise_for_status()
        return resp.json()


async def insert_access_request(data: dict[str, Any]) -> dict[str, Any]:
    url = f"{settings.supabase_url}/rest/v1/access_requests"
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, headers=_base_headers(), json=data)
        resp.raise_for_status()
        rows = resp.json()
        return rows[0] if rows else {}


async def update_access_request(request_id: str, patch: dict[str, Any]) -> None:
    url = f"{settings.supabase_url}/rest/v1/access_requests"
    params = {"id": f"eq.{request_id}"}
    async with httpx.AsyncClient() as client:
        resp = await client.patch(url, headers=_base_headers(), params=params, json=patch)
        resp.raise_for_status()


async def get_usage_today(user_id: str) -> dict[str, Any]:
    from datetime import date
    today = date.today().isoformat()
    url = f"{settings.supabase_url}/rest/v1/usage_tracking"
    params = {
        "user_id": f"eq.{user_id}",
        "date": f"eq.{today}",
        "select": "*",
        "limit": "1",
    }
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=_base_headers(), params=params)
        resp.raise_for_status()
        rows = resp.json()
        return rows[0] if rows else {"user_id": user_id, "date": today, "executions": 0, "llm_requests": 0}


async def insert_analytics_event(
    event: str, page: Optional[str] = None, user_id: Optional[str] = None
) -> None:
    url = f"{settings.supabase_url}/rest/v1/analytics_events"
    headers = {**_base_headers(), "Prefer": "return=minimal"}
    payload: dict[str, Any] = {"event": event}
    if page:
        payload["page"] = page
    if user_id:
        payload["user_id"] = user_id
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
    except Exception:
        pass  # analytics is non-fatal


async def get_analytics_summary() -> dict[str, Any]:
    from datetime import date, timedelta
    since = (date.today() - timedelta(days=30)).isoformat()
    url = f"{settings.supabase_url}/rest/v1/analytics_events"
    params = {
        "select": "event,page,created_at",
        "created_at": f"gte.{since}T00:00:00Z",
        "order": "created_at.desc",
        "limit": "5000",
    }
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=_base_headers(), params=params)
        resp.raise_for_status()
        events = resp.json()

    totals: dict[str, int] = {}
    by_date: dict[str, dict[str, int]] = {}
    for e in events:
        etype = e["event"]
        totals[etype] = totals.get(etype, 0) + 1
        day = e["created_at"][:10]
        by_date.setdefault(day, {})
        by_date[day][etype] = by_date[day].get(etype, 0) + 1

    daily = [
        {"date": day, "event": evt, "count": cnt}
        for day, evts in sorted(by_date.items())
        for evt, cnt in evts.items()
    ]
    return {"totals": totals, "daily": daily}


async def increment_usage(user_id: str, field: str) -> None:
    """Upsert today's usage row and increment the given field (executions or llm_requests)."""
    from datetime import date
    today = date.today().isoformat()
    url = f"{settings.supabase_url}/rest/v1/usage_tracking"
    headers = {**_base_headers(), "Prefer": "resolution=merge-duplicates,return=minimal"}
    payload = {
        "user_id": user_id,
        "date": today,
        field: 1,
    }
    # Use upsert; on conflict increment via RPC instead
    # Simpler: fetch current value, then update or insert
    existing = await get_usage_today(user_id)
    current = existing.get(field, 0)

    if "id" in existing:
        patch_url = f"{settings.supabase_url}/rest/v1/usage_tracking"
        params = {"user_id": f"eq.{user_id}", "date": f"eq.{today}"}
        async with httpx.AsyncClient() as client:
            resp = await client.patch(
                patch_url,
                headers=_base_headers(),
                params=params,
                json={field: current + 1},
            )
            resp.raise_for_status()
    else:
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
