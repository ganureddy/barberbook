/**
 * In-progress booking flow state.
 *
 * The booking flow on the canvas is multi-step (Services → Barber → Time
 * → Pay). Each screen reads & writes a slice of this store; on completion
 * the screen calls `useCreateBooking()` with `toCreatePayload(...)` and
 * then calls `reset()` to wipe the draft.
 *
 * Persistence: we DO persist the draft to MMKV — abandoning the flow on
 * one device shouldn't lose progress when the user comes back. The
 * persisted slice is the user-input fields only; derived selectors and
 * the per-shop "switch wipes draft" behavior stay in-memory.
 *
 * Persist + hydrate are wrapped in `kv` so Expo Go (no MMKV native module)
 * gracefully falls back to in-memory.
 */

import { create } from 'zustand';

import type { Barber, Service } from '../api/types';
import { kv } from '../design/storage';
import { clearDraftIdempotencyKey } from '../lib/idempotency';

const DRAFT_KEY = 'barberbook.bookingDraft.v1';

export interface BookingDraftSnapshot {
  shop: string | null;
  services: Service[];
  barber: Barber | null;
  date: string | null;
  time: string | null;
  notes: string;
  loyaltyPointsToRedeem: number;
}

export interface BookingDraftStore extends BookingDraftSnapshot {
  startForShop: (shop: string) => void;
  toggleService: (s: Service) => void;
  removeService: (name: string) => void;
  setBarber: (b: Barber | null) => void;
  setSlot: (date: string, time: string) => void;
  setNotes: (notes: string) => void;
  setLoyaltyPointsToRedeem: (n: number) => void;
  reset: () => void;
  hydrate: () => void;

  // Derived selectors (kept on the store so consumers don't recompute).
  totalAmount: () => number;
  totalDuration: () => number;
  isComplete: () => boolean;
}

const EMPTY: BookingDraftSnapshot = {
  shop: null,
  services: [],
  barber: null,
  date: null,
  time: null,
  notes: '',
  loyaltyPointsToRedeem: 0,
};

function persist(snap: BookingDraftSnapshot): void {
  try {
    kv.set(DRAFT_KEY, JSON.stringify(snap));
  } catch {
    // MMKV throws on huge payloads — drafts are tiny, but be defensive.
  }
}

function loadPersisted(): BookingDraftSnapshot {
  const raw = kv.getString(DRAFT_KEY);
  if (!raw) return EMPTY;
  try {
    const parsed = JSON.parse(raw) as Partial<BookingDraftSnapshot>;
    return { ...EMPTY, ...parsed };
  } catch {
    return EMPTY;
  }
}

export const useBookingDraftStore = create<BookingDraftStore>((set, get) => {
  const writeBack = () => {
    const { shop, services, barber, date, time, notes, loyaltyPointsToRedeem } = get();
    persist({ shop, services, barber, date, time, notes, loyaltyPointsToRedeem });
  };

  return {
    ...EMPTY,

    hydrate() {
      const persisted = loadPersisted();
      // Don't blow away current state if some other code already pushed a
      // shop in this session — only fill what we don't have.
      if (get().shop != null) return;
      set(persisted);
    },

    startForShop(shop) {
      // If they switched shops, blow away the previous draft entirely
      // (services/barber from another shop are nonsense in this context).
      if (get().shop !== shop) {
        clearDraftIdempotencyKey();
        set({ ...EMPTY, shop });
        writeBack();
      } else if (get().shop == null) {
        set({ shop });
        writeBack();
      }
    },

    toggleService(s) {
      set((state) => {
        const exists = state.services.some((x) => x.name === s.name);
        return {
          services: exists
            ? state.services.filter((x) => x.name !== s.name)
            : [...state.services, s],
        };
      });
      writeBack();
    },

    removeService(name) {
      set((state) => ({ services: state.services.filter((s) => s.name !== name) }));
      writeBack();
    },

    setBarber(b) {
      set({ barber: b });
      writeBack();
    },

    setSlot(date, time) {
      set({ date, time });
      writeBack();
    },

    setNotes(notes) {
      set({ notes });
      writeBack();
    },

    setLoyaltyPointsToRedeem(n) {
      set({ loyaltyPointsToRedeem: Math.max(0, Math.floor(n)) });
      writeBack();
    },

    reset() {
      clearDraftIdempotencyKey();
      kv.delete(DRAFT_KEY);
      set({ ...EMPTY });
    },

    totalAmount() {
      return get().services.reduce((sum, s) => sum + s.price, 0);
    },

    totalDuration() {
      return get().services.reduce((sum, s) => sum + s.duration_minutes, 0);
    },

    isComplete() {
      const { shop, services, date, time } = get();
      return shop != null && services.length > 0 && date != null && time != null;
    },
  };
});

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
