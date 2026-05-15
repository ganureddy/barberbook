"""Review endpoints.

  * `submit` — only verified bookings (`Completed`) can be reviewed,
    and only by the booking's customer. One review per booking.
  * `respond` — owner / staff replies (one per review).
  * `draft_response` — server-side AI-style draft. The current
    implementation is template-based (no LLM dependency), but the
    contract is shaped so a future swap to OpenAI / Anthropic /
    on-prem Llama is a one-file change.
"""

from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import now

from ._utils import serialize_doc


@frappe.whitelist()
def submit(shop: str, rating: int, booking: str | None = None, body: str | None = None, barber: str | None = None) -> dict:
    rating = int(rating)
    if rating < 1 or rating > 5:
        frappe.throw(_("Rating must be 1–5."))
    if not shop:
        frappe.throw(_("Shop is required."))

    if booking:
        booking_doc = frappe.get_doc("BB Booking", booking)
        if booking_doc.customer != frappe.session.user:
            frappe.throw(_("Not your booking."))
        if booking_doc.status != "Completed":
            frappe.throw(_("Only completed bookings can be reviewed."))
        if frappe.db.exists("BB Review", {"booking": booking}):
            frappe.throw(_("You've already reviewed this booking."))

    review = frappe.get_doc(
        {
            "doctype": "BB Review",
            "customer": frappe.session.user,
            "shop": shop,
            "barber": barber,
            "booking": booking,
            "rating": rating,
            "body": body,
        }
    ).insert(ignore_permissions=True)

    # Update the rolling shop rating cache.
    _refresh_shop_rating(shop)
    frappe.db.commit()
    return serialize_doc(review)


@frappe.whitelist()
def respond(name: str, reply: str) -> dict:
    if not reply or len(reply.strip()) < 2:
        frappe.throw(_("Reply is required."))
    review = frappe.get_doc("BB Review", name)
    # Permission: owner of the shop, or System Manager.
    shop_owner = frappe.db.get_value("BB Shop", review.shop, "owner_user")
    if frappe.session.user != shop_owner and "System Manager" not in frappe.get_roles():
        frappe.throw(_("Not permitted to respond."))
    review.reply = reply.strip()
    review.reply_at = now()
    review.save(ignore_permissions=True)
    frappe.db.commit()
    return serialize_doc(review)


@frappe.whitelist()
def draft_response(review: str, tone: str = "neutral") -> dict:
    """Template-based draft. Future: swap for an LLM call."""
    rev = frappe.get_doc("BB Review", review)
    if rev.rating >= 4:
        if tone == "grateful":
            draft = (
                "Thank you so much for the kind words — we'll pass them straight to the team. "
                "See you on your next visit!"
            )
        else:
            draft = (
                "Thanks for taking the time to share this. "
                "We're glad you enjoyed your visit and we'll keep raising the bar."
            )
    else:
        if tone == "apologetic":
            draft = (
                "We're truly sorry your visit didn't meet expectations. "
                "Please DM us so we can make it right on your next chair."
            )
        else:
            draft = (
                "Thanks for the honest feedback — we've shared it with the barber and "
                "we'd love a second chance to do better."
            )
    return {"draft": draft, "tokens": len(draft.split())}


def _refresh_shop_rating(shop: str) -> None:
    rows = frappe.get_all(
        "BB Review",
        filters={"shop": shop},
        fields=["rating"],
    )
    count = len(rows)
    if count == 0:
        return
    avg = sum(int(r.rating) for r in rows) / count
    frappe.db.set_value("BB Shop", shop, {"rating": round(avg, 2), "rating_count": count}, update_modified=False)
