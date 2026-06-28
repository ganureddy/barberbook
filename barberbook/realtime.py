"""Realtime publishers for BarberBook DocTypes.

Each function is wired up in `hooks.doc_events`. We keep the bodies
small and side-effect free apart from the publish call so a buggy
broadcast can never block a save.

Channel naming follows the mobile client's `realtime.subscribe()` calls:

  * `walkin_queue:{shop}`  → fired on every BB Walkin Ticket change.
  * `booking:{user}`       → fired on every BB Booking insert / update.
  * `reviews:{shop}`       → fired when a customer leaves a review.
"""

from __future__ import annotations

import frappe


def publish_walkin_change(doc, method=None):  # noqa: D401 — Frappe hook signature.
    """Publish the live queue snapshot for the shop this ticket belongs to."""
    try:
        from barberbook.api.walkin import _snapshot

        snapshot = _snapshot(doc.shop)
        snapshot["reason"] = method or "change"
        frappe.publish_realtime(
            event=f"walkin_queue:{doc.shop}",
            message=snapshot,
            after_commit=True,
        )
    except Exception as e:  # pragma: no cover — best-effort broadcast
        frappe.log_error(title="walkin realtime publish failed", message=str(e))


def publish_booking_change(doc, method=None):
    """Notify the booking's customer that something moved on their plan."""
    try:
        payload = {
            "name": doc.name,
            "status": doc.status,
            "scheduled_at": str(doc.scheduled_at) if doc.scheduled_at else None,
            "shop": doc.shop,
            "barber": doc.barber,
            "total_amount": float(doc.total_amount or 0),
            "currency": doc.currency,
            "reason": method or "change",
        }
        frappe.publish_realtime(
            event=f"booking:{doc.customer}",
            message=payload,
            after_commit=True,
        )
        # Owner dashboards subscribe per-shop too.
        frappe.publish_realtime(
            event=f"shop_bookings:{doc.shop}",
            message=payload,
            after_commit=True,
        )
    except Exception as e:  # pragma: no cover
        frappe.log_error(title="booking realtime publish failed", message=str(e))


def publish_review_created(doc, method=None):
    """Owner inbox subscribes per-shop for fresh reviews."""
    try:
        frappe.publish_realtime(
            event=f"reviews:{doc.shop}",
            message={
                "name": doc.name,
                "rating": int(doc.rating or 0),
                "body": doc.body,
                "customer": doc.customer,
                "barber": doc.barber,
            },
            after_commit=True,
        )
    except Exception as e:  # pragma: no cover
        frappe.log_error(title="review realtime publish failed", message=str(e))
