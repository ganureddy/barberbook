/**
 * In-progress booking flow state.
 *
 * The booking flow on the canvas is multi-step (Services → Barber → Time
 * → Pay). Each screen reads & writes a slice of this store; on completion
 * the screen calls `useCreateBooking().mutate(...)` with `toCreatePayload()`
 * and then calls `reset()` to wipe the draft.
 *
 * State is intentionally NOT persisted — abandoning halfway should not
 * leave a phantom booking in the user's next session.
 */

import { create } from 'zustand';

import type { Barber, Service } from '../api/types';

export interface BookingDraftStore {
  shop: string | null;
  /** Picked services, in order of selection. */
  services: Service[];
  /** Picked barber. `null` means "any barber". */
  barber: Barber | null;
  /** Local YYYY-MM-DD. */
  date: string | null;
  /** Local HH:mm. */
  time: string | null;
  notes: string;

  startForShop: (shop: string) => void;
  toggleService: (s: Service) => void;
  removeService: (name: string) => void;
  setBarber: (b: Barber | null) => void;
  setSlot: (date: string, time: string) => void;
  setNotes: (notes: string) => void;
  reset: () => void;

  // Derived selectors (kept on the store so consumers don't recompute).
  totalAmount: () => number;
  totalDuration: () => number;
}

const empty: Pick<BookingDraftStore, 'shop' | 'services' | 'barber' | 'date' | 'time' | 'notes'> = {
  shop: null,
  services: [],
  barber: null,
  date: null,
  time: null,
  notes: '',
};

export const useBookingDraftStore = create<BookingDraftStore>((set, get) => ({
  ...empty,

  startForShop(shop) {
    // If they switched shops, blow away the previous draft entirely.
    if (get().shop !== shop) set({ ...empty, shop });
  },

  toggleService(s) {
    set((state) => {
      const exists = state.services.some((x) => x.name === s.name);
      return {
        services: exists ? state.services.filter((x) => x.name !== s.name) : [...state.services, s],
      };
    });
  },

  removeService(name) {
    set((state) => ({ services: state.services.filter((s) => s.name !== name) }));
  },

  setBarber(b) {
    set({ barber: b });
  },

  setSlot(date, time) {
    set({ date, time });
  },

  setNotes(notes) {
    set({ notes });
  },

  reset() {
    set({ ...empty });
  },

  totalAmount() {
    return get().services.reduce((sum, s) => sum + s.price, 0);
  },

  totalDuration() {
    return get().services.reduce((sum, s) => sum + s.duration_minutes, 0);
  },
}));

/**
 * Convert the draft to the shape `createBooking` expects. Returns null when
 * the draft is incomplete — callers can use this for the "Pay" CTA disabled
 * state.
 */
export function toCreatePayload(state: BookingDraftStore) {
  if (!state.shop || state.services.length === 0 || !state.date || !state.time) return null;
  return {
    shop: state.shop,
    barber: state.barber?.name ?? undefined,
    scheduled_at: `${state.date}T${state.time}:00`,
    services: state.services.map((s) => ({
      service: s.name,
      duration_minutes: s.duration_minutes,
      price: s.price,
    })),
    notes: state.notes || undefined,
  };
}
