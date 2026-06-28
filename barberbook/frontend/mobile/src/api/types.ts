/**
 * Domain types mirroring the BarberBook DocTypes on the Frappe side.
 *
 * Field naming follows Frappe's snake_case convention so we can pass these
 * straight into `/api/method/frappe.client.*` payloads without a translation
 * layer. Frappe-managed audit fields (creation/modified/owner/...) are
 * grouped on a shared `FrappeBaseDoc` and inherited where useful.
 *
 * These interfaces are the contract the mobile client expects from the
 * backend. The Frappe DocTypes (which don't exist yet — backend is bare)
 * MUST honour these field names when they are added.
 */

// ─── Frappe primitives ──────────────────────────────────────────────────────

/** Standard fields Frappe stamps on every doc. */
export interface FrappeBaseDoc {
  /** Primary key (`name` in Frappe terminology). */
  name: string;
  owner: string;
  creation: string; // ISO datetime
  modified: string; // ISO datetime
  modified_by: string;
  docstatus?: 0 | 1 | 2; // draft / submitted / cancelled
  idx?: number;
}

/** Generic Frappe `frappe.client.get_list` filter tuple. */
export type FrappeFilter =
  | [string, '=' | '!=' | '<' | '>' | '<=' | '>=' | 'like' | 'in' | 'not in' | 'between', unknown]
  | [
      string,
      string,
      '=' | '!=' | '<' | '>' | '<=' | '>=' | 'like' | 'in' | 'not in' | 'between',
      unknown,
    ];

export interface ListParams<T> {
  fields?: readonly (keyof T | '*')[];
  filters?: readonly FrappeFilter[];
  /** Free-text search applied to the doc's title field. */
  or_filters?: readonly FrappeFilter[];
  order_by?: string;
  limit_start?: number;
  limit_page_length?: number;
}

// ─── Shared enums ───────────────────────────────────────────────────────────

export type Country = 'IN' | 'AE' | 'GB';
export type Currency = 'INR' | 'AED' | 'GBP';
export type ShopStatus = 'Draft' | 'Pending Verification' | 'Active' | 'Paused' | 'Suspended';
export type BookingStatus =
  | 'Draft'
  | 'Confirmed'
  | 'CheckedIn'
  | 'InService'
  | 'Completed'
  | 'Cancelled'
  | 'NoShow';
export type WalkinStatus = 'Waiting' | 'NextUp' | 'InService' | 'Completed' | 'Cancelled';
export type RosterStatus = 'Draft' | 'Published' | 'Conflict';
export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
export type UserRole = 'Customer' | 'Owner' | 'Staff' | 'Admin';

// ─── Shop ───────────────────────────────────────────────────────────────────

export interface Shop extends FrappeBaseDoc {
  doctype: 'BB Shop';
  shop_name: string;
  slug: string;
  owner_user: string;
  status: ShopStatus;
  country: Country;
  city: string;
  address_line: string;
  pincode: string;
  /** WGS84. */
  latitude: number;
  longitude: number;
  /** Cached aggregate from the BB Review table. 0..5 with one decimal. */
  rating: number;
  rating_count: number;
  /** Display price tier — '₹', '₹₹', '₹₹₹'. */
  price_tier: 1 | 2 | 3;
  is_open: 0 | 1;
  accepts_walkin: 0 | 1;
  cover_variant: 0 | 1 | 2 | 3;
  open_time?: string; // 'HH:mm:ss'
  close_time?: string;
  phone?: string;
  /** ISO 4217. Drives money formatting client-side. */
  currency: Currency;
  /** Hero/cover image URL (or local URI in mock mode). */
  cover_image?: string;
  /** Gallery image URLs. */
  photos?: string[];
}

// ─── Service ────────────────────────────────────────────────────────────────

export interface Service extends FrappeBaseDoc {
  doctype: 'BB Service';
  shop: string; // Shop.name
  service_name: string;
  category: string; // Hair / Beard / Color / Spa / Combo
  duration_minutes: number;
  price: number;
  currency: Currency;
  is_active: 0 | 1;
  description?: string;
}

// ─── Barber (staff member) ──────────────────────────────────────────────────

export interface Barber extends FrappeBaseDoc {
  doctype: 'BB Barber';
  shop: string;
  user?: string; // optional — links to a Frappe User if the barber has the staff app
  full_name: string;
  short_name: string; // 'Imran K.'
  initials: string; // 'IK'
  specialties: string; // comma-separated tags: 'Fades, Skin'
  years_experience: number;
  rating: number;
  rating_count: number;
  avatar_seed: string;
  is_active: 0 | 1;
  phone?: string;
  /** Optional per-shop weekly availability captured at onboarding. */
  available_days?: DayOfWeek[];
  shift_start?: string; // 'HH:mm'
  shift_end?: string; // 'HH:mm'
}

// ─── Seat (chair) ───────────────────────────────────────────────────────────

export interface Seat extends FrappeBaseDoc {
  doctype: 'BB Seat';
  shop: string;
  seat_number: number;
  label: string; // 'Seat 1'
  is_active: 0 | 1;
}

// ─── Roster (weekly assignment of barbers to seats by shift) ────────────────

export interface RosterShift {
  day: DayOfWeek;
  start_time: string; // 'HH:mm'
  end_time: string;
  seat: string; // Seat.name
  barber: string; // Barber.name
}

export interface Roster extends FrappeBaseDoc {
  doctype: 'BB Roster';
  shop: string;
  /** ISO date of the Monday of the rostered week. */
  week_starting: string;
  status: RosterStatus;
  shifts: RosterShift[];
  conflict_count: number;
}

// ─── Booking ────────────────────────────────────────────────────────────────

export interface BookingService {
  service: string; // Service.name
  duration_minutes: number;
  price: number;
}

export interface Booking extends FrappeBaseDoc {
  doctype: 'BB Booking';
  customer: string; // User
  shop: string;
  barber?: string;
  seat?: string;
  /** ISO datetime in the shop's local timezone. */
  scheduled_at: string;
  duration_minutes: number;
  services: BookingService[];
  status: BookingStatus;
  total_amount: number;
  currency: Currency;
  payment_status: 'Pending' | 'Paid' | 'Refunded';
  /** Token displayed on the QR — short, human-friendly. */
  token_code: string;
  /** Optional notes from the customer. */
  notes?: string;
}

// ─── Walk-in ────────────────────────────────────────────────────────────────

export interface WalkinTicket extends FrappeBaseDoc {
  doctype: 'BB Walkin Ticket';
  shop: string;
  customer?: string;
  /** Anonymous walk-ins (phone-only) skip the User link. */
  customer_phone?: string;
  /** Sequential per shop per day, like '07'. */
  token_number: string;
  position_in_queue: number;
  estimated_wait_minutes: number;
  status: WalkinStatus;
  joined_at: string;
  served_at?: string;
}

// ─── Review ─────────────────────────────────────────────────────────────────

export interface Review extends FrappeBaseDoc {
  doctype: 'BB Review';
  customer: string;
  shop: string;
  barber?: string;
  booking?: string;
  rating: 1 | 2 | 3 | 4 | 5;
  body?: string;
  reply?: string;
  reply_at?: string;
}

// ─── Loyalty ────────────────────────────────────────────────────────────────

export interface LoyaltyAccount extends FrappeBaseDoc {
  doctype: 'BB Loyalty Account';
  customer: string;
  shop: string;
  points_balance: number;
  lifetime_points: number;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
}

// ─── User-facing principal ──────────────────────────────────────────────────

export interface SessionUser {
  /** Frappe user id (email). */
  email: string;
  full_name: string;
  phone: string;
  avatar_seed: string;
  roles: UserRole[];
  /** Active role in this app session. Defaults to first matching role. */
  active_role: UserRole;
  /** Frappe session cookie value (cached for native HTTP layer parity). */
  sid?: string;
}

// ─── HTTP envelope shapes ───────────────────────────────────────────────────

/** What `/api/method/<m>` returns. Always wrapped in `{message: ...}`. */
export interface FrappeMessageEnvelope<T> {
  message: T;
}

/** What `/api/resource/<dt>` (list) returns. */
export interface FrappeListEnvelope<T> {
  data: T[];
}
