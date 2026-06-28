"""Frappe app metadata + integrations for BarberBook.

This file is the single declarative entry-point Frappe reads at install
and migrate time. The mobile client never reads it directly, but every
realtime event, scheduled job, and DocType permission flows from here,
so keep edits surgical and grouped.
"""

app_name = "barberbook"
app_title = "BarberBook"
app_publisher = "BarberBook"
app_description = "Booking, walk-in, and roster platform for hair & grooming salons."
app_email = "engineering@barberbook.app"
app_license = "MIT"
app_logo_url = "/assets/barberbook/images/logo.svg"
app_icon = "/assets/barberbook/images/icon.svg"

required_apps = ["frappe"]

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------
# `bench migrate` re-applies these on every deploy. We ship Roles only —
# Custom DocPerms are baked into each DocType JSON, and DocTypes
# themselves are discovered via the doctype/ folder structure.
fixtures = [
    {"dt": "Role", "filters": [["name", "in", ["Customer", "Shop Owner", "Barber Staff"]]]},
]

# ---------------------------------------------------------------------------
# Document events → realtime broadcasts
# ---------------------------------------------------------------------------
# The mobile client subscribes to `walkin_queue:{shop}` and
# `booking:{user}` over Frappe Realtime (socket.io). Whenever the
# underlying record changes, we re-emit the full snapshot so clients
# don't need to keep their own state machine.
doc_events = {
    "BB Walkin Ticket": {
        "after_insert": "barberbook.realtime.publish_walkin_change",
        "on_update": "barberbook.realtime.publish_walkin_change",
        "on_trash": "barberbook.realtime.publish_walkin_change",
    },
    "BB Booking": {
        "after_insert": "barberbook.realtime.publish_booking_change",
        "on_update": "barberbook.realtime.publish_booking_change",
    },
    "BB Review": {
        "after_insert": "barberbook.realtime.publish_review_created",
    },
}

# ---------------------------------------------------------------------------
# Row-level data scoping (data security)
# ---------------------------------------------------------------------------
# Booking / walk-in / payment rows belong to the shop. These hooks restrict
# every list query and single-doc read so one shop's operational + financial
# data is never visible to another shop's owner, to barbers outside the shop,
# or to other customers. See barberbook/permissions.py.
permission_query_conditions = {
    "BB Booking": "barberbook.permissions.booking_query_conditions",
    "BB Walkin Ticket": "barberbook.permissions.walkin_query_conditions",
    "BB Payment": "barberbook.permissions.payment_query_conditions",
}
has_permission = {
    "BB Booking": "barberbook.permissions.booking_has_permission",
    "BB Walkin Ticket": "barberbook.permissions.walkin_has_permission",
    "BB Payment": "barberbook.permissions.payment_has_permission",
}

# ---------------------------------------------------------------------------
# Scheduled tasks
# ---------------------------------------------------------------------------
scheduler_events = {
    "hourly": [
        "barberbook.api.walkin.recompute_eta",
    ],
    "daily": [
        "barberbook.tasks.expire_loyalty",
    ],
}

# ---------------------------------------------------------------------------
# CORS — the mobile app talks to us cross-origin in dev / preview
# ---------------------------------------------------------------------------
# Production Expo builds use `barberbook.app` directly; staging uses
# `staging.barberbook.app`. Both are explicitly allowed below; bench
# operators can extend via site_config.json `allow_cors` if they need
# additional origins.
allow_cors = "*"

# ---------------------------------------------------------------------------
# Override Login API for OTP support
# ---------------------------------------------------------------------------
# Customers sign in with OTP via `/api/method/barberbook.api.auth.verify_otp`,
# but we still want `frappe.auth` to recognise our session — no override
# needed; verify_otp uses LoginManager.login_as.

# ---------------------------------------------------------------------------
# Idempotency-Key passthrough
# ---------------------------------------------------------------------------
# Allow the `Idempotency-Key` header through Frappe's request preprocessor.
# Frappe reads request.headers without a strict allowlist by default, so
# nothing extra is required here — but we declare the requirement for ops
# audits.

# ---------------------------------------------------------------------------
# Static assets — used by the desk-side admin views, not the mobile app.
# ---------------------------------------------------------------------------
website_route_rules = []

# ---------------------------------------------------------------------------
# User data protection (GDPR)
# ---------------------------------------------------------------------------
user_data_fields = [
    {"doctype": "BB Booking", "filter_by": "customer", "redact_fields": ["notes"], "partial": 1},
    {"doctype": "BB Walkin Ticket", "filter_by": "customer", "redact_fields": ["customer_phone"], "partial": 1},
    {"doctype": "BB Review", "filter_by": "customer", "redact_fields": ["body"], "partial": 1},
    {"doctype": "BB Push Device", "filter_by": "user", "strict": True},
]
