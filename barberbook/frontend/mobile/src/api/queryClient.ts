/**
 * Shared QueryClient + offline-first MMKV persistor.
 *
 * Defaults are tuned for a mobile booking app:
 *   - 5 min staleTime: discovery / shop pages can re-render without
 *     refetching when the user back-navigates within that window.
 *   - retry: 2 with exponential backoff: bench restarts and flaky cellular
 *     shouldn't surface as red errors immediately.
 *   - refetchOnWindowFocus disabled: noisy on web, irrelevant on RN
 *     (no `window` to focus); RN's AppState handles re-focus separately.
 *   - 24h gcTime so the persistor has something to hydrate from on relaunch.
 */

import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { QueryClient } from '@tanstack/react-query';
import { type Persister } from '@tanstack/react-query-persist-client';

import { kv } from '../design/storage';
import { dehydrateFilters } from '../lib/offline';

const FIVE_MIN = 5 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;
const ONE_DAY = 24 * 60 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: FIVE_MIN,
      gcTime: ONE_DAY,
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      // `offlineFirst` lets react-query serve persisted data when the
      // device is offline. Reads continue to work; writes are paused
      // by `onlineManager` (see `lib/offline.attachOfflineBridge`).
      networkMode: 'offlineFirst',
    },
    mutations: {
      retry: 1,
      // Same offline-first semantics — mutations queue while offline
      // and auto-resume on reconnect with their idempotency key intact.
      networkMode: 'offlineFirst',
    },
  },
});

/**
 * MMKV-backed persistor. The sync storage persister needs a get/set/remove
 * trio returning string | null; our `kv` shim provides exactly that. When
 * MMKV is unavailable (Expo Go), `kv` falls back to in-memory, so the
 * persistor effectively becomes a no-op for the session — no crash.
 */
export const queryPersister: Persister = createSyncStoragePersister({
  storage: {
    getItem: (key) => kv.getString(key) ?? null,
    setItem: (key, value) => {
      kv.set(key, value);
    },
    removeItem: (key) => {
      kv.delete(key);
    },
  },
  key: 'barberbook.rq.cache.v1',
  // Throttle disk writes so a burst of cache updates doesn't murder MMKV.
  throttleTime: 1000,
});

export const persistOptions = {
  persister: queryPersister,
  maxAge: ONE_HOUR * 24, // discard cache older than a day on rehydrate
  buster: 'v1',
  // Persist pending mutations so they replay on cold start with their
  // idempotency key intact (offline → power-off → power-on flow).
  dehydrateOptions: dehydrateFilters,
} as const;
