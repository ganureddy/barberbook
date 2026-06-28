import { rpc, rpcGet } from '../client';
import type { Booking, BookingStatus, Currency, DayOfWeek, Shop, WalkinTicket } from '../types';

// ─── Shop enrollment (owner onboarding) ─────────────────────────────────────

/** A barber the owner adds while onboarding their shop. */
export interface OnboardBarberDraft {
  full_name: string;
  specialties?: string;
  years_experience?: number;
  phone?: string;
  available_days?: DayOfWeek[];
  shift_start?: string; // 'HH:mm'
  shift_end?: string; // 'HH:mm'
}

/** A menu item (service) the owner rolls out while onboarding their shop. */
export interface OnboardServiceDraft {
  service_name: string;
  category?: string;
  duration_minutes: number;
  price: number;
}

export interface CreateShopInput {
  shop_name: string;
  slug?: string;
  phone?: string;
  address_line?: string;
  city?: string;
  pincode?: string;
  latitude: number;
  longitude: number;
  open_time?: string;
  close_time?: string;
  /** Hero/cover image URL or local URI. */
  cover_image?: string;
  /** Gallery image URLs/URIs. */
  photos?: string[];
  /** Number of chairs/seats to provision. */
  seat_count?: number;
  /** Barbers to create alongside the shop, each with a weekly schedule. */
  barbers?: OnboardBarberDraft[];
  /** Menu items (services) to roll out with the shop. */
  services?: OnboardServiceDraft[];
}

/**
 * Enroll a new shop for the signed-in owner, together with its photos,
 * seats, roster of barbers and a menu of priced services. The created shop
 * immediately becomes discoverable to customers (it lands in the shop list
 * + map). Returns the freshly created Shop.
 */
export function createShop(input: CreateShopInput): Promise<Shop> {
  return rpc<Shop>('barberbook.api.owner.create_shop', input);
}

// ─── My shops (owner home) ──────────────────────────────────────────────────

/** A shop the signed-in owner runs, enriched with at-a-glance KPIs. */
export interface MyShopSummary {
  shop: Shop;
  barber_count: number;
  service_count: number;
  bookings_today: number;
  revenue_today: number;
  currency: Currency;
}

/** List every shop owned by the signed-in user (newest first). */
export function getMyShops(): Promise<MyShopSummary[]> {
  return rpcGet<MyShopSummary[]>('barberbook.api.owner.my_shops');
}

// ─── KPIs + today's timeline ────────────────────────────────────────────────

export interface OwnerTodayKpis {
  shop: string;
  date: string;
  bookings: number;
  walkins: number;
  revenue: number;
  currency: string;
  /** Today's bookings, time-sorted, for the timeline view. */
  timeline: (Pick<
    Booking,
    | 'name'
    | 'shop'
    | 'barber'
    | 'scheduled_at'
    | 'duration_minutes'
    | 'status'
    | 'total_amount'
    | 'currency'
  > & {
    customer_name: string;
    service_summary: string;
  })[];
}

export function getOwnerToday(shop: string, date?: string): Promise<OwnerTodayKpis> {
  return rpcGet<OwnerTodayKpis>('barberbook.api.owner.today', { shop, ...(date ? { date } : {}) });
}

// ─── Live walk-in queue (owner side) ───────────────────────────────────────

export interface OwnerWalkinQueue {
  shop: string;
  total_in_queue: number;
  avg_wait_minutes: number;
  tickets: (WalkinTicket & {
    customer_name?: string;
    service_summary?: string;
  })[];
}

export function getOwnerWalkinQueue(shop: string): Promise<OwnerWalkinQueue> {
  return rpcGet<OwnerWalkinQueue>('barberbook.api.owner.walkin_queue', { shop });
}

export function callNextWalkin(shop: string, ticketName: string): Promise<WalkinTicket> {
  return rpc<WalkinTicket>('barberbook.api.owner.walkin_call', {
    shop,
    name: ticketName,
  });
}

export function completeWalkin(shop: string, ticketName: string): Promise<WalkinTicket> {
  return rpc<WalkinTicket>('barberbook.api.owner.walkin_done', {
    shop,
    name: ticketName,
  });
}

// ─── Money — payouts, daily revenue, top services ──────────────────────────

export interface OwnerPayoutSummary {
  shop: string;
  currency: string;
  /** Cleared but not yet paid out. */
  pending_amount: number;
  /** ISO date of the next scheduled payout. */
  next_payout_at: string | null;
  /** Daily revenue series (most recent first). */
  daily: { date: string; amount: number; bookings: number }[];
  top_services: { service_name: string; amount: number; count: number }[];
  payouts: {
    name: string; // Frappe Payment Entry id
    amount: number;
    posted_at: string;
    status: 'pending' | 'settled' | 'failed';
    bank_ref?: string;
  }[];
}

export function getOwnerPayoutSummary(shop: string): Promise<OwnerPayoutSummary> {
  return rpcGet<OwnerPayoutSummary>('barberbook.api.owner.payouts', { shop });
}

// ─── Reviews — AI draft response ───────────────────────────────────────────

export interface DraftResponseInput {
  review: string; // Review.name
  /** Optional tone hint: 'apologetic' | 'grateful' | 'matter-of-fact'. */
  tone?: 'grateful' | 'apologetic' | 'neutral';
}

export interface DraftResponseResult {
  draft: string;
  /** Tokens consumed (informational; surfaced in DevHud). */
  tokens?: number;
}

export function draftReviewResponse(input: DraftResponseInput): Promise<DraftResponseResult> {
  return rpc<DraftResponseResult>('barberbook.api.review.draft_response', input);
}

// ─── Owner-side booking status mutation ────────────────────────────────────

export function setBookingStatus(name: string, status: BookingStatus): Promise<Booking> {
  return rpc<Booking>('barberbook.api.owner.set_booking_status', { name, status });
}
