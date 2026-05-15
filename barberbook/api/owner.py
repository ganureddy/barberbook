"""Shop-owner dashboard endpoints.

These compose the underlying booking / walkin tables into the
"OwnerToday", "OwnerWalkin", "OwnerMoney" data shapes the mobile UI
expects. They're explicit endpoints (rather than client-side joins)
because mobile has flaky networks and we want one round-trip per
screen.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta

import frappe
from frappe import _

from . import walkin as walkin_api  # re-export
from ._utils import require_role, serialize_doc


@frappe.whitelist()
def today(shop: str) -> dict:
    require_role("Shop Owner", "Barber Staff")
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
    return walkin_api._snapshot(shop)


@frappe.whitelist()
def walkin_call(shop: str, name: str) -> dict:
    require_role("Shop Owner", "Barber Staff")
    return walkin_api.call(shop, name)


@frappe.whitelist()
def walkin_done(shop: str, name: str) -> dict:
    require_role("Shop Owner", "Barber Staff")
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
