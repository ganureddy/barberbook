"""Geo discovery endpoints.

Two strategies for "shops within X km":

  * PostgreSQL `earthdistance` extension (fast, accurate). Tries to use
    `earth_distance(ll_to_earth(...))` when the underlying database is
    Postgres and the extension is loaded.
  * Bounding-box fallback (works on MariaDB / Postgres without the
    extension). Computes a generous lat/lng box and refines client-side
    via the Python `haversine_km` helper.

Both paths return the same `NearbyShop[]` shape the mobile types expect.
"""

from __future__ import annotations

import frappe

from ._utils import haversine_km


@frappe.whitelist(allow_guest=True)
def find_nearby_shops(
    latitude: float,
    longitude: float,
    radius_km: float = 5,
    q: str | None = None,
    country: str | None = None,
    limit: int = 25,
) -> list[dict]:
    lat = float(latitude)
    lng = float(longitude)
    radius = float(radius_km)
    page_size = max(1, min(int(limit), 100))

    rows = _fetch_candidates(lat, lng, radius, q, country, page_size * 4)
    enriched: list[dict] = []
    for r in rows:
        d = haversine_km(lat, lng, float(r["latitude"]), float(r["longitude"]))
        if d > radius:
            continue
        # Crude ETA: assume 4 km/min on city roads with traffic + 2 min
        # buffer for parking. The shop owner can override later via the
        # `eta_minutes_override` field on BB Shop (not in v1).
        eta_minutes = max(2, int(d * 4) + 2)
        enriched.append(
            {
                **r,
                "distance_km": d,
                "eta_label": f"{eta_minutes} min",
            }
        )
    enriched.sort(key=lambda x: x["distance_km"])
    return enriched[:page_size]


def _fetch_candidates(
    lat: float,
    lng: float,
    radius_km: float,
    q: str | None,
    country: str | None,
    fetch_limit: int,
) -> list[dict]:
    """Pre-filter shops the database so we don't haversine the whole table.

    We prefer Postgres earthdistance; if it errors we fall through to a
    bounding-box query that works on every Frappe-supported DB.
    """
    try:
        if _has_earthdistance():
            return _fetch_via_earthdistance(lat, lng, radius_km, q, country, fetch_limit)
    except Exception:  # pragma: no cover — depends on DB capability
        pass
    return _fetch_via_bounding_box(lat, lng, radius_km, q, country, fetch_limit)


def _has_earthdistance() -> bool:
    if frappe.db.db_type != "postgres":
        return False
    try:
        rows = frappe.db.sql("SELECT 1 FROM pg_extension WHERE extname='earthdistance' LIMIT 1")
        return bool(rows)
    except Exception:
        return False


def _fetch_via_earthdistance(
    lat: float, lng: float, radius_km: float, q: str | None, country: str | None, fetch_limit: int
) -> list[dict]:  # pragma: no cover — depends on Postgres
    where = ["status = 'Active'"]
    params: dict[str, object] = {
        "lat": lat,
        "lng": lng,
        "radius_m": radius_km * 1000,
        "limit": fetch_limit,
    }
    if country:
        where.append("country = %(country)s")
        params["country"] = country
    if q:
        where.append("(shop_name ILIKE %(q)s OR city ILIKE %(q)s OR address_line ILIKE %(q)s)")
        params["q"] = f"%{q}%"
    where_clause = " AND ".join(where)
    sql = f"""
      SELECT name, shop_name, slug, status, country, city, address_line, pincode,
             latitude, longitude, rating, rating_count, price_tier,
             is_open, accepts_walkin, cover_variant,
             open_time, close_time, phone, currency
      FROM `tabBB Shop`
      WHERE {where_clause}
        AND earth_distance(ll_to_earth(latitude, longitude),
                           ll_to_earth(%(lat)s, %(lng)s)) <= %(radius_m)s
      LIMIT %(limit)s
    """
    return frappe.db.sql(sql, params, as_dict=True)


def _fetch_via_bounding_box(
    lat: float, lng: float, radius_km: float, q: str | None, country: str | None, fetch_limit: int
) -> list[dict]:
    # ~111 km per degree of latitude; longitude scales with cos(lat).
    import math

    lat_delta = radius_km / 111.0
    lng_delta = radius_km / (111.0 * max(0.05, math.cos(math.radians(lat))))

    # Frappe's dict-filter `("between", [a, b])` shape generates malformed SQL
    # on MariaDB for Float columns in some versions, so split into pairwise
    # `>=` / `<=` filters which always produce valid SQL.
    filters: list[list] = [
        ["status", "=", "Active"],
        ["latitude", ">=", lat - lat_delta],
        ["latitude", "<=", lat + lat_delta],
        ["longitude", ">=", lng - lng_delta],
        ["longitude", "<=", lng + lng_delta],
    ]
    if country:
        filters.append(["country", "=", country])

    fields = [
        "name",
        "shop_name",
        "slug",
        "status",
        "country",
        "city",
        "address_line",
        "pincode",
        "latitude",
        "longitude",
        "rating",
        "rating_count",
        "price_tier",
        "is_open",
        "accepts_walkin",
        "cover_variant",
        "open_time",
        "close_time",
        "phone",
        "currency",
    ]

    rows = frappe.get_all(
        "BB Shop",
        filters=filters,
        fields=fields,
        limit_page_length=fetch_limit,
    )
    if q:
        ql = q.lower()
        rows = [
            r
            for r in rows
            if ql in (r.get("shop_name") or "").lower()
            or ql in (r.get("city") or "").lower()
            or ql in (r.get("address_line") or "").lower()
        ]
    return rows
