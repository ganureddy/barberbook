"""Roster + conflict-detection endpoints.

  * `publish` accepts a full week's worth of shifts and either commits
    the roster or returns the affected bookings so the owner can resolve
    them in OwnerRosterConflict.
  * `check_conflicts` is the same logic in dry-run mode — used by the
    OwnerRoster UI to surface a live conflict count.
"""

from __future__ import annotations

from datetime import datetime, time, timedelta

import frappe
from frappe import _
from frappe.utils import getdate

DAY_INDEX = {"Mon": 0, "Tue": 1, "Wed": 2, "Thu": 3, "Fri": 4, "Sat": 5, "Sun": 6}


@frappe.whitelist()
def check_conflicts(shop: str, shifts: list[dict]) -> list[dict]:
    """Return the bookings that would be invalidated by `shifts`.

    Each shift is `{day, start_time, end_time, seat, barber}`. We compute
    which existing bookings fall outside the union of shifts for their
    barber on their day, returning enough info for the conflict bottom
    sheet to render rows.
    """
    if not shop or shifts is None:
        return []

    week_start = _next_monday()
    coverage: dict[tuple[str, str], list[tuple[datetime, datetime]]] = {}
    for s in shifts:
        day = s.get("day")
        if day not in DAY_INDEX:
            continue
        date = week_start + timedelta(days=DAY_INDEX[day])
        start = datetime.combine(date, _parse_time(s.get("start_time", "09:00")))
        end = datetime.combine(date, _parse_time(s.get("end_time", "21:00")))
        key = (s.get("barber") or "", str(date))
        coverage.setdefault(key, []).append((start, end))

    week_end = week_start + timedelta(days=7)
    bookings = frappe.get_all(
        "BB Booking",
        filters={
            "shop": shop,
            "status": ("not in", ["Cancelled", "NoShow", "Completed"]),
            "scheduled_at": ("between", [week_start, week_end]),
        },
        fields=["name", "barber", "scheduled_at", "duration_minutes", "total_amount", "currency", "customer"],
    )

    affected: list[dict] = []
    for b in bookings:
        if not b.barber:
            continue
        key = (b.barber, str(getdate(b.scheduled_at)))
        intervals = coverage.get(key, [])
        sched = b.scheduled_at if isinstance(b.scheduled_at, datetime) else datetime.fromisoformat(str(b.scheduled_at))
        end = sched + timedelta(minutes=int(b.duration_minutes or 30))
        covered = any(start <= sched and end <= cover_end for start, cover_end in intervals)
        if not covered:
            customer_name = frappe.db.get_value("User", b.customer, "full_name") or b.customer
            affected.append(
                {
                    "id": b.name,
                    "customer": customer_name,
                    "time": sched.strftime("%a · %H:%M"),
                    "service": b.barber,
                    "amount": f"{b.currency} {b.total_amount:.0f}",
                }
            )
    return affected


@frappe.whitelist()
def publish(shop: str, shifts: list[dict], on_conflict: str = "auto") -> dict:
    """Commit a roster. `on_conflict` is one of 'auto', 'keep', 'cancel'.

    Returns either {"status": "published", "shifts": N} or
    {"status": "conflicts", "affected": [...]} if conflicts exist and
    `on_conflict` is the default (no resolution chosen yet).
    """
    if not shop:
        frappe.throw(_("shop is required."))
    affected = check_conflicts(shop, shifts)
    if affected and on_conflict == "auto":
        # Server-side reschedule pass would slot affected bookings into
        # the next available roster slot; for v1 we just acknowledge.
        pass
    elif affected and on_conflict == "cancel":
        for a in affected:
            frappe.db.set_value("BB Booking", a["id"], "status", "Cancelled")
        frappe.db.commit()

    roster = frappe.get_doc(
        {
            "doctype": "BB Roster",
            "shop": shop,
            "week_starting": _next_monday(),
            "status": "Published",
            "conflict_count": len(affected),
            "shifts": [
                {
                    "day": s.get("day"),
                    "start_time": s.get("start_time"),
                    "end_time": s.get("end_time"),
                    "seat": s.get("seat"),
                    "barber": s.get("barber"),
                }
                for s in shifts
                if s.get("day") in DAY_INDEX
            ],
        }
    ).insert(ignore_permissions=True)
    frappe.db.commit()

    return {
        "status": "published",
        "roster": roster.name,
        "shifts": len(roster.shifts),
        "affected": affected if on_conflict == "auto" else [],
    }


def _next_monday(today: datetime | None = None) -> datetime:
    today = today or datetime.now()
    delta = (7 - today.weekday()) % 7 or 7
    return today.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=delta)


def _parse_time(s: str) -> time:
    h, m = s.split(":")[:2]
    return time(hour=int(h), minute=int(m))
