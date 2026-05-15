from frappe.model.document import Document


class BBBooking(Document):
    """A confirmed appointment. Holds the joint-key denormalized fields
    (token, total) the mobile client expects so we can return a single
    object without joining."""

    pass
