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
}

export function createBooking(payload: CreateBookingPayload): Promise<Booking> {
  return rpc<Booking>('barberbook.api.booking.create', payload);
}

export function updateBookingStatus(name: string, status: BookingStatus): Promise<Booking> {
  return rpc<Booking>('barberbook.api.booking.update_status', { name, status });
}

export function listMyBookings(status?: BookingStatus | 'Upcoming' | 'Past'): Promise<Booking[]> {
  return rpc<Booking[]>('barberbook.api.booking.list_mine', status ? { status } : {});
}
