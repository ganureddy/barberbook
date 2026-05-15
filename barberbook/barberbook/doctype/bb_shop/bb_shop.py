"""BB Shop — top-level salon record. Owned by a User with the Shop Owner role."""

from __future__ import annotations

from frappe.model.document import Document


class BBShop(Document):
    def autoname(self):
        # Frappe handles the format: autoname above; only stub here so
        # subclassing is straightforward later.
        super().autoname()

    def validate(self):
        # Default the slug from the shop name when missing.
        if not self.slug and self.shop_name:
            self.slug = (
                "".join(ch.lower() if ch.isalnum() else "-" for ch in self.shop_name)
                .strip("-")
                .replace("--", "-")
            )
