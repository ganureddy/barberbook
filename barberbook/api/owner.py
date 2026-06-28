"""Shop-owner dashboard endpoints.

These compose the underlying booking / walkin tables into the
"OwnerToday", "OwnerWalkin", "OwnerMoney" data shapes the mobile UI
expects. They're explicit endpoints (rather than client-side joins)
because mobile has flaky networks and we want one round-trip per
screen.
"""

from __future__ import annotations

import json
from datetime import date, datetime, timedelta

import frappe
from frappe import _

from . import walkin as walkin_api  # re-export
from ._utils import require_role, serialize_doc

# Map the DocType's display values to the numeric vocab the mobile client uses.
_PRICE_TIER_TO_NUM = {"$": 1, "$$": 2, "$$$": 3}
_COVER_VARIANT_TO_NUM = {
    "barber-pole": 0,
    "gradient-cream": 1,
    "gradient-rose": 2,
    "gradient-charcoal": 3,
}
_WEEKDAYS = ("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")


def _as_list(value) -> list:
    """Coerce an RPC arg that may arrive as a JSON string or a list."""
    if value is None:
        return []
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
        except (ValueError, TypeError):
            return []
        return parsed if isinstance(parsed, list) else []
    return list(value) if isinstance(value, (list, tuple)) else []


def _assert_owns_shop(shop: str) -> None:
    """Guard: the current user must own `shop` (or be a System Manager).

    Defense-in-depth on top of the row-level permission hooks — gives a clear
    error if an owner tries to read/mutate another shop's data through the
    custom endpoints.
    """
    user = frappe.session.user
    if "System Manager" in frappe.get_roles(user):
        return
    owner = frappe.db.get_value("BB Shop", shop, "owner_user")
    if owner != user:
        frappe.throw(_("Not permitted for this shop."), frappe.PermissionError)


def _assert_shop_access(shop: str) -> None:
    """Guard: the current user owns `shop` OR works in it as a barber."""
    user = frappe.session.user
    if "System Manager" in frappe.get_roles(user):
        return
    if frappe.db.get_value("BB Shop", shop, "owner_user") == user:
        return
    if frappe.db.exists("BB Barber", {"shop": shop, "user": user}):
        return
    frappe.throw(_("Not permitted for this shop."), frappe.PermissionError)


def _ensure_role(user: str, role: str) -> None:
    """Grant `role` to `user` if they don't already have it."""
    if role in set(frappe.get_roles(user)):
        return
    if not frappe.db.exists("Role", role):
        return
    user_doc = frappe.get_doc("User", user)
    user_doc.append("roles", {"role": role})
    user_doc.save(ignore_permissions=True)


def serialize_shop(doc) -> dict:
    """BB Shop document/row → the mobile `Shop` shape."""
    get = doc.get if hasattr(doc, "get") else doc.__getitem__
    return {
        "doctype": "BB Shop",
        "name": doc.get("name") if hasattr(doc, "get") else doc["name"],
        "shop_name": get("shop_name"),
        "slug": get("slug"),
        "owner_user": get("owner_user"),
        "status": get("status") or "Active",
        "country": get("country") or "IN",
        "city": get("city") or "",
        "address_line": get("address_line") or "",
        "pincode": get("pincode") or "",
        "latitude": float(get("latitude") or 0),
        "longitude": float(get("longitude") or 0),
        "rating": float(get("rating") or 0),
        "rating_count": int(get("rating_count") or 0),
        "price_tier": _PRICE_TIER_TO_NUM.get(get("price_tier"), 2),
        "is_open": int(get("is_open") or 0),
        "accepts_walkin": int(get("accepts_walkin") or 0),
        "cover_variant": _COVER_VARIANT_TO_NUM.get(get("cover_variant"), 0),
        "open_time": str(get("open_time")) if get("open_time") else None,
        "close_time": str(get("close_time")) if get("close_time") else None,
        "phone": get("phone") or "",
        "currency": get("currency") or "INR",
    }


@frappe.whitelist()
def create_shop(**kwargs) -> dict:
    """Enroll a new shop for the signed-in user together with its seats,
    barbers and menu of services. Grants the Shop Owner role on first shop."""
    user = frappe.session.user
    if user in ("Guest", None):
        frappe.throw(_("Login required."))

    shop_name = (kwargs.get("shop_name") or "").strip()
    if not shop_name:
        frappe.throw(_("Shop name is required."))

    _ensure_role(user, "Shop Owner")

    shop = frappe.new_doc("BB Shop")
    shop.update(
        {
            "shop_name": shop_name,
            "slug": kwargs.get("slug") or None,
            "owner_user": user,
            "status": "Active",
            "is_open": 1,
            "accepts_walkin": 1,
            "phone": kwargs.get("phone") or None,
            "currency": kwargs.get("currency") or "INR",
            "country": kwargs.get("country") or "IN",
            "city": kwargs.get("city") or None,
            "pincode": kwargs.get("pincode") or None,
            "address_line": kwargs.get("address_line") or None,
            "latitude": kwargs.get("latitude") or 0,
            "longitude": kwargs.get("longitude") or 0,
            "open_time": kwargs.get("open_time") or None,
            "close_time": kwargs.get("close_time") or None,
        }
    )
    shop.insert(ignore_permissions=True)

    # Seats.
    try:
        seat_count = int(kwargs.get("seat_count") or 0)
    except (ValueError, TypeError):
        seat_count = 0
    for i in range(1, seat_count + 1):
        frappe.get_doc(
            {"doctype": "BB Seat", "shop": shop.name, "label": f"Seat {i}", "is_active": 1}
        ).insert(ignore_permissions=True)

    # Barbers.
    for draft in _as_list(kwargs.get("barbers")):
        if not isinstance(draft, dict):
            continue
        name = (draft.get("full_name") or "").strip()
        if not name:
            continue
        days = draft.get("available_days")
        frappe.get_doc(
            {
                "doctype": "BB Barber",
                "shop": shop.name,
                "barber_name": name,
                "specialties": draft.get("specialties") or None,
                "phone": draft.get("phone") or None,
                "is_active": 1,
                "avatar_seed": name.lower(),
                "available_days": ",".join(days) if isinstance(days, list) else (days or None),
                "shift_start": draft.get("shift_start") or None,
                "shift_end": draft.get("shift_end") or None,
            }
        ).insert(ignore_permissions=True)

    # Services (menu).
    for draft in _as_list(kwargs.get("services")):
        if not isinstance(draft, dict):
            continue
        sname = (draft.get("service_name") or "").strip()
        if not sname:
            continue
        frappe.get_doc(
            {
                "doctype": "BB Service",
                "shop": shop.name,
                "service_name": sname,
                "category": draft.get("category") or "Hair",
                "duration_minutes": int(draft.get("duration_minutes") or 30),
                "price": float(draft.get("price") or 0),
                "currency": kwargs.get("currency") or "INR",
                "is_active": 1,
            }
        ).insert(ignore_permissions=True)

    frappe.db.commit()
    return serialize_shop(shop)


@frappe.whitelist()
def my_shops() -> list[dict]:
    """Every shop the signed-in user owns, with at-a-glance KPIs."""
    user = frappe.session.user
    if user in ("Guest", None):
        return []

    rows = frappe.get_all(
        "BB Shop",
        filters={"owner_user": user},
        fields=[
            "name",
            "shop_name",
            "slug",
            "owner_user",
            "status",
            "country",
            "city",
            "address_line",
            "pincode",
            "latitude",
            "longitude",
            "rating",
            "rating_count",
            "price_tier",
            "is_open",
            "accepts_walkin",
            "cover_variant",
            "open_time",
            "close_time",
            "phone",
            "currency",
        ],
        order_by="creation desc",
    )

    today_dt = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    end_dt = today_dt + timedelta(days=1)

    out: list[dict] = []
    for r in rows:
        bookings = frappe.get_all(
            "BB Booking",
            filters={
                "shop": r["name"],
                "scheduled_at": ("between", [today_dt, end_dt]),
                "status": ("not in", ["Cancelled", "NoShow"]),
            },
            fields=["total_amount", "status"],
        )
        revenue = sum(float(b.total_amount or 0) for b in bookings if b.status == "Completed")
        out.append(
            {
                "shop": serialize_shop(r),
                "barber_count": frappe.db.count("BB Barber", {"shop": r["name"]}),
                "service_count": frappe.db.count("BB Service", {"shop": r["name"]}),
                "bookings_today": len(bookings),
                "revenue_today": round(revenue, 2),
                "currency": r.get("currency") or "INR",
            }
        )
    return out


@frappe.whitelist()
def today(shop: str) -> dict:
    require_role("Shop Owner", "Barber Staff")
    _assert_shop_access(shop)
    today_dt = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    end_dt = today_dt + timedelta(days=1)

    bookings = frappe.get_all(
        "BB Booking",
        filters={
            "shop": shop,
            "scheduled_at": ("between", [today_dt, end_dt]),
            "status": ("not in", ["Cancelled", "NoShow"]),
        },
        fields=[
            "name",
            "customer",
            "barber",
            "scheduled_at",
            "duration_minutes",
            "status",
            "total_amount",
            "currency",
            "token_code",
        ],
        order_by="scheduled_at asc",
    )
    walkins = walkin_api._snapshot(shop)
    revenue = sum(float(b.total_amount or 0) for b in bookings if b.status == "Completed")
    return {
        "date": today_dt.strftime("%Y-%m-%d"),
        "shop": shop,
        "bookings": bookings,
        "walkins": walkins,
        "revenue_today": round(revenue, 2),
    }


@frappe.whitelist()
def walkin_queue(shop: str) -> dict:
    require_role("Shop Owner", "Barber Staff")
    _assert_shop_access(shop)
    return walkin_api._snapshot(shop)


@frappe.whitelist()
def walkin_call(shop: str, name: str) -> dict:
    require_role("Shop Owner", "Barber Staff")
    _assert_shop_access(shop)
    return walkin_api.call(shop, name)


@frappe.whitelist()
def walkin_done(shop: str, name: str) -> dict:
    require_role("Shop Owner", "Barber Staff")
    _assert_shop_access(shop)
    return walkin_api.done(shop, name)


@frappe.whitelist()
def set_booking_status(name: str, status: str) -> dict:
    require_role("Shop Owner", "Barber Staff")
    from . import booking as booking_api

    return booking_api.update_status(name, status)


@frappe.whitelist()
def payouts(shop: str, period_start: str | None = None, period_end: str | None = None) -> dict:
    """Return Payment Entry rows linked to this shop. Used by OwnerMoney."""
    require_role("Shop Owner")
    _assert_owns_shop(shop)

    start = period_start or (date.today() - timedelta(days=30)).isoformat()
    end = period_end or date.today().isoformat()

    payments = frappe.get_all(
        "BB Payment",
        filters={
            "shop": shop,
            "status": "Captured",
            "captured_at": ("between", [start, end]),
        },
        fields=["name", "booking", "amount", "currency", "method", "captured_at", "payment_entry"],
        order_by="captured_at desc",
    )
    gross = sum(float(p.amount or 0) for p in payments)
    return {
        "shop": shop,
        "period": {"start": start, "end": end},
        "gross": round(gross, 2),
        "currency": frappe.db.get_value("BB Shop", shop, "currency") or "INR",
        "payments": payments,
        "next_payout_date": (date.today() + timedelta(days=2)).isoformat(),
    }
