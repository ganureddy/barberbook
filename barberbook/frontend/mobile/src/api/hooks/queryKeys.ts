/**
 * Centralized query-key factory. Keeps invalidations type-safe and makes
 * cache surgery (after a mutation) one-line: `qk.shops.detail(id)`.
 *
 * Convention: each domain exposes `all`, plus list/detail/derived keys.
 * Keys are tuples so partial-match invalidation works naturally:
 *   queryClient.invalidateQueries({ queryKey: qk.shops.all })
 */

import type { BookingStatus } from '../types';

export const qk = {
  session: {
    all: ['session'] as const,
    me: () => [...qk.session.all, 'me'] as const,
  },
  shops: {
    all: ['shops'] as const,
    list: () => [...qk.shops.all, 'list'] as const,
    detail: (name: string) => [...qk.shops.all, 'detail', name] as const,
    nearby: (lat: number, lng: number, radius: number, q?: string) =>
      [...qk.shops.all, 'nearby', round(lat), round(lng), radius, q ?? ''] as const,
  },
  services: {
    all: ['services'] as const,
    forShop: (shop: string) => [...qk.services.all, 'shop', shop] as const,
  },
  barbers: {
    all: ['barbers'] as const,
    forShop: (shop: string) => [...qk.barbers.all, 'shop', shop] as const,
  },
  seats: {
    all: ['seats'] as const,
    forShop: (shop: string) => [...qk.seats.all, 'shop', shop] as const,
  },
  rosters: {
    all: ['rosters'] as const,
    current: (shop: string) => [...qk.rosters.all, 'current', shop] as const,
  },
  bookings: {
    all: ['bookings'] as const,
    mine: (status?: BookingStatus | 'Upcoming' | 'Past') =>
      [...qk.bookings.all, 'mine', status ?? 'all'] as const,
    detail: (name: string) => [...qk.bookings.all, 'detail', name] as const,
    availability: (shop: string, date: string, services: string[]) =>
      [...qk.bookings.all, 'availability', shop, date, [...services].sort().join(',')] as const,
  },
  walkin: {
    all: ['walkin'] as const,
    snapshot: (shop: string) => [...qk.walkin.all, 'snapshot', shop] as const,
  },
  reviews: {
    all: ['reviews'] as const,
    forShop: (shop: string) => [...qk.reviews.all, 'shop', shop] as const,
  },
  loyalty: {
    all: ['loyalty'] as const,
    forShop: (shop: string) => [...qk.loyalty.all, 'shop', shop] as const,
  },
  owner: {
    all: ['owner'] as const,
    myShops: () => [...qk.owner.all, 'my-shops'] as const,
  },
  staff: {
    all: ['staff'] as const,
    workspaces: (phone?: string) => [...qk.staff.all, 'workspaces', phone ?? ''] as const,
  },
} as const;

/** Bucket lat/lng to ~110m so tiny GPS jitter doesn't spawn new cache keys. */
function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}
