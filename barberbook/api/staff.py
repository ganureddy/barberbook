"""Barber-Staff dashboard endpoints.

The mobile staff app shows a barber their day at a glance. These
endpoints aggregate Booking + Customer + Loyalty rows into the shapes
the four staff screens render: StaffSchedule, StaffInService,
StaffCustomer, StaffEarnings.
"""

from __future__ import annotations

from datetime import datetime, timedelta

import frappe
from frappe import _

from ._utils import normalize_phone, require_role
from .owner import _as_list, _ensure_role, serialize_shop


def _barber_workspace(barber_name: str) -> dict:
    """Build the mobile `BarberWorkspace` shape for a BB Barber row."""
    barber = frappe.db.get_value(
        "BB Barber",
        barber_name,
        ["name", "shop", "barber_name", "specialties", "available_days", "shift_start", "shift_end"],
        as_dict=True,
    )
    shop_row = frappe.db.get_value(
        "BB Shop",
        barber.shop,
        [
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
        as_dict=True,
    )

    today_dt = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    end_dt = today_dt + timedelta(days=1)
    bookings_today = frappe.db.count(
        "BB Booking",
        {
            "barber": barber_name,
            "scheduled_at": ("between", [today_dt, end_dt]),
            "status": ("not in", ["Cancelled", "NoShow"]),
        },
    )
    return {
        "barber": barber.name,
        "barber_name": barber.barber_name or "",
        "specialties": barber.specialties or "",
        "available_days": (barber.available_days or "").split(",") if barber.available_days else [],
        "shift_start": barber.shift_start or None,
        "shift_end": barber.shift_end or None,
        "shop": serialize_shop(shop_row) if shop_row else {"name": barber.shop},
        "bookings_today": bookings_today,
        "tips_today": 0,
        "currency": (shop_row.currency if shop_row else "INR") or "INR",
    }


@frappe.whitelist()
def onboard(**kwargs) -> list[dict]:
    """Create/link the signed-in user as a barber across one or more shops.

    A barber can work in multiple shops; we create one BB Barber row per
    shop, all linked to the same User. Grants the Barber Staff role.
    """
    user = frappe.session.user
    if user in ("Guest", None):
        frappe.throw(_("Login required."))

    full_name = (kwargs.get("full_name") or "").strip()
    if not full_name:
        frappe.throw(_("Your name is required."))

    shop_ids = [s for s in _as_list(kwargs.get("shop_ids")) if s]
    if not shop_ids:
        frappe.throw(_("Select at least one shop."))

    _ensure_role(user, "Barber Staff")

    created: list[str] = []
    for shop_id in shop_ids:
        if not frappe.db.exists("BB Shop", shop_id):
            continue
        # Don't duplicate an existing link for this (user, shop).
        existing = frappe.db.get_value("BB Barber", {"user": user, "shop": shop_id}, "name")
        if existing:
            created.append(existing)
            continue
        days = kwargs.get("available_days")
        doc = frappe.get_doc(
            {
                "doctype": "BB Barber",
                "shop": shop_id,
                "user": user,
                "barber_name": full_name,
                "phone": kwargs.get("phone") or None,
                "specialties": kwargs.get("specialties") or None,
                "avatar_seed": kwargs.get("avatar_seed") or full_name.lower(),
                "is_active": 1,
                "available_days": ",".join(days) if isinstance(days, list) else (days or None),
                "shift_start": kwargs.get("shift_start") or None,
                "shift_end": kwargs.get("shift_end") or None,
            }
        )
        doc.insert(ignore_permissions=True)
        created.append(doc.name)

    frappe.db.commit()
    return [_barber_workspace(name) for name in created]


@frappe.whitelist()
def update_profile(**kwargs) -> list[dict]:
    """Update the signed-in barber's own profile.

    Personal fields (name, specialties, experience, phone, avatar) are applied
    to every BB Barber record the user owns; the weekly schedule (days/shift)
    is per-shop and only updates the record named in `barber`. The Frappe User
    display name is kept in sync. Returns the refreshed workspaces.
    """
    user = frappe.session.user
    if user in ("Guest", None):
        frappe.throw(_("Login required."))

    rows = frappe.get_all("BB Barber", filters={"user": user}, fields=["name"])
    if not rows:
        frappe.throw(_("No barber profile is linked to your account."))

    full_name = (kwargs.get("full_name") or "").strip()
    days = kwargs.get("available_days")
    days_str = ",".join(days) if isinstance(days, list) else (days or None)
    target = kwargs.get("barber")

    for row in rows:
        doc = frappe.get_doc("BB Barber", row["name"])
        # Personal fields — applied to all of the barber's shop records.
        if full_name:
            doc.barber_name = full_name
        if kwargs.get("specialties") is not None:
            doc.specialties = kwargs.get("specialties")
        if kwargs.get("phone") is not None:
            doc.phone = kwargs.get("phone")
        if kwargs.get("avatar_seed"):
            doc.avatar_seed = kwargs.get("avatar_seed")
        # Schedule — only the targeted shop record.
        if target and row["name"] == target:
            if days_str is not None:
                doc.available_days = days_str
            if kwargs.get("shift_start") is not None:
                doc.shift_start = kwargs.get("shift_start")
            if kwargs.get("shift_end") is not None:
                doc.shift_end = kwargs.get("shift_end")
        doc.save(ignore_permissions=True)

    # Keep the User display name in sync with the barber name.
    if full_name:
        user_doc = frappe.get_doc("User", user)
        user_doc.first_name = full_name
        user_doc.last_name = ""
        user_doc.save(ignore_permissions=True)

    frappe.db.commit()
    return [_barber_workspace(r["name"]) for r in rows]


@frappe.whitelist()
def my_shops(phone: str | None = None) -> list[dict]:
    """Every shop the signed-in barber works in.

    Also claims any BB Barber records a shop owner pre-created for this
    barber's phone number (during shop onboarding) but never linked to a
    user — so a barber sees their shops the first time they log in.
    """
    user = frappe.session.user
    if user in ("Guest", None):
        return []

    # Resolve the phone to match on: prefer the explicit arg, else the User's.
    user_doc = frappe.get_doc("User", user)
    match_phone = normalize_phone(phone or user_doc.phone or user_doc.mobile_no)

    if match_phone:
        unclaimed = frappe.get_all(
            "BB Barber",
            filters={"user": ["in", ["", None]]},
            fields=["name", "phone", "barber_name"],
        )
        claimed_name = None
        for row in unclaimed:
            if normalize_phone(row.get("phone")) == match_phone:
                frappe.db.set_value("BB Barber", row["name"], "user", user)
                claimed_name = claimed_name or row.get("barber_name")
        # Adopt the owner-entered barber name onto the User if it's still the
        # default placeholder created at OTP signup, so the staff app greets
        # the barber correctly.
        if claimed_name and (user_doc.first_name in (None, "", "BarberBook")):
            user_doc.first_name = claimed_name
            user_doc.last_name = ""
            user_doc.save(ignore_permissions=True)
        frappe.db.commit()

    rows = frappe.get_all(
        "BB Barber", filters={"user": user}, fields=["name"], order_by="creation desc"
    )
    return [_barber_workspace(r["name"]) for r in rows]


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
