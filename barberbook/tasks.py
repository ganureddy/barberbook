"""Scheduled background jobs for BarberBook.

Wired up in `hooks.scheduler_events`. Each function must be idempotent
because Frappe's scheduler can replay a task on retry.
"""

from __future__ import annotations

from datetime import datetime, timedelta

import frappe


LOYALTY_EXPIRY_DAYS = 365


def expire_loyalty() -> None:
    """Zero out points older than `LOYALTY_EXPIRY_DAYS` by booking an
    offsetting transaction. Safe to run daily — once a transaction is
    "expired" we tag it with `reason='Expiry'` so the next run skips it.
    """
    cutoff = datetime.now() - timedelta(days=LOYALTY_EXPIRY_DAYS)
    aged = frappe.get_all(
        "BB Loyalty Transaction",
        filters={
            "creation": ("<", cutoff),
            "reason": ("not in", ["Expiry", "Redemption"]),
            "delta": (">", 0),
        },
        fields=["name", "customer", "shop", "delta"],
        limit_page_length=500,
    )
    for row in aged:
        try:
            frappe.get_doc(
                {
                    "doctype": "BB Loyalty Transaction",
                    "customer": row["customer"],
                    "shop": row["shop"],
                    "delta": -int(row["delta"]),
                    "reason": "Expiry",
                }
            ).insert(ignore_permissions=True)
            frappe.db.set_value("BB Loyalty Transaction", row["name"], "reason", "Expiry", update_modified=False)
        except Exception as e:  # pragma: no cover — best-effort housekeeping
            frappe.log_error(title="loyalty expiry failed", message=f"{row} — {e}")
    frappe.db.commit()
