/**
 * Mock fixtures.
 *
 * These arrays start EMPTY on purpose: everything (shops, barbers, seats,
 * services, bookings, …) is created at runtime through the in-app onboarding
 * flows and the mock router, so a fresh install behaves like a brand-new
 * deployment with no seeded sample data. The only seeded values are the demo
 * session user and the dev OTP, which the auth flow needs to function.
 *
 * Records the user creates during a session are pushed into these arrays by
 * `router.ts`; they persist for the lifetime of the JS runtime.
 */

import type {
  Barber,
  Booking,
  LoyaltyAccount,
  Review,
  Roster,
  Seat,
  Service,
  SessionUser,
  Shop,
  WalkinTicket,
} from '../types';

export const SHOPS: Shop[] = [];
export const SERVICES: Service[] = [];
export const BARBERS: Barber[] = [];
export const SEATS: Seat[] = [];
export const ROSTERS: Roster[] = [];
export const BOOKINGS: Booking[] = [];
export const WALKIN_TICKETS: WalkinTicket[] = [];
export const REVIEWS: Review[] = [];
export const LOYALTY_ACCOUNTS: LoyaltyAccount[] = [];

// ─── Session ────────────────────────────────────────────────────────────────
// The one seeded value: a demo principal so OTP login resolves to a user.

export const MOCK_USER: SessionUser = {
  email: 'demo@barberbook.app',
  full_name: 'Demo User',
  phone: '+91 90000 00000',
  avatar_seed: 'demo-user',
  roles: ['Customer'],
  active_role: 'Customer',
  sid: 'mock-sid-demo',
};

export const MOCK_OTP_CODE = '424242';
