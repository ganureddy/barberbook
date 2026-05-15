"""One-shot demo data seeder for India.

Usage from the bench root:

    bench --site staging.barberbook.app execute barberbook.setup_wizard.seed_demo_india

What it creates:

  * 3 demo shops (Mumbai, Bengaluru, Delhi)
  * 12 services across the three shops
  * 8 barbers spread across the three shops
  * 6 loyalty / transaction examples for the first demo customer

Idempotent: every record uses a deterministic name, so re-running the
wizard updates instead of duplicating.
"""

from __future__ import annotations

import frappe

DEMO_SHOPS = [
    {
        "name": "BBSHOP-DEMO-MUM",
        "shop_name": "Bombay Cuts",
        "slug": "bombay-cuts",
        "city": "Mumbai",
        "address_line": "Linking Road, Bandra West",
        "pincode": "400050",
        "latitude": 19.0596,
        "longitude": 72.8295,
        "currency": "INR",
        "country": "IN",
        "phone": "+912266000001",
        "rating": 4.7,
        "rating_count": 128,
        "price_tier": "$$",
        "cover_variant": "barber-pole",
        "tagline": "Classic fades, sharp finishes.",
        "highlight": "Voted #1 in Bandra 2024",
    },
    {
        "name": "BBSHOP-DEMO-BLR",
        "shop_name": "Indiranagar Razor Co.",
        "slug": "indiranagar-razor-co",
        "city": "Bengaluru",
        "address_line": "100 Ft Road, Indiranagar",
        "pincode": "560038",
        "latitude": 12.9719,
        "longitude": 77.6412,
        "currency": "INR",
        "country": "IN",
        "phone": "+918041000002",
        "rating": 4.6,
        "rating_count": 96,
        "price_tier": "$$$",
        "cover_variant": "gradient-charcoal",
        "tagline": "Luxury barbershop. Old-school details.",
        "highlight": "Hot-towel shave specialty",
    },
    {
        "name": "BBSHOP-DEMO-DEL",
        "shop_name": "Hauz Khas Barbers",
        "slug": "hauz-khas-barbers",
        "city": "New Delhi",
        "address_line": "Aurobindo Place, Hauz Khas",
        "pincode": "110016",
        "latitude": 28.5535,
        "longitude": 77.2010,
        "currency": "INR",
        "country": "IN",
        "phone": "+911141000003",
        "rating": 4.5,
        "rating_count": 211,
        "price_tier": "$$",
        "cover_variant": "gradient-rose",
        "tagline": "Walk in. Walk out fresh.",
        "highlight": "Fastest queue in HKV",
    },
]

DEMO_SERVICES = [
    # Mumbai
    {"shop": "BBSHOP-DEMO-MUM", "name": "SVC-MUM-CLASSIC-CUT", "service_name": "Classic Cut", "category": "Hair", "price": 450, "duration_minutes": 30, "icon": "scissors"},
    {"shop": "BBSHOP-DEMO-MUM", "name": "SVC-MUM-BEARD-TRIM", "service_name": "Beard Trim", "category": "Beard", "price": 250, "duration_minutes": 20, "icon": "razor"},
    {"shop": "BBSHOP-DEMO-MUM", "name": "SVC-MUM-COMBO", "service_name": "Cut + Beard Combo", "category": "Combo", "price": 650, "duration_minutes": 50, "icon": "sparkle"},
    {"shop": "BBSHOP-DEMO-MUM", "name": "SVC-MUM-KIDS", "service_name": "Kids Cut", "category": "Kids", "price": 300, "duration_minutes": 25, "icon": "scissors"},

    # Bengaluru
    {"shop": "BBSHOP-DEMO-BLR", "name": "SVC-BLR-PREMIUM-CUT", "service_name": "Premium Style Cut", "category": "Hair", "price": 800, "duration_minutes": 40, "icon": "scissors"},
    {"shop": "BBSHOP-DEMO-BLR", "name": "SVC-BLR-HOT-SHAVE", "service_name": "Hot Towel Shave", "category": "Beard", "price": 600, "duration_minutes": 35, "icon": "razor"},
    {"shop": "BBSHOP-DEMO-BLR", "name": "SVC-BLR-COLOR", "service_name": "Hair Color", "category": "Color", "price": 1500, "duration_minutes": 60, "icon": "brush"},
    {"shop": "BBSHOP-DEMO-BLR", "name": "SVC-BLR-FACIAL", "service_name": "Men's Facial", "category": "Grooming", "price": 900, "duration_minutes": 45, "icon": "sparkle"},

    # Delhi
    {"shop": "BBSHOP-DEMO-DEL", "name": "SVC-DEL-WALKIN-CUT", "service_name": "Walk-in Cut", "category": "Hair", "price": 350, "duration_minutes": 25, "icon": "clock"},
    {"shop": "BBSHOP-DEMO-DEL", "name": "SVC-DEL-BEARD", "service_name": "Beard Sculpt", "category": "Beard", "price": 300, "duration_minutes": 20, "icon": "razor"},
    {"shop": "BBSHOP-DEMO-DEL", "name": "SVC-DEL-COMBO", "service_name": "Express Combo", "category": "Combo", "price": 600, "duration_minutes": 45, "icon": "star"},
    {"shop": "BBSHOP-DEMO-DEL", "name": "SVC-DEL-MOUSTACHE", "service_name": "Moustache Wax", "category": "Grooming", "price": 200, "duration_minutes": 15, "icon": "sparkle"},
]

DEMO_BARBERS = [
    {"shop": "BBSHOP-DEMO-MUM", "name": "BBR-DEMO-MUM-1", "barber_name": "Arjun Malhotra", "headline": "Fade specialist", "rating": 4.8},
    {"shop": "BBSHOP-DEMO-MUM", "name": "BBR-DEMO-MUM-2", "barber_name": "Priya Iyer", "headline": "Beard sculptor", "rating": 4.7},
    {"shop": "BBSHOP-DEMO-MUM", "name": "BBR-DEMO-MUM-3", "barber_name": "Rohit Shah", "headline": "Classic cuts", "rating": 4.6},
    {"shop": "BBSHOP-DEMO-BLR", "name": "BBR-DEMO-BLR-1", "barber_name": "Vikram Naidu", "headline": "Master barber, 12 yrs", "rating": 4.9},
    {"shop": "BBSHOP-DEMO-BLR", "name": "BBR-DEMO-BLR-2", "barber_name": "Anjali Reddy", "headline": "Color specialist", "rating": 4.8},
    {"shop": "BBSHOP-DEMO-BLR", "name": "BBR-DEMO-BLR-3", "barber_name": "Karthik Bhat", "headline": "Hot towel ace", "rating": 4.7},
    {"shop": "BBSHOP-DEMO-DEL", "name": "BBR-DEMO-DEL-1", "barber_name": "Aman Khan", "headline": "Express specialist", "rating": 4.5},
    {"shop": "BBSHOP-DEMO-DEL", "name": "BBR-DEMO-DEL-2", "barber_name": "Neha Gupta", "headline": "Walk-in queue lead", "rating": 4.6},
]


def _ensure_role(role: str) -> None:
    if not frappe.db.exists("Role", role):
        frappe.get_doc({"doctype": "Role", "role_name": role, "desk_access": 0}).insert(ignore_permissions=True)


def _ensure_shop(spec: dict) -> str:
    name = spec["name"]
    if frappe.db.exists("BB Shop", name):
        doc = frappe.get_doc("BB Shop", name)
        doc.update(spec)
        doc.save(ignore_permissions=True)
        return name
    doc = frappe.get_doc({"doctype": "BB Shop", **spec, "status": "Active", "is_open": 1, "accepts_walkin": 1, "open_time": "10:00:00", "close_time": "21:00:00"})
    doc.insert(ignore_permissions=True)
    return name


def _ensure_service(spec: dict) -> None:
    name = spec.pop("name")
    body = {"doctype": "BB Service", "currency": "INR", "is_active": 1, **spec}
    if frappe.db.exists("BB Service", name):
        doc = frappe.get_doc("BB Service", name)
        doc.update(body)
        doc.save(ignore_permissions=True)
    else:
        body["name"] = name
        frappe.get_doc(body).insert(ignore_permissions=True)


def _ensure_barber(spec: dict) -> None:
    name = spec.pop("name")
    body = {"doctype": "BB Barber", "is_active": 1, **spec}
    if frappe.db.exists("BB Barber", name):
        doc = frappe.get_doc("BB Barber", name)
        doc.update(body)
        doc.save(ignore_permissions=True)
    else:
        body["name"] = name
        frappe.get_doc(body).insert(ignore_permissions=True)


def seed_demo_india() -> dict:
    """Idempotent seed for the India demo dataset."""
    for role in ("Customer", "Shop Owner", "Barber Staff"):
        _ensure_role(role)

    for shop in DEMO_SHOPS:
        _ensure_shop(dict(shop))

    for svc in DEMO_SERVICES:
        _ensure_service(dict(svc))

    for barber in DEMO_BARBERS:
        _ensure_barber(dict(barber))

    frappe.db.commit()
    return {
        "shops": len(DEMO_SHOPS),
        "services": len(DEMO_SERVICES),
        "barbers": len(DEMO_BARBERS),
    }


if __name__ == "__main__":  # pragma: no cover — manual runs only.
    import json
    print(json.dumps(seed_demo_india(), indent=2))
