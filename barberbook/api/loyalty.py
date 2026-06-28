"""Loyalty endpoints.

  * `balance(shop)` — current points + tier for the active customer at
    a shop. Computed live from the BB Loyalty Transaction table so the
    BB Loyalty Account row stays an aggregate cache, not a source of
    truth.
  * `earn` / `redeem` — manual adjustments. The booking flow earns and
    redeems automatically (see `barberbook.api.booking.create`).
"""

from __future__ import annotations

import frappe
from frappe import _

LOYALTY_POINT_VALUE = 0.5  # ₹ per point.

TIER_THRESHOLDS = (("Silver", 0), ("Gold", 2000), ("Platinum", 5000))


def _tier_for(lifetime_points: int) -> str:
    cur = "Silver"
    for tier, threshold in TIER_THRESHOLDS:
        if lifetime_points >= threshold:
            cur = tier
    return cur


@frappe.whitelist()
def balance(shop: str) -> dict | None:
    customer = frappe.session.user
    if not customer or customer == "Guest":
        return None
    txns = frappe.get_all(
        "BB Loyalty Transaction",
        filters={"customer": customer, "shop": shop},
        fields=["delta", "reason"],
    )
    points = sum(int(t.delta or 0) for t in txns)
    lifetime = sum(int(t.delta or 0) for t in txns if (t.delta or 0) > 0)
    tier = _tier_for(lifetime)
    return {
        "name": f"LOY-{shop}-{customer}",
        "doctype": "BB Loyalty Account",
        "customer": customer,
        "shop": shop,
        "points_balance": points,
        "lifetime_points": lifetime,
        "tier": tier,
    }


@frappe.whitelist()
def earn(shop: str, points: int, reason: str = "Manual") -> dict:
    if int(points) <= 0:
        frappe.throw(_("Points must be positive."))
    frappe.get_doc(
        {
            "doctype": "BB Loyalty Transaction",
            "customer": frappe.session.user,
            "shop": shop,
            "delta": int(points),
            "reason": reason,
        }
    ).insert(ignore_permissions=True)
    frappe.db.commit()
    return balance(shop) or {}


@frappe.whitelist()
def redeem(shop: str, points: int) -> dict:
    """Redeem `points`. Returns the equivalent ₹ value alongside the
    new balance."""
    pts = int(points)
    if pts <= 0:
        frappe.throw(_("Points must be positive."))
    current = balance(shop)
    if not current or current["points_balance"] < pts:
        frappe.throw(_("Insufficient points."))
    frappe.get_doc(
        {
            "doctype": "BB Loyalty Transaction",
            "customer": frappe.session.user,
            "shop": shop,
            "delta": -pts,
            "reason": "Redemption",
        }
    ).insert(ignore_permissions=True)
    frappe.db.commit()
    return {
        "account": balance(shop),
        "redeemed_value": round(pts * LOYALTY_POINT_VALUE, 2),
    }
