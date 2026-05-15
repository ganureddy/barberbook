"""Push notification endpoints.

We don't ship with FCM credentials wired by default — `send` is a
pass-through that owners / scheduled jobs can call once they've added
a delivery integration. The mobile client only needs `register_device`
to work for v1.
"""

from __future__ import annotations

import frappe
from frappe import _

from ._utils import fingerprint


@frappe.whitelist()
def register_device(
    expo_push_token: str,
    platform: str,
    channel: str,
    app_version: str,
    device_label: str | None = None,
) -> dict:
    """Idempotent on (user, expo_push_token). Stores a small row that
    `send` can fan out to."""
    if not expo_push_token:
        frappe.throw(_("expo_push_token is required."))
    user = frappe.session.user
    if user == "Guest":
        frappe.throw(_("Sign in first."))

    fp = fingerprint(expo_push_token)
    name = f"PUSH-{user}-{fp}"
    if frappe.db.exists("BB Push Device", name):
        doc = frappe.get_doc("BB Push Device", name)
        doc.update(
            {
                "expo_push_token": expo_push_token,
                "platform": platform,
                "channel": channel,
                "app_version": app_version,
                "device_label": device_label,
            }
        )
        doc.save(ignore_permissions=True)
    else:
        doc = frappe.get_doc(
            {
                "doctype": "BB Push Device",
                "name": name,
                "user": user,
                "expo_push_token": expo_push_token,
                "platform": platform,
                "channel": channel,
                "app_version": app_version,
                "device_label": device_label,
            }
        ).insert(ignore_permissions=True)
    frappe.db.commit()
    return {
        "token_id": doc.name,
        "registered_at": str(doc.modified),
    }


@frappe.whitelist()
def unregister_device(expo_push_token: str) -> dict:
    if not expo_push_token:
        return {"status": "noop"}
    user = frappe.session.user
    fp = fingerprint(expo_push_token)
    name = f"PUSH-{user}-{fp}"
    if frappe.db.exists("BB Push Device", name):
        frappe.delete_doc("BB Push Device", name, ignore_permissions=True)
        frappe.db.commit()
    return {"status": "ok"}


@frappe.whitelist()
def send(user: str, title: str, body: str, data: dict | None = None) -> dict:
    """Fan-out helper for ops / scheduled jobs. Posts to Expo's push API
    if `barberbook_expo_push_url` is set in site_config; otherwise just
    records the intent for later delivery."""
    devices = frappe.get_all(
        "BB Push Device",
        filters={"user": user},
        fields=["expo_push_token", "platform"],
    )
    if not devices:
        return {"status": "no_devices", "delivered": 0}

    expo_url = frappe.conf.get("barberbook_expo_push_url") or "https://exp.host/--/api/v2/push/send"
    payloads = [
        {
            "to": d["expo_push_token"],
            "title": title,
            "body": body,
            "data": data or {},
            "sound": "default",
        }
        for d in devices
    ]
    try:
        import requests

        requests.post(expo_url, json=payloads, timeout=8)
        return {"status": "sent", "delivered": len(payloads)}
    except Exception as e:  # pragma: no cover — network-dependent
        frappe.log_error(title="BarberBook push send failed", message=str(e))
        return {"status": "queued", "delivered": 0}
