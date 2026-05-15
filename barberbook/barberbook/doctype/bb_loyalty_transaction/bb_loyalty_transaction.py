from frappe.model.document import Document


class BBLoyaltyTransaction(Document):
    """Append-only delta on a customer's points. The BB Loyalty Account
    row is a cached aggregate; the truth is the sum of these deltas."""

    pass
