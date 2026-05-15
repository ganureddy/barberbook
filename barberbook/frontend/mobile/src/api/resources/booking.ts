import { getDraftIdempotencyKey } from '../../lib/idempotency';
import { rpc } from '../client';
import type { Booking, BookingService, BookingStatus } from '../types';

import { makeRepo } from './_factory';

export const bookingRepo = makeRepo<Booking>('BB Booking');

export interface AvailabilitySlot {
  /** ISO datetime in the shop's local timezone. */
  start_at: string;
  end_at: string;
  /** True when at least one barber+seat combo is free for the duration. */
  available: boolean;
  /** Estimated price total for the chosen services. */
  total: number;
}

export interface AvailabilityParams {
  shop: string;
  /** Either a specific barber or 'any'. */
  barber?: string;
  /** Local date YYYY-MM-DD. */
  date: string;
  service_names: string[];
}

export function getAvailability(params: AvailabilityParams): Promise<AvailabilitySlot[]> {
  return rpc<AvailabilitySlot[]>('barberbook.api.booking.get_availability', params);
}

export interface CreateBookingPayload {
  shop: string;
  barber?: string;
  scheduled_at: string;
  services: BookingService[];
  notes?: string;
  /** Optional client hint — server still computes the canonical total. */
  client_total?: number;
  /** Loyalty redemption applied. Server validates against the customer's balance. */
  loyalty_points_to_redeem?: number;
  /** Selected payment method, one of 'upi' | 'card' | 'cash'. */
  payment_method?: 'upi' | 'card' | 'cash';
}

/**
 * Create a booking with an `Idempotency-Key` header, sourced from the
 * draft. The server uses this to dedupe retries, so a flaky network can't
 * double-book the same chair. The key is cleared on successful create
 * (caller responsibility — `useBookingDraftStore.reset()` does it).
 */
export function createBooking(payload: CreateBookingPayload): Promise<Booking> {
  return rpc<Booking>('barberbook.api.booking.create', payload, {
    headers: { 'Idempotency-Key': getDraftIdempotencyKey() },
  });
}

export function updateBookingStatus(name: string, status: BookingStatus): Promise<Booking> {
  return rpc<Booking>('barberbook.api.booking.update_status', { name, status });
}

export function listMyBookings(status?: BookingStatus | 'Upcoming' | 'Past'): Promise<Booking[]> {
  return rpc<Booking[]>('barberbook.api.booking.list_mine', status ? { status } : {});
}
