/**
 * Static mock fixtures matching the BarberBook DocType shapes. Used when
 * `EXPO_PUBLIC_MOCK=1`. Keep these as plain data — no functions — so they
 * can be persisted alongside react-query cache entries and survive reloads.
 *
 * Names and vibe ported from the design canvas (Indian + Gulf shop scenes).
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

const NOW = '2026-05-15T10:00:00';
const baseAudit = {
  owner: 'Administrator',
  creation: NOW,
  modified: NOW,
  modified_by: 'Administrator',
  docstatus: 0 as const,
};

// ─── Shops ──────────────────────────────────────────────────────────────────

export const SHOPS: Shop[] = [
  {
    ...baseAudit,
    doctype: 'BB Shop',
    name: 'BB-SHOP-00001',
    shop_name: "Raj's Classic Cuts",
    slug: 'rajs-classic-cuts',
    owner_user: 'raj@barberbook.app',
    status: 'Active',
    country: 'IN',
    city: 'Bengaluru',
    address_line: '17, 4th Cross, Indiranagar',
    pincode: '560038',
    latitude: 12.9719,
    longitude: 77.6412,
    rating: 4.8,
    rating_count: 312,
    price_tier: 2,
    is_open: 1,
    accepts_walkin: 1,
    cover_variant: 0,
    open_time: '09:00:00',
    close_time: '21:00:00',
    phone: '+91 98450 11122',
    currency: 'INR',
  },
  {
    ...baseAudit,
    doctype: 'BB Shop',
    name: 'BB-SHOP-00002',
    shop_name: 'The Sharp Edge',
    slug: 'the-sharp-edge',
    owner_user: 'farah@barberbook.app',
    status: 'Active',
    country: 'IN',
    city: 'Mumbai',
    address_line: 'Linking Road, Bandra West',
    pincode: '400050',
    latitude: 19.0606,
    longitude: 72.8311,
    rating: 4.6,
    rating_count: 188,
    price_tier: 3,
    is_open: 1,
    accepts_walkin: 0,
    cover_variant: 1,
    open_time: '10:00:00',
    close_time: '22:00:00',
    phone: '+91 98201 33344',
    currency: 'INR',
  },
  {
    ...baseAudit,
    doctype: 'BB Shop',
    name: 'BB-SHOP-00003',
    shop_name: 'Pole & Pomade',
    slug: 'pole-and-pomade',
    owner_user: 'arjun@barberbook.app',
    status: 'Active',
    country: 'IN',
    city: 'Bengaluru',
    address_line: '12, 100 Feet Road, Koramangala',
    pincode: '560095',
    latitude: 12.9356,
    longitude: 77.6245,
    rating: 4.9,
    rating_count: 421,
    price_tier: 3,
    is_open: 1,
    accepts_walkin: 1,
    cover_variant: 2,
    open_time: '09:30:00',
    close_time: '22:00:00',
    phone: '+91 80123 45678',
    currency: 'INR',
  },
  {
    ...baseAudit,
    doctype: 'BB Shop',
    name: 'BB-SHOP-00004',
    shop_name: 'Downtown Barber Co.',
    slug: 'downtown-barber-co',
    owner_user: 'priya@barberbook.app',
    status: 'Active',
    country: 'IN',
    city: 'Bengaluru',
    address_line: 'MG Road, near Trinity Metro',
    pincode: '560001',
    latitude: 12.9747,
    longitude: 77.6094,
    rating: 4.4,
    rating_count: 96,
    price_tier: 1,
    is_open: 0,
    accepts_walkin: 1,
    cover_variant: 3,
    open_time: '10:00:00',
    close_time: '20:00:00',
    phone: '+91 80222 11122',
    currency: 'INR',
  },
  {
    ...baseAudit,
    doctype: 'BB Shop',
    name: 'BB-SHOP-00005',
    shop_name: 'Kabir & Co. Grooming',
    slug: 'kabir-and-co',
    owner_user: 'kabir@barberbook.app',
    status: 'Active',
    country: 'AE',
    city: 'Dubai',
    address_line: 'Jumeirah Beach Road, Umm Suqeim',
    pincode: '00000',
    latitude: 25.13,
    longitude: 55.2,
    rating: 4.7,
    rating_count: 254,
    price_tier: 3,
    is_open: 1,
    accepts_walkin: 0,
    cover_variant: 0,
    open_time: '11:00:00',
    close_time: '23:00:00',
    phone: '+971 50 555 0001',
    currency: 'AED',
  },
];

// ─── Services ───────────────────────────────────────────────────────────────

export const SERVICES: Service[] = [
  // Raj's Classic Cuts
  service('BB-SVC-1001', 'BB-SHOP-00001', "Men's Haircut", 'Hair', 30, 350, 'INR'),
  service('BB-SVC-1002', 'BB-SHOP-00001', 'Beard Trim & Shape', 'Beard', 20, 200, 'INR'),
  service('BB-SVC-1003', 'BB-SHOP-00001', 'Hot Towel Shave', 'Beard', 35, 450, 'INR'),
  service('BB-SVC-1004', 'BB-SHOP-00001', 'Haircut + Beard Combo', 'Combo', 50, 500, 'INR'),

  // Sharp Edge
  service('BB-SVC-1101', 'BB-SHOP-00002', 'Skin Fade', 'Hair', 45, 800, 'INR'),
  service('BB-SVC-1102', 'BB-SHOP-00002', 'Texture Cut', 'Hair', 50, 950, 'INR'),

  // Pole & Pomade
  service('BB-SVC-1201', 'BB-SHOP-00003', 'Signature Cut', 'Hair', 40, 700, 'INR'),
  service('BB-SVC-1202', 'BB-SHOP-00003', 'Hair Color (single)', 'Color', 60, 1200, 'INR'),
  service('BB-SVC-1203', 'BB-SHOP-00003', 'Head Massage', 'Spa', 25, 400, 'INR'),

  // Downtown
  service('BB-SVC-1301', 'BB-SHOP-00004', 'Quick Cut', 'Hair', 20, 199, 'INR'),
  service('BB-SVC-1302', 'BB-SHOP-00004', 'Beard Tidy-up', 'Beard', 15, 99, 'INR'),

  // Kabir & Co.
  service('BB-SVC-1401', 'BB-SHOP-00005', 'Royal Shave', 'Beard', 60, 180, 'AED'),
  service('BB-SVC-1402', 'BB-SHOP-00005', 'Premium Cut', 'Hair', 50, 250, 'AED'),
];

function service(
  name: string,
  shop: string,
  service_name: string,
  category: string,
  duration_minutes: number,
  price: number,
  currency: 'INR' | 'AED' | 'GBP',
): Service {
  return {
    ...baseAudit,
    doctype: 'BB Service',
    name,
    shop,
    service_name,
    category,
    duration_minutes,
    price,
    currency,
    is_active: 1,
  };
}

// ─── Barbers ────────────────────────────────────────────────────────────────

export const BARBERS: Barber[] = [
  barber(
    'BB-BAR-2001',
    'BB-SHOP-00001',
    'Imran Khan',
    'Imran K.',
    'IK',
    'Fades, Skin',
    8,
    4.9,
    142,
  ),
  barber(
    'BB-BAR-2002',
    'BB-SHOP-00001',
    'Ravi Sharma',
    'Ravi S.',
    'RS',
    'Beard, Classic',
    5,
    4.7,
    96,
  ),
  barber(
    'BB-BAR-2101',
    'BB-SHOP-00002',
    'Sara Ahmed',
    'Sara A.',
    'SA',
    'Color, Texture',
    6,
    4.8,
    78,
  ),
  barber(
    'BB-BAR-2201',
    'BB-SHOP-00003',
    'Arjun Mehta',
    'Arjun M.',
    'AM',
    'Signature, Pomade',
    10,
    4.9,
    220,
  ),
  barber(
    'BB-BAR-2202',
    'BB-SHOP-00003',
    'Priya Iyer',
    'Priya I.',
    'PI',
    'Hair, Color',
    7,
    4.8,
    188,
  ),
  barber('BB-BAR-2301', 'BB-SHOP-00004', 'Dev Patel', 'Dev P.', 'DP', 'Quick, Tidy', 3, 4.4, 41),
  barber(
    'BB-BAR-2401',
    'BB-SHOP-00005',
    'Noor Hassan',
    'Noor H.',
    'NH',
    'Royal Shave',
    12,
    4.95,
    312,
  ),
];

function barber(
  name: string,
  shop: string,
  full_name: string,
  short_name: string,
  initials: string,
  specialties: string,
  years_experience: number,
  rating: number,
  rating_count: number,
): Barber {
  return {
    ...baseAudit,
    doctype: 'BB Barber',
    name,
    shop,
    full_name,
    short_name,
    initials,
    specialties,
    years_experience,
    rating,
    rating_count,
    avatar_seed: name.toLowerCase(),
    is_active: 1,
  };
}

// ─── Seats ──────────────────────────────────────────────────────────────────

export const SEATS: Seat[] = [
  seat('BB-SEAT-3001', 'BB-SHOP-00001', 1),
  seat('BB-SEAT-3002', 'BB-SHOP-00001', 2),
  seat('BB-SEAT-3101', 'BB-SHOP-00002', 1),
  seat('BB-SEAT-3201', 'BB-SHOP-00003', 1),
  seat('BB-SEAT-3202', 'BB-SHOP-00003', 2),
  seat('BB-SEAT-3203', 'BB-SHOP-00003', 3),
  seat('BB-SEAT-3301', 'BB-SHOP-00004', 1),
  seat('BB-SEAT-3401', 'BB-SHOP-00005', 1),
  seat('BB-SEAT-3402', 'BB-SHOP-00005', 2),
];

function seat(name: string, shop: string, seat_number: number): Seat {
  return {
    ...baseAudit,
    doctype: 'BB Seat',
    name,
    shop,
    seat_number,
    label: `Seat ${seat_number}`,
    is_active: 1,
  };
}

// ─── Roster ─────────────────────────────────────────────────────────────────

export const ROSTERS: Roster[] = [
  {
    ...baseAudit,
    doctype: 'BB Roster',
    name: 'BB-ROS-4001',
    shop: 'BB-SHOP-00001',
    week_starting: '2026-05-11',
    status: 'Published',
    conflict_count: 0,
    shifts: [
      {
        day: 'Mon',
        start_time: '09:00',
        end_time: '17:00',
        seat: 'BB-SEAT-3001',
        barber: 'BB-BAR-2001',
      },
      {
        day: 'Mon',
        start_time: '13:00',
        end_time: '21:00',
        seat: 'BB-SEAT-3002',
        barber: 'BB-BAR-2002',
      },
      {
        day: 'Tue',
        start_time: '09:00',
        end_time: '17:00',
        seat: 'BB-SEAT-3001',
        barber: 'BB-BAR-2001',
      },
      {
        day: 'Wed',
        start_time: '13:00',
        end_time: '21:00',
        seat: 'BB-SEAT-3001',
        barber: 'BB-BAR-2002',
      },
    ],
  },
];

// ─── Bookings ───────────────────────────────────────────────────────────────

export const BOOKINGS: Booking[] = [
  {
    ...baseAudit,
    doctype: 'BB Booking',
    name: 'BB-BKG-5001',
    customer: 'arya@barberbook.app',
    shop: 'BB-SHOP-00001',
    barber: 'BB-BAR-2001',
    seat: 'BB-SEAT-3001',
    scheduled_at: '2026-05-16T11:30:00',
    duration_minutes: 50,
    services: [{ service: 'BB-SVC-1004', duration_minutes: 50, price: 500 }],
    status: 'Confirmed',
    total_amount: 500,
    currency: 'INR',
    payment_status: 'Paid',
    token_code: 'BB-48-291',
    notes: 'Same as last time, please.',
  },
];

// ─── Walk-ins ───────────────────────────────────────────────────────────────

export const WALKIN_TICKETS: WalkinTicket[] = [
  {
    ...baseAudit,
    doctype: 'BB Walkin Ticket',
    name: 'BB-WLK-6001',
    shop: 'BB-SHOP-00003',
    customer: 'arya@barberbook.app',
    token_number: '07',
    position_in_queue: 3,
    estimated_wait_minutes: 22,
    status: 'Waiting',
    joined_at: '2026-05-15T10:42:00',
  },
];

// ─── Reviews ────────────────────────────────────────────────────────────────

export const REVIEWS: Review[] = [
  {
    ...baseAudit,
    doctype: 'BB Review',
    name: 'BB-REV-7001',
    customer: 'arya@barberbook.app',
    shop: 'BB-SHOP-00001',
    barber: 'BB-BAR-2001',
    booking: 'BB-BKG-4900',
    rating: 5,
    body: 'Imran nailed the fade. Walked out feeling like a regular.',
  },
  {
    ...baseAudit,
    doctype: 'BB Review',
    name: 'BB-REV-7002',
    customer: 'priya@barberbook.app',
    shop: 'BB-SHOP-00003',
    barber: 'BB-BAR-2201',
    rating: 5,
    body: 'Best signature cut in the city. Worth every rupee.',
    reply: 'Thank you Priya — see you next month!',
    reply_at: '2026-05-12T18:00:00',
  },
];

// ─── Loyalty ────────────────────────────────────────────────────────────────

export const LOYALTY_ACCOUNTS: LoyaltyAccount[] = [
  {
    ...baseAudit,
    doctype: 'BB Loyalty Account',
    name: 'BB-LOY-8001',
    customer: 'arya@barberbook.app',
    shop: 'BB-SHOP-00001',
    points_balance: 1240,
    lifetime_points: 4180,
    tier: 'Silver',
  },
];

// ─── Session ────────────────────────────────────────────────────────────────

export const MOCK_USER: SessionUser = {
  email: 'arya@barberbook.app',
  full_name: 'Arya Nair',
  phone: '+91 98000 12345',
  avatar_seed: 'arya-nair',
  roles: ['Customer'],
  active_role: 'Customer',
  sid: 'mock-sid-arya',
};

export const MOCK_OTP_CODE = '4242';
