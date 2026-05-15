/**
 * Device location + city state.
 *
 * The store does NOT request the OS permission itself — that's a UI
 * decision (the canvas has a dedicated "Location permission" screen).
 * Instead, it offers `setPermission` and `setCoords` for the screen to
 * push results in.
 *
 * Default coords drop the user in central Bengaluru so the discovery
 * map renders something sensible before they grant location.
 */

import { create } from 'zustand';

export type LocationPermission = 'unknown' | 'denied' | 'granted' | 'prompting';

export interface CoarseLocation {
  latitude: number;
  longitude: number;
  /** Best-effort reverse-geocode label, e.g. 'Indiranagar, Bengaluru'. */
  city?: string;
  /** ISO country code, when known. */
  country?: string;
  /** When the fix was acquired (ms epoch). */
  takenAt: number;
  /** Best horizontal accuracy in meters. */
  accuracy?: number;
}

const DEFAULT_FALLBACK: CoarseLocation = {
  latitude: 12.9716,
  longitude: 77.5946,
  city: 'Bengaluru',
  country: 'IN',
  takenAt: 0,
  accuracy: undefined,
};

interface LocationStore {
  permission: LocationPermission;
  current: CoarseLocation;
  isFallback: boolean;
  setPermission: (p: LocationPermission) => void;
  setCoords: (c: Omit<CoarseLocation, 'takenAt'> & { takenAt?: number }) => void;
  setCity: (city: string, country?: string) => void;
  reset: () => void;
}

export const useLocationStore = create<LocationStore>((set) => ({
  permission: 'unknown',
  current: DEFAULT_FALLBACK,
  isFallback: true,

  setPermission(p) {
    set({ permission: p });
  },

  setCoords(c) {
    set({
      current: {
        latitude: c.latitude,
        longitude: c.longitude,
        city: c.city,
        country: c.country,
        accuracy: c.accuracy,
        takenAt: c.takenAt ?? Date.now(),
      },
      isFallback: false,
    });
  },

  setCity(city, country) {
    set((s) => ({ current: { ...s.current, city, country: country ?? s.current.country } }));
  },

  reset() {
    set({ permission: 'unknown', current: DEFAULT_FALLBACK, isFallback: true });
  },
}));
