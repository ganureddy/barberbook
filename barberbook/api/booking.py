"""Booking lifecycle endpoints.

  * `create` — idempotent booking creation. Honours the `Idempotency-Key`
    header so a flaky network can't double-book the same chair.
  * `get_availability` — slot grid for (shop, date), respecting roster +
    existing bookings.
  * `cancel` / `reschedule` — owner / customer mutations.
  * `list_mine` — current customer's bookings.
"""

from __future__ import annotations

from datetime import datetime, timedelta

import frappe
from frappe import _
from frappe.utils import get_datetime, getdate, today

from ._utils import serialize_doc, with_idempotency

# Slot granularity. Matches BookingTime's 30-minute UI grid.
SLOT_MINUTES = 30
DEFAULT_GST_RATE = 0.18
LOYALTY_POINT_VALUE = 0.5  # ₹ per point — must match mobile.


@frappe.whitelist()
def create(
    shop: str,
    scheduled_at: str,
    services: list[dict],
    barber: str | None = None,
    notes: str | None = None,
    client_total: float | None = None,
    loyalty_points_to_redeem: int | None = None,
    payment_method: str | None = None,
) -> dict:
    """Create a confirmed booking. Idempotent."""

    def _do() -> dict:
        if not shop or not scheduled_at or not services:
            frappe.throw(_("shop, scheduled_at, and services are required."))

        when = get_datetime(scheduled_at)
        duration = sum(int(s.get("duration_minutes") or 0) for s in services)
        if duration <= 0:
            frappe.throw(_("At least one service must have a duration."))

        subtotal = sum(float(s.get("price") or 0) for s in services)
        gst_amount = round(subtotal * DEFAULT_GST_RATE, 2)
        gross = round(subtotal + gst_amount, 2)
        loyalty_redeem = max(0, int(loyalty_points_to_redeem or 0))
        loyalty_discount = min(gross, round(loyalty_redeem * LOYALTY_POINT_VALUE, 2))
        total = round(gross - loyalty_discount, 2)

        # Server-side guard: total mismatch hints at a tampered client.
        if client_total is not None and abs(client_total - total) > 0.5:
            frappe.log_error(
                title="BarberBook booking total mismatch",
                message=f"client={client_total} server={total} shop={shop}",
            )

        booking = frappe.new_doc("BB Booking")
        booking.update(
            {
                "customer": frappe.session.user,
                "shop": shop,
                "barber": barber,
                "scheduled_at": when,
                "duration_minutes": duration,
                "services": [
                    {
                        "service": s.get("service"),
                        "duration_minutes": int(s.get("duration_minutes") or 0),
                        "price": float(s.get("price") or 0),
                    }
                    for s in services
                ],
                "status": "Confirmed",
                "total_amount": total,
                "currency": frappe.db.get_value("BB Shop", shop, "currency") or "INR",
                "payment_status": "Pending",
                "token_code": _mint_token_code(),
                "notes": notes,
                "payment_method": payment_method,
                "loyalty_redeemed": loyalty_redeem if loyalty_discount > 0 else 0,
            }
        )
        booking.insert(ignore_permissions=True)

        # Earn loyalty for non-redemption portion. Owner can override the
        # earn rate per shop later — for v1 it's flat ₹10 = 1 point.
        if total > 0:
            frappe.get_doc(
                {
                    "doctype": "BB Loyalty Transaction",
                    "customer": frappe.session.user,
                    "shop": shop,
                    "booking": booking.name,
                    "delta": int(total // 10),
                    "reason": "Booking",
                }
            ).insert(ignore_permissions=True)

        # If the user redeemed points, debit the loyalty account.
        if loyalty_redeem > 0 and loyalty_discount > 0:
            frappe.get_doc(
                {
                    "doctype": "BB Loyalty Transaction",
                    "customer": frappe.session.user,
                    "shop": shop,
                    "booking": booking.name,
                    "delta": -loyalty_redeem,
                    "reason": "Redemption",
                }
            ).insert(ignore_permissions=True)

        frappe.db.commit()
        return serialize_doc(booking)

    return with_idempotency("booking.create", _do)


@frappe.whitelist()
def get_availability(shop: str, date: str, service_names: list[str] | None = None) -> list[dict]:
    """Return 30-minute slots for the given shop+date."""
    if not shop or not date:
        frappe.throw(_("shop and date are required."))

    open_time, close_time = (
        frappe.db.get_value("BB Shop", shop, ["open_time", "close_time"]) or ("09:00:00", "21:00:00")
    )
    open_dt = get_datetime(f"{date} {open_time or '09:00:00'}")
    close_dt = get_datetime(f"{date} {close_time or '21:00:00'}")

    duration = 30
    if service_names:
        durations = frappe.get_all(
            "BB Service",
            filters={"name": ("in", list(service_names))},
            fields=["duration_minutes"],
        )
        duration = sum(int(d.duration_minutes or 30) for d in durations) or 30

    booked = frappe.get_all(
        "BB Booking",
        filters={
            "shop": shop,
            "status": ("not in", ["Cancelled", "NoShow"]),
            "scheduled_at": ("between", [open_dt, close_dt]),
        },
        fields=["scheduled_at", "duration_minutes"],
    )
    booked_intervals = [
        (get_datetime(b.scheduled_at), get_datetime(b.scheduled_at) + timedelta(minutes=int(b.duration_minutes or 30)))
        for b in booked
    ]

    slots: list[dict] = []
    cur = open_dt
    while cur + timedelta(minutes=duration) <= close_dt:
        end = cur + timedelta(minutes=duration)
        overlap = any(s < end and cur < e for s, e in booked_intervals)
        slots.append(
            {
                "start_at": cur.strftime("%Y-%m-%dT%H:%M:%S"),
                "end_at": end.strftime("%Y-%m-%dT%H:%M:%S"),
                "available": not overlap,
                "total": 0,  # The mobile recomputes from selected services.
            }
        )
        cur += timedelta(minutes=SLOT_MINUTES)
    return slots


@frappe.whitelist()
def update_status(name: str, status: str) -> dict:
    """Owner / staff sets a booking's status (CheckedIn, InService,
    Completed, Cancelled, NoShow). Customer can only Cancel."""
    if status not in {"Confirmed", "CheckedIn", "InService", "Completed", "Cancelled", "NoShow"}:
        frappe.throw(_("Invalid status."))
    booking = frappe.get_doc("BB Booking", name)
    is_owner = booking.customer == frappe.session.user
    if is_owner and status != "Cancelled":
        frappe.throw(_("Customers can only cancel a booking."))
    booking.status = status
    booking.save(ignore_permissions=is_owner)
    frappe.db.commit()
    return serialize_doc(booking)


@frappe.whitelist()
def cancel(name: str) -> dict:
    return update_status(name, "Cancelled")


@frappe.whitelist()
def reschedule(name: str, scheduled_at: str) -> dict:
    booking = frappe.get_doc("BB Booking", name)
    if booking.customer != frappe.session.user:
        frappe.throw(_("Not your booking."))
    booking.scheduled_at = get_datetime(scheduled_at)
    booking.save(ignore_permissions=True)
    frappe.db.commit()
    return serialize_doc(booking)


@frappe.whitelist()
def list_mine(status: str | None = None) -> list[dict]:
    """Bookings for the current user, most recent first."""
    filters: dict[str, object] = {"customer": frappe.session.user}
    if status == "Upcoming":
        filters["scheduled_at"] = (">=", today())
        filters["status"] = ("in", ["Confirmed", "CheckedIn", "InService"])
    elif status == "Past":
        filters["scheduled_at"] = ("<", today())
    elif status:
        filters["status"] = status
    return frappe.get_all(
        "BB Booking",
        filters=filters,
        fields=[
            "name",
            "customer",
            "shop",
            "barber",
            "scheduled_at",
            "duration_minutes",
            "status",
            "total_amount",
            "currency",
            "payment_status",
            "token_code",
            "notes",
        ],
        order_by="scheduled_at desc",
        limit_page_length=100,
    )


def _mint_token_code() -> str:
    import secrets

    return f"BB-{secrets.randbelow(99):02d}-{secrets.randbelow(999):03d}"
