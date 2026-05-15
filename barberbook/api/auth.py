"""Phone-based OTP authentication.

Two whitelisted endpoints:

  * `request_otp(phone)` — generate a 6-digit code, store it hashed in the
    Frappe cache for 5 minutes, return delivery metadata. SMS delivery is
    pluggable (see `_send_otp`); when `EXPO_PUBLIC_MOCK=1` the mobile
    client expects '4242' regardless, so dev / staging sites are configured
    with a fixed `barberbook_dev_otp` site_config flag.
  * `verify_otp(phone, code)` — exchange (phone, code) for a SessionUser
    + sid. Creates the User on first verify and assigns the Customer role.

Both endpoints are `allow_guest=True` because the caller is by definition
unauthenticated.
"""

from __future__ import annotations

import hashlib
import secrets

import frappe
from frappe import _
from frappe.utils.password import update_password

OTP_TTL_SECONDS = 5 * 60
MAX_VERIFY_ATTEMPTS = 5


def _phone_key(phone: str) -> str:
    return f"barberbook:otp:{hashlib.sha1(phone.encode(), usedforsecurity=False).hexdigest()}"


def _hash_code(code: str) -> str:
    return hashlib.sha256(code.encode()).hexdigest()


def _send_otp(phone: str, code: str) -> str:
    """Hand off the OTP to the configured delivery backend.

    Returns the delivery channel name (`sms` / `whatsapp` / `mock`).
    Real SMS integration belongs to a Frappe SMS Settings doc — until
    that's wired by ops, we log the code in dev (`bench start` console)
    and surface it via _server_messages so the mobile client can show it
    in DevHud.
    """
    if frappe.conf.get("barberbook_dev_otp"):
        # Dev / staging path: the SMS gateway isn't configured. Log the
        # code so testers can read it from the bench logs.
        frappe.log_error(
            title="BarberBook OTP (dev)",
            message=f"Phone={phone} OTP={code}",
        )
        frappe.msgprint(
            _("Dev OTP for {0}: {1}").format(phone, code),
            indicator="blue",
            title=_("Mock mode"),
        )
        return "mock"

    sms_settings = frappe.db.exists("DocType", "SMS Settings")
    if sms_settings:
        try:
            from frappe.core.doctype.sms_settings.sms_settings import send_sms

            send_sms([phone], f"Your BarberBook code is {code}. Valid 5 minutes.")
            return "sms"
        except Exception as e:  # pragma: no cover — depends on bench config
            frappe.log_error(title="BarberBook SMS send failed", message=str(e))
    return "queued"


@frappe.whitelist(allow_guest=True)
def request_otp(phone: str) -> dict:
    """Generate + send a 6-digit OTP for the given phone number."""
    if not phone or len(phone.strip()) < 8:
        frappe.throw(_("Phone number is required."))

    code = f"{secrets.randbelow(1_000_000):06d}"
    if frappe.conf.get("barberbook_dev_otp"):
        # Predictable dev code so tests don't have to read logs.
        code = "424242"

    payload = {
        "code_hash": _hash_code(code),
        "attempts": 0,
        "phone": phone,
    }
    frappe.cache().set_value(
        _phone_key(phone),
        payload,
        expires_in_sec=OTP_TTL_SECONDS,
    )

    delivery = _send_otp(phone, code)
    return {
        "phone": phone,
        "delivery": delivery,
    }


@frappe.whitelist(allow_guest=True)
def verify_otp(phone: str, code: str) -> dict:
    """Verify (phone, code). On success, returns the active session."""
    if not phone or not code:
        frappe.throw(_("Phone and code are required."))

    cache_key = _phone_key(phone)
    cached = frappe.cache().get_value(cache_key) or {}
    if not cached:
        frappe.throw(_("OTP expired. Request a new one."))

    if cached.get("attempts", 0) >= MAX_VERIFY_ATTEMPTS:
        frappe.cache().delete_value(cache_key)
        frappe.throw(_("Too many attempts. Request a new code."))

    if cached.get("code_hash") != _hash_code(code.strip()):
        cached["attempts"] = cached.get("attempts", 0) + 1
        frappe.cache().set_value(cache_key, cached, expires_in_sec=OTP_TTL_SECONDS)
        frappe.throw(_("Invalid code."))

    frappe.cache().delete_value(cache_key)

    user = _ensure_customer_user(phone)
    sid = _start_session(user)

    return {
        "user": _serialize_user(user, sid),
        "sid": sid,
    }


@frappe.whitelist()
def me() -> dict | None:
    """Return the current SessionUser, or None when not logged in."""
    if frappe.session.user in ("Guest", None):
        return None
    user_doc = frappe.get_doc("User", frappe.session.user)
    return _serialize_user(user_doc, frappe.session.sid)


# ─── helpers ────────────────────────────────────────────────────────────


def _ensure_customer_user(phone: str) -> "frappe.Document":
    """Find or create the User for `phone`. New users get the Customer role
    and a random secure password (they sign in with OTP, not the password)."""
    email = _phone_to_email(phone)
    existing = frappe.db.get_value("User", {"email": email}, "name")
    if existing:
        return frappe.get_doc("User", existing)

    user = frappe.new_doc("User")
    user.update(
        {
            "email": email,
            "first_name": "BarberBook",
            "last_name": "Customer",
            "phone": phone,
            "mobile_no": phone,
            "send_welcome_email": 0,
            "user_type": "Website User",
            "enabled": 1,
        }
    )
    user.append("roles", {"role": "Customer"})
    user.flags.no_welcome_mail = True
    user.insert(ignore_permissions=True)

    # Set a strong random password the user will never use.
    update_password(user.name, secrets.token_urlsafe(32))

    frappe.db.commit()
    return user


def _phone_to_email(phone: str) -> str:
    """Map an E.164 phone to the User's email field. Stable per phone."""
    sanitized = "".join(ch for ch in phone if ch.isdigit())
    return f"+{sanitized}@barberbook.app"


def _start_session(user) -> str:
    """Open a Frappe session for `user` and return the sid."""
    from frappe.auth import LoginManager

    lm = LoginManager()
    lm.login_as(user.name)
    return frappe.session.sid


def _serialize_user(user, sid: str | None) -> dict:
    roles = [r.role for r in (user.get("roles") or [])]
    active_role = "Customer"
    if "Shop Owner" in roles:
        active_role = "Owner"
    elif "Barber Staff" in roles:
        active_role = "Staff"
    return {
        "email": user.email,
        "full_name": user.full_name or user.first_name or user.email,
        "phone": user.phone or user.mobile_no or "",
        "avatar_seed": user.email,
        "roles": _map_roles(roles),
        "active_role": active_role,
        "sid": sid,
    }


def _map_roles(roles: list[str]) -> list[str]:
    """Translate Frappe role names to the mobile client's UserRole vocab."""
    out: list[str] = []
    if "Customer" in roles:
        out.append("Customer")
    if "Shop Owner" in roles:
        out.append("Owner")
    if "Barber Staff" in roles:
        out.append("Staff")
    if "System Manager" in roles:
        out.append("Admin")
    return out or ["Customer"]
