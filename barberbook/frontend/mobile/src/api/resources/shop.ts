import { rpcGet } from '../client';
import type { Shop } from '../types';

import { makeRepo } from './_factory';

export const shopRepo = makeRepo<Shop>('BB Shop');

/**
 * Geo-search around a coordinate. Backed by a custom whitelisted method
 * on the Frappe side so we can do a haversine sort + radius filter
 * server-side. Until the backend method exists we can fake it client-side
 * by calling `shopRepo.list()` and sorting locally — that's what mock mode
 * does today.
 */
export interface NearbyShop extends Shop {
  /** Kilometers, computed by the server. */
  distance_km: number;
  /** Free-text ETA, e.g. '5 min'. */
  eta_label?: string;
}

export interface NearbyParams {
  latitude: number;
  longitude: number;
  /** Search radius in km. Server clamps to a reasonable max. */
  radius_km?: number;
  /** Free-text query — matches shop_name, city, address_line. */
  q?: string;
  /** ISO country filter. */
  country?: string;
  limit?: number;
}

export async function findNearbyShops(params: NearbyParams): Promise<NearbyShop[]> {
  return await rpcGet<NearbyShop[]>('barberbook.api.discovery.find_nearby_shops', {
    latitude: params.latitude,
    longitude: params.longitude,
    radius_km: params.radius_km ?? 5,
    q: params.q,
    country: params.country,
    limit: params.limit ?? 25,
  });
}
