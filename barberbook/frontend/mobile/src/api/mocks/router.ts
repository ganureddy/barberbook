/**
 * Mock router. Sits behind the axios client and answers requests from
 * `fixtures.ts` so the entire app can run without a Frappe site.
 *
 * Strategy: pattern-match on (method, URL path, params/body) and return a
 * payload that mirrors what Frappe would serve. Anything unmatched falls
 * back to a 404 so we notice missing fixtures during development.
 */

import type { AxiosRequestConfig, AxiosResponse } from 'axios';

import type {
  Booking,
  FrappeBaseDoc,
  ListParams,
  Review,
  SessionUser,
  WalkinTicket,
} from '../types';

import {
  BARBERS,
  BOOKINGS,
  LOYALTY_ACCOUNTS,
  MOCK_OTP_CODE,
  MOCK_USER,
  REVIEWS,
  ROSTERS,
  SEATS,
  SERVICES,
  SHOPS,
  WALKIN_TICKETS,
} from './fixtures';

const TABLE: Record<string, FrappeBaseDoc[]> = {
  'BB Shop': SHOPS,
  'BB Service': SERVICES,
  'BB Barber': BARBERS,
  'BB Seat': SEATS,
  'BB Roster': ROSTERS,
  'BB Booking': BOOKINGS,
  'BB Walkin Ticket': WALKIN_TICKETS,
  'BB Review': REVIEWS,
  'BB Loyalty Account': LOYALTY_ACCOUNTS,
};

interface ParsedFilters {
  filters?: unknown;
  fields?: unknown;
  limit_start?: number;
  limit_page_length?: number;
  order_by?: string;
}

function parseFilters(raw: unknown): ParsedFilters | null {
  if (raw == null || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const out: ParsedFilters = {};
  if (obj.filters != null) out.filters = safeParse(obj.filters);
  if (obj.fields != null) out.fields = safeParse(obj.fields);
  if (typeof obj.limit_start === 'number') out.limit_start = obj.limit_start;
  if (typeof obj.limit_page_length === 'number') out.limit_page_length = obj.limit_page_length;
  if (typeof obj.order_by === 'string') out.order_by = obj.order_by;
  return out;
}

function safeParse(v: unknown): unknown {
  if (typeof v !== 'string') return v;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}

function applyListParams<T extends FrappeBaseDoc>(rows: T[], params: ListParams<T> | null): T[] {
  if (!params) return rows;
  let out = rows;
  if (Array.isArray(params.filters)) {
    out = out.filter((row) =>
      (params.filters ?? []).every((f) =>
        matchFilter(row as unknown as Record<string, unknown>, f),
      ),
    );
  }
  if (typeof params.limit_start === 'number' || typeof params.limit_page_length === 'number') {
    const start = params.limit_start ?? 0;
    const len = params.limit_page_length ?? out.length;
    out = out.slice(start, start + len);
  }
  return out;
}

function matchFilter(row: Record<string, unknown>, filter: unknown): boolean {
  if (!Array.isArray(filter)) return true;
  // Two shapes: [field, op, value]  or  [doctype, field, op, value].
  const [, field, op, value] = filter.length === 4 ? filter : ['', ...filter];
  const lhs = row[field as string];
  switch (op) {
    case '=':
      return lhs === value;
    case '!=':
      return lhs !== value;
    case '<':
      return typeof lhs === 'number' && typeof value === 'number' && lhs < value;
    case '>':
      return typeof lhs === 'number' && typeof value === 'number' && lhs > value;
    case '<=':
      return typeof lhs === 'number' && typeof value === 'number' && lhs <= value;
    case '>=':
      return typeof lhs === 'number' && typeof value === 'number' && lhs >= value;
    case 'like':
      return typeof lhs === 'string' && typeof value === 'string'
        ? lhs.toLowerCase().includes(value.toLowerCase().replace(/%/g, ''))
        : false;
    case 'in':
      return Array.isArray(value) && value.includes(lhs);
    case 'not in':
      return Array.isArray(value) && !value.includes(lhs);
    default:
      return true;
  }
}

function ok<T>(data: T, config: AxiosRequestConfig): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK (mock)',
    headers: {},
    config: config as AxiosResponse<T>['config'],
  };
}

function notFound(config: AxiosRequestConfig, msg: string): AxiosResponse {
  // Mock the same envelope a real Frappe error would.
  const data = {
    exception: msg,
    _server_messages: JSON.stringify([JSON.stringify({ message: msg, indicator: 'red' })]),
  };
  return {
    data,
    status: 404,
    statusText: 'Not Found (mock)',
    headers: {},
    config: config as AxiosResponse['config'],
  };
}

const otpStore = new Map<string, string>();
const sessionUsers = new Map<string, SessionUser>([[MOCK_USER.sid ?? '', MOCK_USER]]);

/**
 * Match an incoming axios request to a fixture-backed response. Returns
 * `null` when no rule matches — the caller should treat that as a 404.
 */
export function routeMock(config: AxiosRequestConfig): AxiosResponse | null {
  const url = (config.url ?? '').replace(/^\/+/, '/').split('?')[0];
  const method = (config.method ?? 'get').toLowerCase();
  const params = (config.params ?? {}) as Record<string, unknown>;
  const body = parseBody(config.data);

  // ─── Auth ────────────────────────────────────────────────────────────
  if (url.endsWith('/api/method/barberbook.api.auth.request_otp')) {
    const phone = String(body?.phone ?? params.phone ?? '');
    otpStore.set(phone, MOCK_OTP_CODE);
    return ok(
      {
        message: {
          phone,
          delivery: 'mock',
          // Surface the dev OTP via _server_messages so DevHud / toasts show it.
          _hint: `Dev OTP for ${phone}: ${MOCK_OTP_CODE}`,
        },
        _server_messages: JSON.stringify([
          JSON.stringify({
            message: `Mock OTP sent to ${phone}: ${MOCK_OTP_CODE}`,
            indicator: 'blue',
            title: 'Mock mode',
          }),
        ]),
      },
      config,
    );
  }

  if (url.endsWith('/api/method/barberbook.api.auth.verify_otp')) {
    const phone = String(body?.phone ?? '');
    const code = String(body?.code ?? '');
    const expected = otpStore.get(phone) ?? MOCK_OTP_CODE;
    if (code !== expected) {
      return notFound(config, 'Invalid OTP (mock). Try 4242.');
    }
    const user: SessionUser = { ...MOCK_USER, phone };
    sessionUsers.set(user.sid ?? '', user);
    return ok({ message: { user, sid: user.sid } }, config);
  }

  if (url.endsWith('/api/method/logout')) {
    return ok({ message: 'Logged Out' }, config);
  }

  if (url.endsWith('/api/method/frappe.auth.get_logged_user')) {
    return ok({ message: MOCK_USER.email }, config);
  }

  if (url.endsWith('/api/method/barberbook.api.auth.me')) {
    return ok({ message: MOCK_USER }, config);
  }

  // ─── BarberBook custom endpoints ────────────────────────────────────
  if (url.endsWith('/api/method/barberbook.api.discovery.find_nearby_shops')) {
    const merged = { ...params, ...(body ?? {}) } as Record<string, unknown>;
    const lat = Number(merged.latitude ?? 0);
    const lng = Number(merged.longitude ?? 0);
    const country = (merged.country as string | undefined) ?? undefined;
    const q = ((merged.q as string | undefined) ?? '').toLowerCase();
    const limit = Number(merged.limit ?? 25);

    const enriched = SHOPS.filter((s) => (country ? s.country === country : true))
      .filter((s) => {
        if (!q) return true;
        return (
          s.shop_name.toLowerCase().includes(q) ||
          s.city.toLowerCase().includes(q) ||
          s.address_line.toLowerCase().includes(q)
        );
      })
      .map((s) => {
        const distance_km = haversineKm(lat, lng, s.latitude, s.longitude);
        return {
          ...s,
          distance_km,
          eta_label: `${Math.max(2, Math.round(distance_km * 4))} min`,
        };
      })
      .sort((a, b) => a.distance_km - b.distance_km)
      .slice(0, limit);
    return ok({ message: enriched }, config);
  }

  if (url.endsWith('/api/method/barberbook.api.booking.get_availability')) {
    const merged = { ...params, ...(body ?? {}) } as Record<string, unknown>;
    const date = String(merged.date ?? '2026-05-16');
    // Generate 30-min slots from 09:00 to 19:30, dropping a few "taken" ones.
    const slots: { start_at: string; end_at: string; available: boolean; total: number }[] = [];
    for (let h = 9; h < 20; h++) {
      for (const m of [0, 30]) {
        const start = `${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
        const endMin = m + 30;
        const endH = endMin >= 60 ? h + 1 : h;
        const endMM = endMin % 60;
        const end = `${date}T${String(endH).padStart(2, '0')}:${String(endMM).padStart(2, '0')}:00`;
        const taken = (h * 2 + m / 30) % 5 === 0;
        slots.push({ start_at: start, end_at: end, available: !taken, total: 500 });
      }
    }
    return ok({ message: slots }, config);
  }

  if (url.endsWith('/api/method/barberbook.api.booking.create')) {
    const merged = { ...params, ...(body ?? {}) } as Record<string, unknown>;
    const newBooking = {
      ...baseAuditMock(),
      doctype: 'BB Booking',
      name: `MOCK-BKG-${Date.now()}`,
      customer: MOCK_USER.email,
      shop: String(merged.shop ?? ''),
      barber: merged.barber as string | undefined,
      scheduled_at: String(merged.scheduled_at ?? new Date().toISOString()),
      duration_minutes: 50,
      services: (merged.services as Booking['services']) ?? [],
      status: 'Confirmed' as const,
      total_amount: Array.isArray(merged.services)
        ? (merged.services as Booking['services']).reduce((sum, s) => sum + (s.price ?? 0), 0)
        : 0,
      currency: 'INR' as const,
      payment_status: 'Pending' as const,
      token_code: `BB-${Math.floor(Math.random() * 99)
        .toString()
        .padStart(2, '0')}-${Math.floor(Math.random() * 999)
        .toString()
        .padStart(3, '0')}`,
      notes: merged.notes as string | undefined,
    };
    BOOKINGS.push(newBooking as Booking);
    return ok({ message: newBooking }, config);
  }

  if (url.endsWith('/api/method/barberbook.api.booking.update_status')) {
    const merged = { ...params, ...(body ?? {}) } as Record<string, unknown>;
    const name = String(merged.name ?? '');
    const status = merged.status as Booking['status'];
    const row = BOOKINGS.find((b) => b.name === name);
    if (!row) return notFound(config, `Booking '${name}' not found in mock`);
    row.status = status;
    row.modified = new Date().toISOString();
    return ok({ message: row }, config);
  }

  if (url.endsWith('/api/method/barberbook.api.booking.list_mine')) {
    return ok({ message: BOOKINGS.filter((b) => b.customer === MOCK_USER.email) }, config);
  }

  if (url.endsWith('/api/method/barberbook.api.walkin.snapshot')) {
    const merged = { ...params, ...(body ?? {}) } as Record<string, unknown>;
    const shop = String(merged.shop ?? '');
    const tickets = WALKIN_TICKETS.filter((t) => t.shop === shop);
    return ok(
      {
        message: {
          shop,
          total_in_queue: tickets.length,
          next_token: tickets[0]?.token_number ?? null,
          estimated_wait_minutes: tickets[0]?.estimated_wait_minutes ?? 0,
          tickets,
        },
      },
      config,
    );
  }

  if (url.endsWith('/api/method/barberbook.api.walkin.join')) {
    const merged = { ...params, ...(body ?? {}) } as Record<string, unknown>;
    const ticket = {
      ...baseAuditMock(),
      doctype: 'BB Walkin Ticket' as const,
      name: `MOCK-WLK-${Date.now()}`,
      shop: String(merged.shop ?? ''),
      customer_phone: merged.customer_phone as string | undefined,
      token_number: String(WALKIN_TICKETS.length + 7).padStart(2, '0'),
      position_in_queue: WALKIN_TICKETS.length + 1,
      estimated_wait_minutes: 18,
      status: 'Waiting' as const,
      joined_at: new Date().toISOString(),
    } satisfies WalkinTicket;
    WALKIN_TICKETS.push(ticket);
    return ok({ message: ticket }, config);
  }

  if (url.endsWith('/api/method/barberbook.api.review.submit')) {
    const merged = { ...params, ...(body ?? {}) } as Record<string, unknown>;
    const review = {
      ...baseAuditMock(),
      doctype: 'BB Review' as const,
      name: `MOCK-REV-${Date.now()}`,
      customer: MOCK_USER.email,
      shop: String(merged.shop ?? ''),
      barber: merged.barber as string | undefined,
      booking: merged.booking as string | undefined,
      rating: (merged.rating as Review['rating']) ?? 5,
      body: merged.body as string | undefined,
    } satisfies Review;
    REVIEWS.push(review);
    return ok({ message: review }, config);
  }

  // ─── frappe.client.* RPC dispatch ───────────────────────────────────
  if (url.endsWith('/api/method/frappe.client.get_list')) {
    const merged = { ...params, ...(body ?? {}) } as Record<string, unknown>;
    const doctype = String(merged.doctype ?? '');
    const rows = TABLE[doctype];
    if (!rows) return notFound(config, `Mock has no fixtures for DocType '${doctype}'`);
    const parsed = parseFilters(merged) as ListParams<FrappeBaseDoc> | null;
    return ok({ message: applyListParams(rows, parsed) }, config);
  }

  if (url.endsWith('/api/method/frappe.client.get_count')) {
    const merged = { ...params, ...(body ?? {}) } as Record<string, unknown>;
    const doctype = String(merged.doctype ?? '');
    const rows = TABLE[doctype];
    if (!rows) return notFound(config, `Mock has no fixtures for DocType '${doctype}'`);
    const parsed = parseFilters(merged) as ListParams<FrappeBaseDoc> | null;
    return ok({ message: applyListParams(rows, parsed).length }, config);
  }

  if (url.endsWith('/api/method/frappe.client.get')) {
    const merged = { ...params, ...(body ?? {}) } as Record<string, unknown>;
    const doctype = String(merged.doctype ?? '');
    const name = String(merged.name ?? '');
    const rows = TABLE[doctype];
    if (!rows) return notFound(config, `Mock has no fixtures for DocType '${doctype}'`);
    const row = rows.find((r) => r.name === name);
    if (!row) return notFound(config, `${doctype} '${name}' not found in mock`);
    return ok({ message: row }, config);
  }

  if (url.endsWith('/api/method/frappe.client.insert')) {
    const merged = { ...params, ...(body ?? {}) } as Record<string, unknown>;
    const docPayload = (merged.doc ?? merged) as Record<string, unknown>;
    const doctype = String(docPayload.doctype ?? '');
    const rows = TABLE[doctype];
    if (!rows) return notFound(config, `Mock has no fixtures for DocType '${doctype}'`);
    const newDoc: FrappeBaseDoc = {
      ...(docPayload as object),
      name: `MOCK-${doctype}-${rows.length + 1}`,
      owner: 'Administrator',
      creation: new Date().toISOString(),
      modified: new Date().toISOString(),
      modified_by: 'Administrator',
      docstatus: 0,
    };
    rows.push(newDoc);
    return ok({ message: newDoc }, config);
  }

  if (url.endsWith('/api/method/frappe.client.set_value')) {
    const merged = { ...params, ...(body ?? {}) } as Record<string, unknown>;
    const doctype = String(merged.doctype ?? '');
    const name = String(merged.name ?? '');
    const fieldname = merged.fieldname as string | Record<string, unknown>;
    const value = merged.value;
    const rows = TABLE[doctype];
    const row = rows?.find((r) => r.name === name);
    if (!row) return notFound(config, `${doctype} '${name}' not found in mock`);
    if (typeof fieldname === 'string') {
      (row as unknown as Record<string, unknown>)[fieldname] = value;
    } else if (fieldname && typeof fieldname === 'object') {
      Object.assign(row as object, fieldname);
    }
    row.modified = new Date().toISOString();
    return ok({ message: row }, config);
  }

  if (url.endsWith('/api/method/frappe.client.delete')) {
    const merged = { ...params, ...(body ?? {}) } as Record<string, unknown>;
    const doctype = String(merged.doctype ?? '');
    const name = String(merged.name ?? '');
    const rows = TABLE[doctype];
    if (!rows) return notFound(config, `Mock has no fixtures for DocType '${doctype}'`);
    const idx = rows.findIndex((r) => r.name === name);
    if (idx < 0) return notFound(config, `${doctype} '${name}' not found in mock`);
    rows.splice(idx, 1);
    return ok({ message: 'ok' }, config);
  }

  // ─── REST endpoints (/api/resource/<DocType>/...) ───────────────────
  const restMatch = url.match(/^\/api\/resource\/([^/]+)(?:\/([^/]+))?$/);
  if (restMatch) {
    const doctype = decodeURIComponent(restMatch[1]);
    const docName = restMatch[2] != null ? decodeURIComponent(restMatch[2]) : null;
    const rows = TABLE[doctype];
    if (!rows) return notFound(config, `Mock has no fixtures for DocType '${doctype}'`);

    if (docName == null) {
      if (method === 'get') {
        const parsed = parseFilters(params) as ListParams<FrappeBaseDoc> | null;
        return ok({ data: applyListParams(rows, parsed) }, config);
      }
      if (method === 'post') {
        const newDoc: FrappeBaseDoc = {
          ...(body as object),
          name: `MOCK-${doctype}-${rows.length + 1}`,
          owner: 'Administrator',
          creation: new Date().toISOString(),
          modified: new Date().toISOString(),
          modified_by: 'Administrator',
          docstatus: 0,
        };
        rows.push(newDoc);
        return ok({ data: newDoc }, config);
      }
    } else {
      const row = rows.find((r) => r.name === docName);
      if (!row) return notFound(config, `${doctype} '${docName}' not found in mock`);
      if (method === 'get') return ok({ data: row }, config);
      if (method === 'put') {
        Object.assign(row, body ?? {});
        row.modified = new Date().toISOString();
        return ok({ data: row }, config);
      }
      if (method === 'delete') {
        const idx = rows.indexOf(row);
        rows.splice(idx, 1);
        return ok({ data: { message: 'ok' } }, config);
      }
    }
  }

  return null;
}

function parseBody(raw: unknown): Record<string, unknown> | null {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (typeof raw === 'object') return raw as Record<string, unknown>;
  return null;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 100) / 100;
}

function baseAuditMock() {
  const now = new Date().toISOString();
  return {
    owner: 'Administrator',
    creation: now,
    modified: now,
    modified_by: 'Administrator',
    docstatus: 0 as const,
  };
}
