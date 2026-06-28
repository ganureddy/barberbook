"""Row-level data scoping for BarberBook operational records.

The principle: **booking / financial / walk-in data belongs to the shop**.
A shop owner only ever sees their own shops' data, a barber only the shops
they work in, and a customer only their own records. Public catalogue data
(shops, services, barbers, reviews) stays readable so discovery works.

Frappe calls two hooks per DocType (wired in `hooks.py`):

  * `permission_query_conditions` — an SQL `WHERE` fragment appended to every
    list query, so `frappe.get_all(...)` (used throughout the API) can never
    return another shop's rows.
  * `has_permission` — a per-document check for single-record reads/writes
    (`frappe.get_doc`, `.save`, etc.).

Both are bypassed for System Manager / Administrator.
"""

from __future__ import annotations

import frappe


def _is_privileged(user: str) -> bool:
    return user == "Administrator" or "System Manager" in frappe.get_roles(user)


def _owned_shops(user: str) -> list[str]:
    return frappe.get_all("BB Shop", filters={"owner_user": user}, pluck="name")


def _barber_shops(user: str) -> list[str]:
    return frappe.get_all("BB Barber", filters={"user": user}, pluck="shop")


def _scoped_shops(user: str) -> set[str]:
    """Shops the user may see operational data for (as owner or barber)."""
    return set(_owned_shops(user)) | set(_barber_shops(user))


def _shop_in_clause(doctype: str, user: str) -> str | None:
    shops = _scoped_shops(user)
    if not shops:
        return None
    rendered = ", ".join(frappe.db.escape(s) for s in shops)
    return f"`tab{doctype}`.shop in ({rendered})"


# ─── BB Booking ──────────────────────────────────────────────────────────────


def booking_query_conditions(user: str | None = None) -> str:
    user = user or frappe.session.user
    if _is_privileged(user):
        return ""
    clauses = [f"`tabBB Booking`.customer = {frappe.db.escape(user)}"]
    shop_clause = _shop_in_clause("BB Booking", user)
    if shop_clause:
        clauses.append(shop_clause)
    return "(" + " or ".join(clauses) + ")"


def booking_has_permission(doc, ptype: str | None = None, user: str | None = None) -> bool:
    user = user or frappe.session.user
    if _is_privileged(user):
        return True
    if doc.get("customer") == user:
        return True
    return doc.get("shop") in _scoped_shops(user)


# ─── BB Walkin Ticket ────────────────────────────────────────────────────────


def walkin_query_conditions(user: str | None = None) -> str:
    user = user or frappe.session.user
    if _is_privileged(user):
        return ""
    clauses = [f"`tabBB Walkin Ticket`.customer = {frappe.db.escape(user)}"]
    shop_clause = _shop_in_clause("BB Walkin Ticket", user)
    if shop_clause:
        clauses.append(shop_clause)
    return "(" + " or ".join(clauses) + ")"


def walkin_has_permission(doc, ptype: str | None = None, user: str | None = None) -> bool:
    user = user or frappe.session.user
    if _is_privileged(user):
        return True
    if doc.get("customer") == user:
        return True
    return doc.get("shop") in _scoped_shops(user)


# ─── BB Payment ──────────────────────────────────────────────────────────────


def payment_query_conditions(user: str | None = None) -> str:
    user = user or frappe.session.user
    if _is_privileged(user):
        return ""
    clauses = [f"`tabBB Payment`.customer = {frappe.db.escape(user)}"]
    # Payments are settled to the shop owner only (not barbers).
    owned = _owned_shops(user)
    if owned:
        rendered = ", ".join(frappe.db.escape(s) for s in owned)
        clauses.append(f"`tabBB Payment`.shop in ({rendered})")
    return "(" + " or ".join(clauses) + ")"


def payment_has_permission(doc, ptype: str | None = None, user: str | None = None) -> bool:
    user = user or frappe.session.user
    if _is_privileged(user):
        return True
    if doc.get("customer") == user:
        return True
    return doc.get("shop") in set(_owned_shops(user))
