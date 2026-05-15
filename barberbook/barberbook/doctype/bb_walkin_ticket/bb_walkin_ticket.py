"""BB Walkin Ticket — single position in a shop's walk-in queue.

The interesting behaviour (queue snapshot, realtime publishing) lives
in barberbook.api.walkin and barberbook.realtime; the controller stays
simple so doc events fire on every save without surprise side-effects.
"""

from __future__ import annotations

from frappe.model.document import Document


class BBWalkinTicket(Document):
    pass
