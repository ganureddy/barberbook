"""Shared helpers for BarberBook whitelisted endpoints.

Idempotency, request-id propagation, role checks. Kept dependency-free
(only standard `frappe.*` modules) so unit tests don't need a full bench.
"""

from __future__ import annotations

import hashlib
import math
from typing import Any

import frappe
from frappe import _

# Five-minute TTL is plenty to dedupe a flaky retry while not letting a
# bad client lock a key forever. The mobile draft regenerates the key on
# successful create.
IDEMPOTENCY_TTL_SECONDS = 5 * 60


def get_idempotency_key() -> str | None:
    """Return the `Idempotency-Key` header from the active request, if any."""
    request = getattr(frappe.local, "request", None)
    if request is None:
        return None
    headers = getattr(request, "headers", {}) or {}
    return headers.get("Idempotency-Key") or headers.get("idempotency-key")


def with_idempotency(scope: str, fn):
    """Wrap a write-side callable with idempotency replay.

    Looks for an `Idempotency-Key` header. If we've already executed
    `(scope, key)`, returns the cached payload. Otherwise runs `fn()`,
    caches the result, and returns it.

    `scope` should be the operation name ("booking.create",
    "walkin.join", …) so two endpoints can use the same client-side key
    without colliding on the cache.
    """
    key = get_idempotency_key()
    if not key:
        return fn()

    cache_key = f"barberbook:idem:{scope}:{key}"
    cached = frappe.cache().get_value(cache_key)
    if cached:
        return cached

    result = fn()
    try:
        frappe.cache().set_value(cache_key, result, expires_in_sec=IDEMPOTENCY_TTL_SECONDS)
    except Exception:
        # Cache eviction is best-effort; never block the response on it.
        pass
    return result


def require_role(*allowed: str) -> None:
    """Raise PermissionError unless the current user has one of the roles."""
    user_roles = set(frappe.get_roles(frappe.session.user))
    if "System Manager" in user_roles:
        return
    if not user_roles.intersection(allowed):
        frappe.throw(_("Not permitted"), frappe.PermissionError)


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle distance in kilometers."""
    earth_r = 6371.0
    p1 = math.radians(lat1)
    p2 = math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return round(earth_r * 2 * math.asin(math.sqrt(a)), 2)


def normalize_phone(value: str | None) -> str:
    """Significant-digits form of a phone number for matching.

    Strips spaces / punctuation / country prefix and keeps the last 10
    digits, so `+91 98000 00000` and `9800000000` compare equal.
    """
    digits = "".join(ch for ch in (value or "") if ch.isdigit())
    return digits[-10:] if len(digits) > 10 else digits


def fingerprint(value: str) -> str:
    """Stable non-cryptographic fingerprint. Used for de-duping (e.g. push
    tokens) without storing the raw value in the cache key."""
    return hashlib.sha1(value.encode("utf-8"), usedforsecurity=False).hexdigest()[:16]


def serialize_doc(doc: Any) -> dict:
    """Convert a Frappe Document to a plain dict the mobile client expects.
    Keeps audit fields, drops internal flags."""
    if doc is None:
        return None  # type: ignore[return-value]
    out = doc.as_dict()
    # Frappe sometimes leaks these; the mobile client doesn't need them.
    for k in ("_user_tags", "_comments", "_assign", "_liked_by"):
        out.pop(k, None)
    return out
