/**
 * Typed react-query hooks. One hook per cache-shaped operation.
 *
 * Conventions:
 *   - Read hooks return `UseQueryResult<T>` so the call site has the full
 *     `{data, isLoading, isError, error, refetch}` API.
 *   - Mutation hooks invalidate the relevant lists in `onSuccess`.
 *   - Hooks never throw — errors live on `query.error` for the UI to render.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import * as authApi from '../auth';
import {
  bookingRepo,
  cancelWalkinTicket,
  createBooking,
  findNearbyShops,
  getAvailability,
  getCurrentRoster,
  getMyLoyaltyForShop,
  getWalkinSnapshot,
  joinWalkinQueue,
  listBarbersForShop,
  listMyBookings,
  listReviewsForShop,
  listSeatsForShop,
  listServicesForShop,
  redeemPoints,
  shopRepo,
  submitReview,
  updateBookingStatus,
  type AvailabilitySlot,
  type CreateBookingPayload,
  type JoinWalkinPayload,
  type NearbyParams,
  type NearbyShop,
  type RedeemPayload,
  type RedeemResult,
  type SubmitReviewPayload,
  type WalkinSnapshot,
} from '../resources';
import type {
  Barber,
  Booking,
  BookingStatus,
  LoyaltyAccount,
  Review,
  Roster,
  Seat,
  Service,
  SessionUser,
  Shop,
  WalkinTicket,
} from '../types';

import { qk } from './queryKeys';

export { qk };

// ─── Session ────────────────────────────────────────────────────────────────

export function useMe(): UseQueryResult<SessionUser | null> {
  return useQuery({
    queryKey: qk.session.me(),
    queryFn: authApi.me,
    staleTime: 60 * 1000,
  });
}

export function useLogout(): UseMutationResult<void, Error, void> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      qc.clear();
    },
  });
}

// ─── Shops ──────────────────────────────────────────────────────────────────

export function useShops(): UseQueryResult<Shop[]> {
  return useQuery({
    queryKey: qk.shops.list(),
    queryFn: () =>
      shopRepo.list({
        order_by: 'rating desc, shop_name asc',
        limit_page_length: 50,
      }),
  });
}

export function useShop(name: string | null | undefined): UseQueryResult<Shop> {
  return useQuery({
    queryKey: qk.shops.detail(name ?? ''),
    queryFn: () => shopRepo.get(name as string),
    enabled: !!name,
  });
}

export function useNearbyShops(params: NearbyParams | null): UseQueryResult<NearbyShop[]> {
  return useQuery({
    queryKey: params
      ? qk.shops.nearby(params.latitude, params.longitude, params.radius_km ?? 5, params.q)
      : ['shops', 'nearby', 'disabled'],
    queryFn: () => findNearbyShops(params as NearbyParams),
    enabled: !!params,
    staleTime: 60 * 1000, // location is volatile
  });
}

// ─── Services ───────────────────────────────────────────────────────────────

export function useServicesForShop(shop: string | null): UseQueryResult<Service[]> {
  return useQuery({
    queryKey: qk.services.forShop(shop ?? ''),
    queryFn: () => listServicesForShop(shop as string),
    enabled: !!shop,
  });
}

// ─── Barbers / Seats / Roster ──────────────────────────────────────────────

export function useBarbersForShop(shop: string | null): UseQueryResult<Barber[]> {
  return useQuery({
    queryKey: qk.barbers.forShop(shop ?? ''),
    queryFn: () => listBarbersForShop(shop as string),
    enabled: !!shop,
  });
}

export function useSeatsForShop(shop: string | null): UseQueryResult<Seat[]> {
  return useQuery({
    queryKey: qk.seats.forShop(shop ?? ''),
    queryFn: () => listSeatsForShop(shop as string),
    enabled: !!shop,
  });
}

export function useCurrentRoster(shop: string | null): UseQueryResult<Roster | null> {
  return useQuery({
    queryKey: qk.rosters.current(shop ?? ''),
    queryFn: () => getCurrentRoster(shop as string),
    enabled: !!shop,
  });
}

// ─── Bookings ──────────────────────────────────────────────────────────────

export function useMyBookings(
  status?: BookingStatus | 'Upcoming' | 'Past',
): UseQueryResult<Booking[]> {
  return useQuery({
    queryKey: qk.bookings.mine(status),
    queryFn: () => listMyBookings(status),
  });
}

export function useBooking(name: string | null): UseQueryResult<Booking> {
  return useQuery({
    queryKey: qk.bookings.detail(name ?? ''),
    queryFn: () => bookingRepo.get(name as string),
    enabled: !!name,
  });
}

export function useAvailability(
  shop: string | null,
  date: string | null,
  services: string[],
): UseQueryResult<AvailabilitySlot[]> {
  return useQuery({
    queryKey: shop && date ? qk.bookings.availability(shop, date, services) : ['avail', 'disabled'],
    queryFn: () =>
      getAvailability({ shop: shop as string, date: date as string, service_names: services }),
    enabled: !!shop && !!date && services.length > 0,
    staleTime: 30 * 1000,
  });
}

export function useCreateBooking(): UseMutationResult<Booking, Error, CreateBookingPayload> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createBooking,
    onSuccess: (booking) => {
      // Fire-and-forget local reminders. The push module owns idempotency
      // (cancels prior reminders for the same bookingId before scheduling).
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const push = require('../../lib/push') as typeof import('../../lib/push');
      push
        .scheduleBookingReminders({
          bookingId: booking.name,
          shopName: booking.shop,
          scheduledAt: booking.scheduled_at,
        })
        .catch(() => {});
      qc.invalidateQueries({ queryKey: qk.bookings.all }).catch(() => {});
    },
  });
}

export function useUpdateBookingStatus(): UseMutationResult<
  Booking,
  Error,
  { name: string; status: BookingStatus }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, status }) => updateBookingStatus(name, status),
    onSuccess: (booking) => {
      qc.setQueryData(qk.bookings.detail(booking.name), booking);
      qc.invalidateQueries({ queryKey: qk.bookings.all }).catch(() => {});
    },
  });
}

// ─── Walk-ins ──────────────────────────────────────────────────────────────

export function useWalkinSnapshot(shop: string | null): UseQueryResult<WalkinSnapshot> {
  return useQuery({
    queryKey: qk.walkin.snapshot(shop ?? ''),
    queryFn: () => getWalkinSnapshot(shop as string),
    enabled: !!shop,
    refetchInterval: 15 * 1000, // queue moves
  });
}

export function useJoinWalkin(): UseMutationResult<WalkinTicket, Error, JoinWalkinPayload> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: joinWalkinQueue,
    onSuccess: (t) => qc.invalidateQueries({ queryKey: qk.walkin.snapshot(t.shop) }),
  });
}

export function useCancelWalkin(): UseMutationResult<WalkinTicket, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: cancelWalkinTicket,
    onSuccess: (t) => qc.invalidateQueries({ queryKey: qk.walkin.snapshot(t.shop) }),
  });
}

// ─── Reviews ───────────────────────────────────────────────────────────────

export function useReviewsForShop(shop: string | null): UseQueryResult<Review[]> {
  return useQuery({
    queryKey: qk.reviews.forShop(shop ?? ''),
    queryFn: () => listReviewsForShop(shop as string),
    enabled: !!shop,
  });
}

export function useSubmitReview(): UseMutationResult<Review, Error, SubmitReviewPayload> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: submitReview,
    onSuccess: (r) => qc.invalidateQueries({ queryKey: qk.reviews.forShop(r.shop) }),
  });
}

// ─── Loyalty ───────────────────────────────────────────────────────────────

export function useLoyaltyForShop(shop: string | null): UseQueryResult<LoyaltyAccount | null> {
  return useQuery({
    queryKey: qk.loyalty.forShop(shop ?? ''),
    queryFn: () => getMyLoyaltyForShop(shop as string),
    enabled: !!shop,
  });
}

export function useRedeemPoints(): UseMutationResult<RedeemResult, Error, RedeemPayload> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: redeemPoints,
    onSuccess: (r) => qc.invalidateQueries({ queryKey: qk.loyalty.forShop(r.account.shop) }),
  });
}
