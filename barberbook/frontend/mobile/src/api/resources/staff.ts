import { rpc, rpcGet } from '../client';
import type { Booking, BookingStatus } from '../types';

// ─── Staff schedule ────────────────────────────────────────────────────────

export interface StaffScheduleEntry {
  name: string;
  customer_name: string;
  customer_id: string;
  service_summary: string;
  scheduled_at: string;
  duration_minutes: number;
  status: BookingStatus;
  total_amount: number;
  currency: string;
  /** True for the entry currently in the chair. */
  in_chair?: boolean;
}

export interface StaffSchedule {
  barber: string;
  date: string;
  total_bookings: number;
  /** Sum of duration_minutes across confirmed/in-service appointments. */
  billed_minutes: number;
  tips_today: number;
  currency: string;
  appointments: StaffScheduleEntry[];
}

export function getStaffSchedule(barber: string, date?: string): Promise<StaffSchedule> {
  return rpcGet<StaffSchedule>('barberbook.api.staff.schedule', {
    barber,
    ...(date ? { date } : {}),
  });
}

// ─── Staff in-service ──────────────────────────────────────────────────────

export interface StaffInServiceState {
  /** Booking currently being served by this barber, or null. */
  booking: Booking | null;
  customer_name: string | null;
  customer_id: string | null;
  notes_from_last_visit: string | null;
  /** ISO datetime the service started. */
  started_at: string | null;
}

export function getStaffInService(barber: string): Promise<StaffInServiceState> {
  return rpcGet<StaffInServiceState>('barberbook.api.staff.in_service', { barber });
}

export function completeStaffService(barber: string, booking: string): Promise<Booking> {
  return rpc<Booking>('barberbook.api.staff.complete', { barber, booking });
}

// ─── Customer profile (staff side) ─────────────────────────────────────────

export interface StaffCustomerProfile {
  customer_id: string;
  full_name: string;
  avatar_seed: string;
  phone: string;
  preferences: {
    hair?: string;
    beard?: string;
    allergies?: string;
    music?: string;
    notes?: string;
  };
  stats: {
    visits_with_you: number;
    total_spent: number;
    currency: string;
    avg_rating: number;
  };
  past_visits: {
    name: string;
    scheduled_at: string;
    service_summary: string;
    rating?: number;
    total_amount: number;
    currency: string;
  }[];
}

export function getStaffCustomerProfile(
  barber: string,
  customerId: string,
): Promise<StaffCustomerProfile> {
  return rpcGet<StaffCustomerProfile>('barberbook.api.staff.customer', {
    barber,
    customer_id: customerId,
  });
}

// ─── Staff earnings ────────────────────────────────────────────────────────

export interface StaffEarnings {
  barber: string;
  /** Inclusive month start, ISO date. */
  month_start: string;
  total_amount: number;
  currency: string;
  cuts: number;
  avg_rating: number;
  /** Repeat-customer rate as a 0..1 fraction. */
  repeat_rate: number;
  no_shows: number;
  /** Recent tips (last ~30 days). */
  recent_tips: {
    name: string;
    customer_name: string | null;
    amount: number;
    posted_at: string;
    message?: string;
    rating?: number;
  }[];
}

export function getStaffEarnings(barber: string): Promise<StaffEarnings> {
  return rpcGet<StaffEarnings>('barberbook.api.staff.earnings', { barber });
}
