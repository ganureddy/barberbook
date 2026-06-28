/**
 * One-shot "where am I" helper.
 *
 * Combines the OS GPS fix with an OpenCage reverse-geocode (proxied through
 * the Frappe backend — see `lib/geocode`, key lives in Rideshare Settings)
 * so discovery can both *sort shops by real distance* and show a friendly
 * city label. Results are pushed into `useLocationStore`; the discovery
 * screens read from there.
 *
 * Safe to call repeatedly. Returns `true` when a fresh fix was obtained.
 */

import * as Location from 'expo-location';

import { useLocationStore } from '../store/useLocationStore';

import { reverseGeocode } from './geocode';

export interface LocateResult {
  ok: boolean;
  latitude?: number;
  longitude?: number;
  city?: string;
}

export async function locateMe(): Promise<LocateResult> {
  const store = useLocationStore.getState();
  store.setPermission('prompting');

  const perm = await Location.requestForegroundPermissionsAsync();
  if (!perm.granted) {
    store.setPermission('denied');
    return { ok: false };
  }
  store.setPermission('granted');

  const fix = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  const latitude = fix.coords.latitude;
  const longitude = fix.coords.longitude;
  store.setCoords({
    latitude,
    longitude,
    accuracy: fix.coords.accuracy ?? undefined,
  });

  // Best-effort label via OpenCage (never blocks the coords update above).
  let city: string | undefined;
  try {
    const geo = await reverseGeocode(latitude, longitude);
    if (geo.city) {
      city = geo.city;
      store.setCity(geo.city, geo.country ?? undefined);
    }
  } catch {
    // Reverse-geocode is optional; sorting works off coords alone.
  }

  return { ok: true, latitude, longitude, city };
}
