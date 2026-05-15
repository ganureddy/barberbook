/**
 * Mock router. Sits behind the axios client and answers requests from
 * `fixtures.ts` so the entire app can run without a Frappe site.
 *
 * Strategy: pattern-match on (method, URL path, params/body) and return a
 * payload that mirrors what Frappe would serve. Anything unmatched falls
 * back to a 404 so we notice missing fixtures during development.
 */

import type { AxiosRequestConfig, AxiosResponse } from 'axios';

import { channels, publishLocal } from '../realtime';
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
    const shopId = String(merged.shop ?? '');
    const ticket = {
      ...baseAuditMock(),
      doctype: 'BB Walkin Ticket' as const,
      name: `MOCK-WLK-${Date.now()}`,
      shop: shopId,
      customer_phone: merged.customer_phone as string | undefined,
      token_number: String(WALKIN_TICKETS.length + 7).padStart(2, '0'),
      position_in_queue: WALKIN_TICKETS.length + 1,
      estimated_wait_minutes: 18,
      status: 'Waiting' as const,
      joined_at: new Date().toISOString(),
    } satisfies WalkinTicket;
    WALKIN_TICKETS.push(ticket);
    // Mirror what `frappe.publish_realtime('walkin_queue:<shop>', …)` would
    // do — the in-process bus routes this to any active `useChannel` hook.
    publishLocal(channels.walkinQueue(shopId), {
      shop: shopId,
      total_in_queue: WALKIN_TICKETS.filter((t) => t.shop === shopId).length,
      next_token: WALKIN_TICKETS.find((t) => t.shop === shopId)?.token_number ?? null,
      estimated_wait_minutes: ticket.estimated_wait_minutes,
      tickets: WALKIN_TICKETS.filter((t) => t.shop === shopId),
      reason: 'join',
    });
    return ok({ message: ticket }, config);
  }

  if (url.endsWith('/api/method/barberbook.api.walkin.cancel')) {
    const merged = { ...params, ...(body ?? {}) } as Record<string, unknown>;
    const name = String(merged.name ?? '');
    const idx = WALKIN_TICKETS.findIndex((t) => t.name === name);
    if (idx < 0) return notFound(config, `Walk-in ticket '${name}' not found in mock`);
    const cancelled = { ...WALKIN_TICKETS[idx], status: 'Cancelled' as const };
    WALKIN_TICKETS[idx] = cancelled;
    publishLocal(channels.walkinQueue(cancelled.shop), {
      shop: cancelled.shop,
      total_in_queue: WALKIN_TICKETS.filter(
        (t) => t.shop === cancelled.shop && t.status !== 'Cancelled',
      ).length,
      next_token: null,
      estimated_wait_minutes: 0,
      tickets: WALKIN_TICKETS.filter((t) => t.shop === cancelled.shop),
      reason: 'cancel',
    });
    return ok({ message: cancelled }, config);
  }

  // ─── Owner endpoints ────────────────────────────────────────────────
  if (url.endsWith('/api/method/barberbook.api.owner.today')) {
    const merged = { ...params, ...(body ?? {}) } as Record<string, unknown>;
    const shopId = String(merged.shop ?? '');
    const todays = BOOKINGS.filter((b) => b.shop === shopId);
    const revenue = todays.reduce((sum, b) => sum + b.total_amount, 0);
    const timeline = todays.map((b) => ({
      name: b.name,
      shop: b.shop,
      barber: b.barber,
      scheduled_at: b.scheduled_at,
      duration_minutes: b.duration_minutes,
      status: b.status,
      total_amount: b.total_amount,
      currency: b.currency,
      customer_name: 'Arya Nair',
      service_summary: `${b.services.length} service${b.services.length === 1 ? '' : 's'}`,
    }));
    // Pad timeline so the UI has something to render even before bookings exist.
    const padded = timeline.length > 0 ? timeline : padTimelineForShop(shopId);
    return ok(
      {
        message: {
          shop: shopId,
          date: new Date().toISOString().slice(0, 10),
          bookings: padded.length,
          walkins: WALKIN_TICKETS.filter((t) => t.shop === shopId && t.status !== 'Cancelled')
            .length,
          revenue: revenue || 4280,
          currency: 'INR',
          timeline: padded,
        },
      },
      config,
    );
  }

  if (url.endsWith('/api/method/barberbook.api.owner.walkin_queue')) {
    const merged = { ...params, ...(body ?? {}) } as Record<string, unknown>;
    const shopId = String(merged.shop ?? '');
    const tickets = WALKIN_TICKETS.filter((t) => t.shop === shopId).map((t) => ({
      ...t,
      customer_name: t.customer_phone ?? 'Walk-in customer',
      service_summary: 'Haircut',
    }));
    const avgWait =
      tickets.length === 0
        ? 0
        : Math.round(tickets.reduce((s, t) => s + t.estimated_wait_minutes, 0) / tickets.length);
    return ok(
      {
        message: {
          shop: shopId,
          total_in_queue: tickets.filter((t) => t.status !== 'Cancelled').length,
          avg_wait_minutes: avgWait,
          tickets,
        },
      },
      config,
    );
  }

  if (url.endsWith('/api/method/barberbook.api.owner.walkin_call')) {
    const merged = { ...params, ...(body ?? {}) } as Record<string, unknown>;
    const name = String(merged.name ?? '');
    const t = WALKIN_TICKETS.find((x) => x.name === name);
    if (!t) return notFound(config, `Walk-in '${name}' not found`);
    t.status = 'NextUp';
    t.estimated_wait_minutes = 0;
    publishLocal(channels.walkinQueue(t.shop), {
      shop: t.shop,
      total_in_queue: WALKIN_TICKETS.filter((x) => x.shop === t.shop && x.status !== 'Cancelled')
        .length,
      next_token: t.token_number,
      estimated_wait_minutes: 0,
      tickets: WALKIN_TICKETS.filter((x) => x.shop === t.shop),
      reason: 'call',
    });
    return ok({ message: t }, config);
  }

  if (url.endsWith('/api/method/barberbook.api.owner.walkin_done')) {
    const merged = { ...params, ...(body ?? {}) } as Record<string, unknown>;
    const name = String(merged.name ?? '');
    const t = WALKIN_TICKETS.find((x) => x.name === name);
    if (!t) return notFound(config, `Walk-in '${name}' not found`);
    t.status = 'Completed';
    t.served_at = new Date().toISOString();
    publishLocal(channels.walkinQueue(t.shop), {
      shop: t.shop,
      total_in_queue: WALKIN_TICKETS.filter((x) => x.shop === t.shop && x.status === 'Waiting')
        .length,
      next_token:
        WALKIN_TICKETS.find((x) => x.shop === t.shop && x.status === 'Waiting')?.token_number ??
        null,
      estimated_wait_minutes: 0,
      tickets: WALKIN_TICKETS.filter((x) => x.shop === t.shop),
      reason: 'done',
    });
    return ok({ message: t }, config);
  }

  if (url.endsWith('/api/method/barberbook.api.owner.set_booking_status')) {
    const merged = { ...params, ...(body ?? {}) } as Record<string, unknown>;
    const name = String(merged.name ?? '');
    const status = merged.status as Booking['status'];
    const row = BOOKINGS.find((b) => b.name === name);
    if (!row) return notFound(config, `Booking '${name}' not found`);
    row.status = status;
    row.modified = new Date().toISOString();
    return ok({ message: row }, config);
  }

  if (url.endsWith('/api/method/barberbook.api.owner.payouts')) {
    const merged = { ...params, ...(body ?? {}) } as Record<string, unknown>;
    const shopId = String(merged.shop ?? '');
    const today = new Date();
    const daily = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (29 - i));
      // Deterministic but uneven series so the chart reads as real data.
      const seed = (d.getDay() + 2) * 137;
      return {
        date: d.toISOString().slice(0, 10),
        amount: 1800 + ((seed * 7) % 4200),
        bookings: 6 + ((seed * 3) % 18),
      };
    });
    const monthRevenue = daily.reduce((s, d) => s + d.amount, 0);
    return ok(
      {
        message: {
          shop: shopId,
          currency: 'INR',
          pending_amount: Math.round(monthRevenue * 0.18),
          next_payout_at: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString(),
          daily,
          top_services: [
            { service_name: "Men's Haircut", amount: Math.round(monthRevenue * 0.42), count: 184 },
            { service_name: 'Beard Trim', amount: Math.round(monthRevenue * 0.21), count: 132 },
            { service_name: 'Combo', amount: Math.round(monthRevenue * 0.18), count: 86 },
            { service_name: 'Hot Towel Shave', amount: Math.round(monthRevenue * 0.12), count: 48 },
            { service_name: 'Color', amount: Math.round(monthRevenue * 0.07), count: 22 },
          ],
          payouts: Array.from({ length: 8 }, (_, i) => ({
            name: `MOCK-PE-${i + 1}`,
            amount: 18000 + i * 2400,
            posted_at: new Date(today.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000).toISOString(),
            status: i === 0 ? ('pending' as const) : ('settled' as const),
            bank_ref: `UTR2026${(i + 1).toString().padStart(4, '0')}`,
          })),
        },
      },
      config,
    );
  }

  // ─── Staff endpoints ───────────────────────────────────────────────
  if (url.endsWith('/api/method/barberbook.api.staff.schedule')) {
    const merged = { ...params, ...(body ?? {}) } as Record<string, unknown>;
    const barberId = String(merged.barber ?? 'BB-BAR-2001');
    const dateStr = String(merged.date ?? new Date().toISOString().slice(0, 10));
    // Second appointment is the one currently being served — see `in_chair`.
    const at = (h: number, m: number) => {
      const d = new Date(`${dateStr}T00:00:00`);
      d.setHours(h, m, 0, 0);
      return d.toISOString().slice(0, 19);
    };
    const appointments = [
      {
        name: 'STF-1',
        customer_name: 'Aarav Mehta',
        customer_id: 'cust-aarav',
        service_summary: "Men's Haircut",
        scheduled_at: at(9, 30),
        duration_minutes: 30,
        status: 'Completed' as const,
        total_amount: 350,
        currency: 'INR',
      },
      {
        name: 'STF-2',
        customer_name: 'Priya Iyer',
        customer_id: 'cust-priya',
        service_summary: 'Skin Fade',
        scheduled_at: at(10, 30),
        duration_minutes: 45,
        status: 'InService' as const,
        total_amount: 800,
        currency: 'INR',
        in_chair: true,
      },
      {
        name: 'STF-3',
        customer_name: 'Imran K.',
        customer_id: 'cust-imran',
        service_summary: 'Combo · Beard',
        scheduled_at: at(12, 0),
        duration_minutes: 50,
        status: 'Confirmed' as const,
        total_amount: 500,
        currency: 'INR',
      },
      {
        name: 'STF-4',
        customer_name: 'Sara A.',
        customer_id: 'cust-sara',
        service_summary: "Men's Haircut",
        scheduled_at: at(14, 30),
        duration_minutes: 30,
        status: 'Confirmed' as const,
        total_amount: 350,
        currency: 'INR',
      },
      {
        name: 'STF-5',
        customer_name: 'Devansh',
        customer_id: 'cust-dev',
        service_summary: 'Beard Trim',
        scheduled_at: at(16, 0),
        duration_minutes: 20,
        status: 'Confirmed' as const,
        total_amount: 200,
        currency: 'INR',
      },
    ];
    const billed = appointments
      .filter((a) => a.status === 'Completed' || a.status === 'InService')
      .reduce((s, a) => s + a.duration_minutes, 0);
    return ok(
      {
        message: {
          barber: barberId,
          date: dateStr,
          total_bookings: appointments.length,
          billed_minutes: billed,
          tips_today: 420,
          currency: 'INR',
          appointments,
        },
      },
      config,
    );
  }

  if (url.endsWith('/api/method/barberbook.api.staff.in_service')) {
    const merged = { ...params, ...(body ?? {}) } as Record<string, unknown>;
    const barberId = String(merged.barber ?? 'BB-BAR-2001');
    const startedAt = new Date(Date.now() - 18 * 60 * 1000).toISOString().slice(0, 19);
    return ok(
      {
        message: {
          booking: {
            ...baseAuditMock(),
            doctype: 'BB Booking',
            name: 'STF-2',
            customer: 'cust-priya',
            shop: 'BB-SHOP-00001',
            barber: barberId,
            scheduled_at: startedAt,
            duration_minutes: 45,
            services: [{ service: 'BB-SVC-1101', duration_minutes: 45, price: 800 }],
            status: 'InService',
            total_amount: 800,
            currency: 'INR',
            payment_status: 'Pending',
            token_code: 'BB-IN-007',
          },
          customer_name: 'Priya Iyer',
          customer_id: 'cust-priya',
          notes_from_last_visit:
            'Likes a tight skin fade, keeps top length ~3 inches. Allergic to scented gels.',
          started_at: startedAt,
        },
      },
      config,
    );
  }

  if (url.endsWith('/api/method/barberbook.api.staff.complete')) {
    return ok(
      {
        message: {
          ...baseAuditMock(),
          doctype: 'BB Booking',
          name: 'STF-2',
          status: 'Completed',
          total_amount: 800,
          currency: 'INR',
        },
      },
      config,
    );
  }

  if (url.endsWith('/api/method/barberbook.api.staff.customer')) {
    const merged = { ...params, ...(body ?? {}) } as Record<string, unknown>;
    const customerId = String(merged.customer_id ?? 'cust-priya');
    return ok(
      {
        message: {
          customer_id: customerId,
          full_name: 'Priya Iyer',
          avatar_seed: 'priya-iyer',
          phone: '+91 98000 31415',
          preferences: {
            hair: 'Tight skin fade · top ~3"',
            beard: 'Trim only, square edge',
            allergies: 'Scented gels',
            music: 'Old-school hip-hop',
            notes: 'Always early. Tips well after a clean fade.',
          },
          stats: {
            visits_with_you: 9,
            total_spent: 6400,
            currency: 'INR',
            avg_rating: 4.9,
          },
          past_visits: [
            {
              name: 'BB-BKG-7001',
              scheduled_at: '2026-04-22T17:00:00',
              service_summary: 'Skin Fade',
              rating: 5,
              total_amount: 800,
              currency: 'INR',
            },
            {
              name: 'BB-BKG-6800',
              scheduled_at: '2026-03-18T18:30:00',
              service_summary: 'Combo',
              rating: 5,
              total_amount: 500,
              currency: 'INR',
            },
            {
              name: 'BB-BKG-6720',
              scheduled_at: '2026-02-20T11:00:00',
              service_summary: 'Skin Fade',
              rating: 5,
              total_amount: 800,
              currency: 'INR',
            },
            {
              name: 'BB-BKG-6602',
              scheduled_at: '2026-01-23T16:00:00',
              service_summary: "Men's Haircut",
              rating: 4,
              total_amount: 350,
              currency: 'INR',
            },
          ],
        },
      },
      config,
    );
  }

  if (url.endsWith('/api/method/barberbook.api.staff.earnings')) {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      .toISOString()
      .slice(0, 10);
    return ok(
      {
        message: {
          barber: String(params.barber ?? 'BB-BAR-2001'),
          month_start: monthStart,
          total_amount: 84_200,
          currency: 'INR',
          cuts: 142,
          avg_rating: 4.9,
          repeat_rate: 0.62,
          no_shows: 3,
          recent_tips: [
            {
              name: 'TIP-1',
              customer_name: 'Priya Iyer',
              amount: 100,
              posted_at: new Date(today.getTime() - 2 * 60 * 60 * 1000).toISOString(),
              message: 'Sharpest fade in town. Thank you!',
              rating: 5,
            },
            {
              name: 'TIP-2',
              customer_name: 'Aarav Mehta',
              amount: 50,
              posted_at: new Date(today.getTime() - 5 * 60 * 60 * 1000).toISOString(),
              rating: 5,
            },
            {
              name: 'TIP-3',
              customer_name: null,
              amount: 200,
              posted_at: new Date(today.getTime() - 26 * 60 * 60 * 1000).toISOString(),
              message: 'My son loved it. ✂️',
              rating: 5,
            },
            {
              name: 'TIP-4',
              customer_name: 'Devansh',
              amount: 30,
              posted_at: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
              rating: 4,
            },
          ],
        },
      },
      config,
    );
  }

  if (url.endsWith('/api/method/barberbook.api.review.draft_response')) {
    const merged = { ...params, ...(body ?? {}) } as Record<string, unknown>;
    const tone = (merged.tone as string | undefined) ?? 'neutral';
    const reviewName = String(merged.review ?? '');
    const review = REVIEWS.find((r) => r.name === reviewName);
    const rating = review?.rating ?? 4;

    let draft = '';
    if (rating >= 4) {
      draft =
        tone === 'grateful'
          ? "Thank you so much for the kind words — we'll pass them straight to the team. See you on your next visit!"
          : "Thanks for taking the time to share this. We're glad you enjoyed your visit and we'll keep raising the bar.";
    } else {
      draft =
        tone === 'apologetic'
          ? "We're truly sorry your visit didn't meet expectations. Please DM us so we can make it right on your next chair."
          : "Thanks for the honest feedback — we've shared it with the barber and we'd love a second chance to do better.";
    }
    return ok({ message: { draft, tokens: draft.split(/\s+/).length } }, config);
  }

  if (
    url.endsWith('/api/method/barberbook.api.push.register_device') ||
    url.endsWith('/api/method/barberbook.api.push.unregister_device')
  ) {
    return ok(
      {
        message: {
          token_id: `mock-token-${Date.now()}`,
          registered_at: new Date().toISOString(),
        },
      },
      config,
    );
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

/** Synthetic timeline entries so the OwnerToday screen has rows even when
 *  no real bookings have been created in the mock yet. */
function padTimelineForShop(shop: string) {
  const today = new Date();
  const at = (h: number, m: number) => {
    const d = new Date(today);
    d.setHours(h, m, 0, 0);
    return d.toISOString().slice(0, 19);
  };
  return [
    {
      name: 'MOCK-T-1',
      shop,
      barber: 'BB-BAR-2001',
      scheduled_at: at(10, 0),
      duration_minutes: 30,
      status: 'Completed' as const,
      total_amount: 350,
      currency: 'INR' as const,
      customer_name: 'Aarav Mehta',
      service_summary: "Men's Haircut",
    },
    {
      name: 'MOCK-T-2',
      shop,
      barber: 'BB-BAR-2002',
      scheduled_at: at(11, 30),
      duration_minutes: 45,
      status: 'InService' as const,
      total_amount: 800,
      currency: 'INR' as const,
      customer_name: 'Priya Iyer',
      service_summary: 'Skin Fade',
    },
    {
      name: 'MOCK-T-3',
      shop,
      barber: 'BB-BAR-2001',
      scheduled_at: at(13, 0),
      duration_minutes: 50,
      status: 'Confirmed' as const,
      total_amount: 500,
      currency: 'INR' as const,
      customer_name: 'Imran K.',
      service_summary: 'Combo',
    },
    {
      name: 'MOCK-T-4',
      shop,
      barber: 'BB-BAR-2002',
      scheduled_at: at(15, 30),
      duration_minutes: 30,
      status: 'Confirmed' as const,
      total_amount: 350,
      currency: 'INR' as const,
      customer_name: 'Sara A.',
      service_summary: "Men's Haircut",
    },
    {
      name: 'MOCK-T-5',
      shop,
      barber: 'BB-BAR-2001',
      scheduled_at: at(17, 0),
      duration_minutes: 20,
      status: 'Cancelled' as const,
      total_amount: 200,
      currency: 'INR' as const,
      customer_name: 'Devansh',
      service_summary: 'Beard Trim',
    },
  ];
}
