/**
 * Mock router. Sits behind the axios client and answers requests from
 * `fixtures.ts` so the entire app can run without a Frappe site.
 *
 * Strategy: pattern-match on (method, URL path, params/body) and return a
 * payload that mirrors what Frappe would serve. Anything unmatched falls
 * back to a 404 so we notice missing fixtures during development.
 */

import type { AxiosRequestConfig, AxiosResponse } from 'axios';

import { normalizePhone } from '../../lib/phone';
import { channels, publishLocal } from '../realtime';
import type {
  Barber,
  Booking,
  DayOfWeek,
  FrappeBaseDoc,
  ListParams,
  Review,
  SessionUser,
  Shop,
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
      return notFound(config, `Invalid OTP (mock). Try ${MOCK_OTP_CODE}.`);
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
  if (url.endsWith('/api/method/barberbook.api.owner.create_shop')) {
    const b = body ?? {};
    const idx = SHOPS.length + 1;
    const name = String(b.shop_name ?? 'New Shop').trim() || 'New Shop';
    const slug =
      String(b.slug ?? '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') ||
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    const shopName = `BB-SHOP-${String(10000 + idx)}`;
    const photos = Array.isArray(b.photos) ? (b.photos as string[]) : [];
    const shop: Shop = {
      ...baseAuditMock(),
      doctype: 'BB Shop',
      name: shopName,
      shop_name: name,
      slug,
      owner_user: MOCK_USER.email,
      status: 'Active',
      country: 'IN',
      city: String(b.city ?? 'Kozhikode'),
      address_line: String(b.address_line ?? ''),
      pincode: String(b.pincode ?? ''),
      latitude: Number(b.latitude ?? 11.2588),
      longitude: Number(b.longitude ?? 75.7804),
      rating: 0,
      rating_count: 0,
      price_tier: 2,
      is_open: 1,
      accepts_walkin: 1,
      cover_variant: (idx % 4) as 0 | 1 | 2 | 3,
      open_time: String(b.open_time ?? '09:00:00'),
      close_time: String(b.close_time ?? '21:00:00'),
      phone: String(b.phone ?? ''),
      currency: 'INR',
      cover_image: (b.cover_image as string | undefined) ?? photos[0],
      photos,
    };
    SHOPS.push(shop);

    // Provision seats.
    const seatCount = Math.max(0, Number(b.seat_count ?? 0));
    for (let i = 1; i <= seatCount; i++) {
      SEATS.push({
        ...baseAuditMock(),
        doctype: 'BB Seat',
        name: `MOCK-SEAT-${shopName}-${i}`,
        shop: shopName,
        seat_number: i,
        label: `Seat ${i}`,
        is_active: 1,
      });
    }

    // Provision barbers with their weekly schedule.
    const barberDrafts = Array.isArray(b.barbers) ? (b.barbers as Record<string, unknown>[]) : [];
    barberDrafts.forEach((draft, i) => {
      const fullName = String(draft.full_name ?? `Barber ${i + 1}`).trim();
      BARBERS.push({
        ...baseAuditMock(),
        doctype: 'BB Barber',
        name: `MOCK-BAR-${shopName}-${i + 1}`,
        shop: shopName,
        full_name: fullName,
        short_name: shortName(fullName),
        initials: initialsOf(fullName),
        specialties: String(draft.specialties ?? ''),
        years_experience: Number(draft.years_experience ?? 0),
        rating: 0,
        rating_count: 0,
        avatar_seed: fullName.toLowerCase(),
        is_active: 1,
        phone: draft.phone as string | undefined,
        available_days: (draft.available_days as DayOfWeek[] | undefined) ?? undefined,
        shift_start: draft.shift_start as string | undefined,
        shift_end: draft.shift_end as string | undefined,
      });
    });

    // Roll out the menu of services.
    const serviceDrafts = Array.isArray(b.services)
      ? (b.services as Record<string, unknown>[])
      : [];
    serviceDrafts.forEach((draft, i) => {
      SERVICES.push({
        ...baseAuditMock(),
        doctype: 'BB Service',
        name: `MOCK-SVC-${shopName}-${i + 1}`,
        shop: shopName,
        service_name: String(draft.service_name ?? `Service ${i + 1}`),
        category: String(draft.category ?? 'Hair'),
        duration_minutes: Number(draft.duration_minutes ?? 30),
        price: Number(draft.price ?? 0),
        currency: 'INR',
        is_active: 1,
      });
    });

    return ok({ message: shop }, config);
  }

  if (url.endsWith('/api/method/barberbook.api.owner.my_shops')) {
    const mine = SHOPS.filter((s) => s.owner_user === MOCK_USER.email);
    const summaries = mine
      .slice()
      .reverse()
      .map((s) => {
        const bookings = BOOKINGS.filter((bk) => bk.shop === s.name);
        const revenue = bookings
          .filter((bk) => bk.status === 'Completed')
          .reduce((sum, bk) => sum + (bk.total_amount ?? 0), 0);
        return {
          shop: s,
          barber_count: BARBERS.filter((bar) => bar.shop === s.name).length,
          service_count: SERVICES.filter((sv) => sv.shop === s.name).length,
          bookings_today: bookings.length,
          revenue_today: revenue,
          currency: s.currency,
        };
      });
    return ok({ message: summaries }, config);
  }

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
    return ok(
      {
        message: {
          shop: shopId,
          date: new Date().toISOString().slice(0, 10),
          bookings: timeline.length,
          walkins: WALKIN_TICKETS.filter((t) => t.shop === shopId && t.status !== 'Cancelled')
            .length,
          revenue,
          currency: 'INR',
          timeline,
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
    const completed = BOOKINGS.filter((b) => b.shop === shopId && b.status === 'Completed');

    // Real daily series from completed bookings over the last 30 days.
    const daily = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (29 - i));
      const key = d.toISOString().slice(0, 10);
      const dayBookings = completed.filter((b) => b.scheduled_at.slice(0, 10) === key);
      return {
        date: key,
        amount: dayBookings.reduce((s, b) => s + (b.total_amount ?? 0), 0),
        bookings: dayBookings.length,
      };
    });
    const monthRevenue = daily.reduce((s, d) => s + d.amount, 0);
    return ok(
      {
        message: {
          shop: shopId,
          currency: 'INR',
          pending_amount: Math.round(monthRevenue * 0.18),
          next_payout_at:
            monthRevenue > 0 ? new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString() : null,
          daily,
          top_services: [],
          payouts: [],
        },
      },
      config,
    );
  }

  // ─── Staff endpoints ───────────────────────────────────────────────
  if (url.endsWith('/api/method/barberbook.api.staff.onboard')) {
    const b = body ?? {};
    const fullName = String(b.full_name ?? 'New Barber').trim() || 'New Barber';
    const shopIds = Array.isArray(b.shop_ids) ? (b.shop_ids as string[]) : [];
    const created: Barber[] = shopIds.map((shopId, i) => {
      const barber: Barber = {
        ...baseAuditMock(),
        doctype: 'BB Barber',
        name: `MOCK-BAR-ME-${Date.now()}-${i}`,
        shop: shopId,
        user: MOCK_USER.email,
        full_name: fullName,
        short_name: shortName(fullName),
        initials: initialsOf(fullName),
        specialties: String(b.specialties ?? ''),
        years_experience: Number(b.years_experience ?? 0),
        rating: 0,
        rating_count: 0,
        avatar_seed: String(b.avatar_seed ?? fullName.toLowerCase()),
        is_active: 1,
        phone: b.phone as string | undefined,
        available_days: (b.available_days as DayOfWeek[] | undefined) ?? undefined,
        shift_start: b.shift_start as string | undefined,
        shift_end: b.shift_end as string | undefined,
      };
      BARBERS.push(barber);
      return barber;
    });
    return ok({ message: created.map(barberWorkspaceMock) }, config);
  }

  if (url.endsWith('/api/method/barberbook.api.staff.my_shops')) {
    const merged = { ...params, ...(body ?? {}) } as Record<string, unknown>;
    const wantPhone = normalizePhone(String(merged.phone ?? ''));
    const mine = BARBERS.filter((bar) => {
      if (bar.user === MOCK_USER.email) return true;
      // Auto-link any barber a shop owner pre-created for this phone number.
      if (wantPhone && normalizePhone(bar.phone) === wantPhone) {
        bar.user = MOCK_USER.email; // claim the record
        return true;
      }
      return false;
    });
    return ok({ message: mine.map(barberWorkspaceMock) }, config);
  }

  if (url.endsWith('/api/method/barberbook.api.staff.update_profile')) {
    const b = body ?? {};
    const mine = BARBERS.filter((bar) => bar.user === MOCK_USER.email);
    const fullName = typeof b.full_name === 'string' ? b.full_name.trim() : undefined;
    mine.forEach((bar) => {
      // Personal fields apply to every shop the barber works in.
      if (fullName) {
        bar.full_name = fullName;
        bar.short_name = shortName(fullName);
        bar.initials = initialsOf(fullName);
      }
      if (typeof b.specialties === 'string') bar.specialties = b.specialties;
      if (b.years_experience != null) bar.years_experience = Number(b.years_experience);
      if (typeof b.phone === 'string') bar.phone = b.phone;
      if (typeof b.avatar_seed === 'string') bar.avatar_seed = b.avatar_seed;
      bar.modified = new Date().toISOString();
    });
    // Schedule is per-shop: only the named record.
    const targetName = typeof b.barber === 'string' ? b.barber : undefined;
    const target = targetName ? mine.find((bar) => bar.name === targetName) : undefined;
    if (target) {
      if (Array.isArray(b.available_days)) target.available_days = b.available_days as DayOfWeek[];
      if (typeof b.shift_start === 'string') target.shift_start = b.shift_start;
      if (typeof b.shift_end === 'string') target.shift_end = b.shift_end;
    }
    return ok({ message: mine.map(barberWorkspaceMock) }, config);
  }

  if (url.endsWith('/api/method/barberbook.api.staff.schedule')) {
    const merged = { ...params, ...(body ?? {}) } as Record<string, unknown>;
    const barberId = String(merged.barber ?? '');
    const dateStr = String(merged.date ?? new Date().toISOString().slice(0, 10));
    const appointments = BOOKINGS.filter(
      (b) =>
        b.barber === barberId &&
        b.scheduled_at.slice(0, 10) === dateStr &&
        b.status !== 'Cancelled',
    )
      .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
      .map((b) => ({
        name: b.name,
        customer_name: b.customer,
        customer_id: b.customer,
        service_summary: `${b.services.length} service${b.services.length === 1 ? '' : 's'}`,
        scheduled_at: b.scheduled_at,
        duration_minutes: b.duration_minutes,
        status: b.status,
        total_amount: b.total_amount,
        currency: b.currency,
        in_chair: b.status === 'InService',
      }));
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
          tips_today: 0,
          currency: 'INR',
          appointments,
        },
      },
      config,
    );
  }

  if (url.endsWith('/api/method/barberbook.api.staff.in_service')) {
    const merged = { ...params, ...(body ?? {}) } as Record<string, unknown>;
    const barberId = String(merged.barber ?? '');
    const active = BOOKINGS.find((b) => b.barber === barberId && b.status === 'InService') ?? null;
    return ok(
      {
        message: {
          booking: active,
          customer_name: active?.customer ?? null,
          customer_id: active?.customer ?? null,
          notes_from_last_visit: active?.notes ?? null,
          started_at: active?.scheduled_at ?? null,
        },
      },
      config,
    );
  }

  if (url.endsWith('/api/method/barberbook.api.staff.complete')) {
    const merged = { ...params, ...(body ?? {}) } as Record<string, unknown>;
    const name = String(merged.booking ?? '');
    const row = BOOKINGS.find((b) => b.name === name);
    if (!row) return notFound(config, `Booking '${name}' not found`);
    row.status = 'Completed';
    row.modified = new Date().toISOString();
    return ok({ message: row }, config);
  }

  if (url.endsWith('/api/method/barberbook.api.staff.customer')) {
    const merged = { ...params, ...(body ?? {}) } as Record<string, unknown>;
    const customerId = String(merged.customer_id ?? '');
    const mine = BOOKINGS.filter((b) => b.customer === customerId);
    const completed = mine.filter((b) => b.status === 'Completed');
    return ok(
      {
        message: {
          customer_id: customerId,
          full_name: customerId,
          avatar_seed: customerId,
          phone: '',
          preferences: {},
          stats: {
            visits_with_you: completed.length,
            total_spent: completed.reduce((s, b) => s + (b.total_amount ?? 0), 0),
            currency: 'INR',
            avg_rating: 0,
          },
          past_visits: completed
            .sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at))
            .slice(0, 10)
            .map((b) => ({
              name: b.name,
              scheduled_at: b.scheduled_at,
              service_summary: `${b.services.length} service${b.services.length === 1 ? '' : 's'}`,
              total_amount: b.total_amount,
              currency: b.currency,
            })),
        },
      },
      config,
    );
  }

  if (url.endsWith('/api/method/barberbook.api.staff.earnings')) {
    const merged = { ...params, ...(body ?? {}) } as Record<string, unknown>;
    const barberId = String(merged.barber ?? '');
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      .toISOString()
      .slice(0, 10);
    const monthBookings = BOOKINGS.filter(
      (b) => b.barber === barberId && b.scheduled_at.slice(0, 10) >= monthStart,
    );
    const completed = monthBookings.filter((b) => b.status === 'Completed');
    return ok(
      {
        message: {
          barber: barberId,
          month_start: monthStart,
          total_amount: completed.reduce((s, b) => s + (b.total_amount ?? 0), 0),
          currency: 'INR',
          cuts: completed.length,
          avg_rating: 0,
          repeat_rate: 0,
          no_shows: monthBookings.filter((b) => b.status === 'NoShow').length,
          recent_tips: [],
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

function shortName(full: string): string {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

function initialsOf(full: string): string {
  const parts = full.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '';
  return (first + last).toUpperCase() || 'BB';
}

/** Build the BarberWorkspace shape the staff client expects from a Barber. */
function barberWorkspaceMock(barber: Barber) {
  const shop = SHOPS.find((s) => s.name === barber.shop);
  const bookings = BOOKINGS.filter((bk) => bk.shop === barber.shop && bk.barber === barber.name);
  return {
    barber: barber.name,
    barber_name: barber.full_name,
    specialties: barber.specialties,
    available_days: barber.available_days,
    shift_start: barber.shift_start,
    shift_end: barber.shift_end,
    shop: shop ?? {
      ...baseAuditMock(),
      doctype: 'BB Shop' as const,
      name: barber.shop,
      shop_name: barber.shop,
      slug: barber.shop.toLowerCase(),
      owner_user: '',
      status: 'Active' as const,
      country: 'IN' as const,
      city: '',
      address_line: '',
      pincode: '',
      latitude: 0,
      longitude: 0,
      rating: 0,
      rating_count: 0,
      price_tier: 2 as const,
      is_open: 1 as const,
      accepts_walkin: 1 as const,
      cover_variant: 0 as const,
      currency: 'INR' as const,
    },
    bookings_today: bookings.length,
    tips_today: 0,
    currency: shop?.currency ?? 'INR',
  };
}
