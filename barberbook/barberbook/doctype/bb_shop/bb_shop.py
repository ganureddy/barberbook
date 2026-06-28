"""BB Shop — top-level salon record. Owned by a User with the Shop Owner role."""

from __future__ import annotations

from frappe.model.document import Document


class BBShop(Document):
    # `autoname` is declared in the DocType JSON (`format:BBSHOP-{#####}` or
    # similar). The base `Document` class does NOT expose an `autoname`
    # method to call into via `super()` — Frappe applies the JSON-declared
    # rule directly. Overriding the method here was the bug; we now leave
    # the controller's autoname unimplemented so Frappe's default kicks in.

    def validate(self):
        # Default the slug from the shop name when missing.
        if not self.slug and self.shop_name:
            self.slug = (
                "".join(ch.lower() if ch.isalnum() else "-" for ch in self.shop_name)
                .strip("-")
                .replace("--", "-")
            )
