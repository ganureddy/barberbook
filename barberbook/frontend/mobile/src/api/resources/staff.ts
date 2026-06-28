import { rpc, rpcGet } from '../client';
import type { Booking, BookingStatus, Currency, DayOfWeek, Shop } from '../types';

// ─── Barber onboarding (multi-shop) ─────────────────────────────────────────

export interface BarberOnboardInput {
  full_name: string;
  specialties?: string;
  years_experience?: number;
  phone?: string;
  avatar_seed?: string;
  /** Shops (BB Shop.name) the barber wants to work in. */
  shop_ids: string[];
  /** Weekly availability applied to each shop. */
  available_days?: DayOfWeek[];
  shift_start?: string; // 'HH:mm'
  shift_end?: string; // 'HH:mm'
}

/** One shop a barber works in (a BB Barber row joined to its BB Shop). */
export interface BarberWorkspace {
  /** BB Barber.name for this shop. */
  barber: string;
  /** Display name on the barber record (as set by the owner / barber). */
  barber_name: string;
  /** Comma-separated specialties from the record. */
  specialties?: string;
  /** Weekly working days the owner/barber set for this shop. */
  available_days?: DayOfWeek[];
  shift_start?: string; // 'HH:mm'
  shift_end?: string; // 'HH:mm'
  shop: Shop;
  bookings_today: number;
  tips_today: number;
  currency: Currency;
}

/**
 * Create/link the signed-in user as a barber across one or more shops.
 * Returns the resulting list of workspaces.
 */
export function onboardBarber(input: BarberOnboardInput): Promise<BarberWorkspace[]> {
  return rpc<BarberWorkspace[]>('barberbook.api.staff.onboard', input);
}

/**
 * List every shop the signed-in barber works in. Pass the barber's login
 * phone so the backend can also surface (and claim) any barber records a
 * shop owner pre-created for that number during shop onboarding.
 */
export function getMyBarberWorkspaces(phone?: string): Promise<BarberWorkspace[]> {
  return rpcGet<BarberWorkspace[]>('barberbook.api.staff.my_shops', phone ? { phone } : undefined);
}

/**
 * Update the signed-in barber's own profile. Personal fields (name,
 * specialties, experience, phone, photo) apply across every shop the barber
 * works in; the weekly schedule (days/shift) is per-shop and only updates the
 * record named in `barber`. Returns the refreshed list of workspaces.
 */
export interface BarberProfileUpdate {
  full_name?: string;
  phone?: string;
  specialties?: string;
  years_experience?: number;
  avatar_seed?: string;
  /** The specific BB Barber record (shop) whose schedule is being edited. */
  barber?: string;
  available_days?: DayOfWeek[];
  shift_start?: string;
  shift_end?: string;
}

export function updateBarberProfile(input: BarberProfileUpdate): Promise<BarberWorkspace[]> {
  return rpc<BarberWorkspace[]>('barberbook.api.staff.update_profile', input);
}

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
