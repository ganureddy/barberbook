/**
 * Discovery sort & filter state — shared between map and list views so a
 * user toggling between them keeps their context.
 *
 * Currently lives in module state (no zustand) because it only matters for
 * the discovery sub-tree; if more screens need to read it, promote into a
 * proper store.
 */

import { useEffect, useState } from 'react';

import type { NearbyShop } from '../../../api/resources';

export type SortKey = 'for_you' | 'quickest' | 'top' | 'budget';

export interface DiscoveryFilterState {
  open_now: boolean;
  walkin: boolean;
  highest_rated: boolean;
}

const DEFAULT_FILTERS: DiscoveryFilterState = {
  open_now: false,
  walkin: false,
  highest_rated: false,
};

let _sort: SortKey = 'for_you';
let _filters: DiscoveryFilterState = DEFAULT_FILTERS;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => {
    l();
  });
}

export function useDiscoveryControls() {
  const [, force] = useState(0);
  useEffect(() => {
    const tick = () => {
      force((n) => n + 1);
    };
    listeners.add(tick);
    return () => {
      listeners.delete(tick);
    };
  }, []);

  return {
    sort: _sort,
    filters: _filters,
    setSort(next: SortKey) {
      _sort = next;
      emit();
    },
    toggleFilter<K extends keyof DiscoveryFilterState>(key: K) {
      _filters = { ..._filters, [key]: !_filters[key] };
      emit();
    },
    reset() {
      _sort = 'for_you';
      _filters = DEFAULT_FILTERS;
      emit();
    },
  };
}

/**
 * Apply current sort + filters to a list of shops. Pure function — both the
 * map and list views call it after the network resolves. The mock router
 * does the geo-sort; this layer adds the sort key + filter chips on top.
 */
export function applyDiscovery(
  rows: NearbyShop[],
  sort: SortKey,
  filters: DiscoveryFilterState,
): NearbyShop[] {
  let out = rows;
  if (filters.open_now) out = out.filter((s) => s.is_open === 1);
  if (filters.walkin) out = out.filter((s) => s.accepts_walkin === 1);
  if (filters.highest_rated) out = out.filter((s) => s.rating >= 4.7);

  switch (sort) {
    case 'quickest':
      return [...out].sort((a, b) => a.distance_km - b.distance_km);
    case 'top':
      return [...out].sort((a, b) => b.rating - a.rating);
    case 'budget':
      return [...out].sort((a, b) => a.price_tier - b.price_tier);
    case 'for_you':
    default:
      // "For you" = combo of distance + rating, weighted toward distance.
      return [...out].sort(
        (a, b) => a.distance_km * 1.1 - a.rating * 0.4 - (b.distance_km * 1.1 - b.rating * 0.4),
      );
  }
}
