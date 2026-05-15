"""Walk-in queue endpoints.

Customers join, owners call/complete, the queue ETA is recomputed
hourly via the scheduler. Every state-changing endpoint publishes on the
realtime channel `walkin_queue:{shop}` so connected clients (customer
Walkin screen, OwnerWalkin) update instantly.
"""

from __future__ import annotations

from datetime import datetime, timedelta

import frappe
from frappe import _
from frappe.utils import now_datetime

from ._utils import serialize_doc, with_idempotency


def _publish_queue(shop: str, reason: str) -> None:
    snapshot = _snapshot(shop)
    snapshot["reason"] = reason
    frappe.publish_realtime(
        event=f"walkin_queue:{shop}",
        message=snapshot,
        after_commit=True,
    )


def _snapshot(shop: str) -> dict:
    tickets = frappe.get_all(
        "BB Walkin Ticket",
        filters={"shop": shop, "status": ("!=", "Cancelled")},
        fields=[
            "name",
            "shop",
            "customer",
            "customer_phone",
            "token_number",
            "position_in_queue",
            "estimated_wait_minutes",
            "status",
            "joined_at",
            "served_at",
        ],
        order_by="position_in_queue asc, joined_at asc",
    )
    next_token = next(
        (t.token_number for t in tickets if t.status in ("Waiting", "NextUp")), None
    )
    avg_wait = (
        round(sum(int(t.estimated_wait_minutes or 0) for t in tickets) / max(1, len(tickets)))
        if tickets
        else 0
    )
    return {
        "shop": shop,
        "total_in_queue": sum(1 for t in tickets if t.status not in ("Completed",)),
        "next_token": next_token,
        "estimated_wait_minutes": avg_wait,
        "tickets": tickets,
    }


@frappe.whitelist()
def join(shop: str, customer_phone: str | None = None) -> dict:
    """Take a ticket. Idempotent on the Idempotency-Key header."""

    def _do() -> dict:
        if not shop:
            frappe.throw(_("shop is required."))
        position = (
            frappe.db.count(
                "BB Walkin Ticket",
                {"shop": shop, "status": ("in", ["Waiting", "NextUp"])},
            )
            + 1
        )
        token = frappe.db.count("BB Walkin Ticket", {"shop": shop}) + 1
        ticket = frappe.get_doc(
            {
                "doctype": "BB Walkin Ticket",
                "shop": shop,
                "customer": frappe.session.user if frappe.session.user != "Guest" else None,
                "customer_phone": customer_phone,
                "token_number": f"{token:02d}",
                "position_in_queue": position,
                "estimated_wait_minutes": position * 15,
                "status": "Waiting",
                "joined_at": now_datetime(),
            }
        ).insert(ignore_permissions=True)
        frappe.db.commit()
        _publish_queue(shop, "join")
        return serialize_doc(ticket)

    return with_idempotency("walkin.join", _do)


@frappe.whitelist()
def snapshot(shop: str) -> dict:
    return _snapshot(shop)


@frappe.whitelist()
def cancel(name: str) -> dict:
    ticket = frappe.get_doc("BB Walkin Ticket", name)
    ticket.status = "Cancelled"
    ticket.save(ignore_permissions=True)
    frappe.db.commit()
    _publish_queue(ticket.shop, "cancel")
    return serialize_doc(ticket)


@frappe.whitelist()
def call(shop: str, name: str) -> dict:
    """Owner action: bring this ticket up to be served."""
    ticket = frappe.get_doc("BB Walkin Ticket", name)
    ticket.status = "NextUp"
    ticket.estimated_wait_minutes = 0
    ticket.save(ignore_permissions=True)
    frappe.db.commit()
    _publish_queue(shop, "call")
    return serialize_doc(ticket)


@frappe.whitelist()
def done(shop: str, name: str) -> dict:
    """Owner action: mark this ticket served."""
    ticket = frappe.get_doc("BB Walkin Ticket", name)
    ticket.status = "Completed"
    ticket.served_at = now_datetime()
    ticket.save(ignore_permissions=True)
    frappe.db.commit()
    _publish_queue(shop, "done")
    return serialize_doc(ticket)


def recompute_eta() -> None:
    """Hourly scheduled job. Re-prices ETAs based on the live queue size
    and broadcasts to subscribed clients. Cheap O(N) sweep.

    Runs across every shop with at least one open ticket.
    """
    shops = frappe.get_all(
        "BB Walkin Ticket",
        filters={"status": ("in", ["Waiting", "NextUp"])},
        fields=["shop"],
        distinct=True,
    )
    for row in shops:
        shop_name = row["shop"] if isinstance(row, dict) else row.shop
        tickets = frappe.get_all(
            "BB Walkin Ticket",
            filters={"shop": shop_name, "status": ("in", ["Waiting", "NextUp"])},
            fields=["name"],
            order_by="position_in_queue asc, joined_at asc",
        )
        for i, t in enumerate(tickets):
            frappe.db.set_value(
                "BB Walkin Ticket",
                t["name"],
                {"position_in_queue": i + 1, "estimated_wait_minutes": (i + 1) * 15},
                update_modified=False,
            )
        frappe.db.commit()
        _publish_queue(shop_name, "recompute_eta")
