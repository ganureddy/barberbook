# Re-export submodules so `bench execute barberbook.api.<x>` resolves and
# the path strings the mobile client uses (`barberbook.api.auth.request_otp`
# etc.) work without a per-call __import__ dance.

from barberbook.api import (
    auth,
    booking,
    discovery,
    loyalty,
    owner,
    push,
    review,
    roster,
    staff,
    walkin,
)

__all__ = [
    "auth",
    "booking",
    "discovery",
    "loyalty",
    "owner",
    "push",
    "review",
    "roster",
    "staff",
    "walkin",
]
