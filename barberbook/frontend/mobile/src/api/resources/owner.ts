import { rpc, rpcGet } from '../client';
import type { Booking, BookingStatus, WalkinTicket } from '../types';

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
