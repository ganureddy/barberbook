"""Barber-Staff dashboard endpoints.

The mobile staff app shows a barber their day at a glance. These
endpoints aggregate Booking + Customer + Loyalty rows into the shapes
the four staff screens render: StaffSchedule, StaffInService,
StaffCustomer, StaffEarnings.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta

import frappe
from frappe import _

from ._utils import require_role


def _resolve_barber() -> str:
    """Resolve the BB Barber record bound to the current Frappe user."""
    user = frappe.session.user
    name = frappe.db.get_value("BB Barber", {"user": user}, "name")
    if not name:
        frappe.throw(_("No barber record is linked to your user."))
    return name


@frappe.whitelist()
def schedule(date_iso: str | None = None) -> dict:
    """Today (or a specific date) for the active staff member."""
    require_role("Barber Staff")
    barber = _resolve_barber()
    target = datetime.fromisoformat(date_iso) if date_iso else datetime.now()
    day_start = target.replace(hour=0, minute=0, second=0, microsecond=0)
    day_end = day_start + timedelta(days=1)

    rows = frappe.get_all(
        "BB Booking",
        filters={
            "barber": barber,
            "scheduled_at": ("between", [day_start, day_end]),
            "status": ("not in", ["Cancelled", "NoShow"]),
        },
        fields=[
            "name",
            "customer",
            "scheduled_at",
            "duration_minutes",
            "status",
            "total_amount",
            "currency",
            "token_code",
        ],
        order_by="scheduled_at asc",
    )

    # Greet by display-name if we can.
    user = frappe.get_doc("User", frappe.session.user)
    return {
        "barber": barber,
        "first_name": user.first_name or user.full_name or "Barber",
        "date": day_start.strftime("%Y-%m-%d"),
        "bookings": rows,
        "total_today": round(sum(float(r.total_amount or 0) for r in rows), 2),
    }


@frappe.whitelist()
def in_service() -> dict | None:
    """The currently in-progress booking (if any)."""
    require_role("Barber Staff")
    barber = _resolve_barber()
    row = frappe.get_all(
        "BB Booking",
        filters={"barber": barber, "status": "InService"},
        fields=[
            "name",
            "customer",
            "scheduled_at",
            "duration_minutes",
            "status",
            "total_amount",
            "currency",
            "token_code",
            "notes",
        ],
        order_by="scheduled_at asc",
        limit_page_length=1,
    )
    if not row:
        return None
    return row[0]


@frappe.whitelist()
def complete(booking: str, tip_amount: float | None = None) -> dict:
    require_role("Barber Staff")
    doc = frappe.get_doc("BB Booking", booking)
    barber = _resolve_barber()
    if doc.barber != barber:
        frappe.throw(_("Not your booking."))
    doc.status = "Completed"
    doc.save(ignore_permissions=True)
    if tip_amount and float(tip_amount) > 0:
        # Record the tip as a Payment row tagged "Tip" — keeps the audit
        # trail clean even though we don't model tip as a first-class
        # field on Booking.
        frappe.get_doc(
            {
                "doctype": "BB Payment",
                "booking": booking,
                "shop": doc.shop,
                "customer": doc.customer,
                "amount": float(tip_amount),
                "currency": doc.currency,
                "method": "Cash",
                "status": "Captured",
                "captured_at": frappe.utils.now(),
                "gateway_ref": "TIP",
            }
        ).insert(ignore_permissions=True)
    frappe.db.commit()
    return {"name": doc.name, "status": doc.status}


@frappe.whitelist()
def customer(booking: str) -> dict:
    """Profile sidebar for the currently-served customer."""
    require_role("Barber Staff")
    booking_doc = frappe.get_doc("BB Booking", booking)
    user = frappe.get_doc("User", booking_doc.customer)

    history = frappe.get_all(
        "BB Booking",
        filters={"customer": booking_doc.customer, "status": "Completed"},
        fields=["name", "shop", "scheduled_at", "duration_minutes", "total_amount", "currency"],
        order_by="scheduled_at desc",
        limit_page_length=10,
    )
    visit_count = len(history)

    loyalty = frappe.db.sql(
        """SELECT COALESCE(SUM(delta), 0) AS balance
           FROM `tabBB Loyalty Transaction`
           WHERE customer = %s AND shop = %s""",
        (booking_doc.customer, booking_doc.shop),
        as_dict=True,
    )
    points = int(loyalty[0]["balance"]) if loyalty else 0

    return {
        "customer": user.email,
        "full_name": user.full_name or user.first_name or user.email,
        "phone": user.phone or user.mobile_no,
        "visit_count": visit_count,
        "loyalty_points": points,
        "preferences": booking_doc.notes or "",
        "past_visits": history,
    }


@frappe.whitelist()
def earnings(period: str = "week") -> dict:
    """Hero stats + tip feed for the StaffEarnings screen."""
    require_role("Barber Staff")
    barber = _resolve_barber()

    days = {"day": 1, "week": 7, "month": 30}.get(period, 7)
    since = datetime.now() - timedelta(days=days)

    bookings = frappe.get_all(
        "BB Booking",
        filters={"barber": barber, "status": "Completed", "scheduled_at": (">=", since)},
        fields=["name", "scheduled_at", "total_amount", "currency"],
    )
    gross = sum(float(b.total_amount or 0) for b in bookings)

    tips = frappe.get_all(
        "BB Payment",
        filters={"gateway_ref": "TIP", "captured_at": (">=", since)},
        fields=["name", "amount", "currency", "captured_at", "booking"],
        order_by="captured_at desc",
    )
    tip_total = sum(float(t.amount or 0) for t in tips)

    return {
        "period": period,
        "gross": round(gross, 2),
        "tip_total": round(tip_total, 2),
        "currency": (bookings[0].currency if bookings else "INR"),
        "service_count": len(bookings),
        "tips": tips[:20],
    }
