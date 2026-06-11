/**
 * Geocoding via the Frappe backend (OpenCage provider).
 *
 * The OpenCage API key is NEVER shipped in the app bundle — it lives
 * server-side in the `Rideshare Settings` single DocType
 * (`opencage_api_key`). The backend (`rideshare.api.places.*`) proxies to
 * OpenCage and shapes the response. This mirrors how the Rideshare web
 * frontend consumes the same endpoints, so the key + provider can be
 * swapped (OpenCage / Google / OSM) from the DocType without an app update.
 *
 * In mock mode we short-circuit to a deterministic stub so dev builds work
 * with no network and no key configured.
 */

import { rpc } from '../api';

import { env } from './env';

export interface ReverseGeocodeResult {
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postcode?: string | null;
  lat: number;
  lng: number;
}

export interface PlacePrediction {
  place_id: string;
  description: string;
  primary_text?: string;
  secondary_text?: string;
}

export interface PlaceDetails {
  place_id?: string;
  name?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
}

const country = (env.defaultCountry || 'IN').toLowerCase();

/** Resolve a coordinate pair into a postal address (OpenCage reverse geocode). */
export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
  if (env.mock) {
    return {
      lat,
      lng,
      address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      postcode: '560001',
    };
  }
  return await rpc<ReverseGeocodeResult>('rideshare.api.places.reverse_geocode', { lat, lng });
}

/** Forward autocomplete predictions for a free-text query. */
export async function placesAutocomplete(
  query: string,
  bias?: { lat: number; lng: number } | null,
): Promise<PlacePrediction[]> {
  const q = query.trim();
  if (env.mock || q.length < 2) return [];
  const res = await rpc<{ predictions: PlacePrediction[] }>('rideshare.api.places.autocomplete', {
    query: q,
    country,
    lat: bias?.lat,
    lng: bias?.lng,
  });
  return res.predictions ?? [];
}

/** Resolve a prediction's `place_id` into coordinates + a clean address. */
export async function placeDetails(placeId: string): Promise<PlaceDetails> {
  return await rpc<PlaceDetails>('rideshare.api.places.place_details', { place_id: placeId });
}
