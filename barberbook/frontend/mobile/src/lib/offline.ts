/**
 * Offline-first plumbing.
 *
 * Three responsibilities:
 *   1. Bridge `@react-native-community/netinfo` into react-query's
 *      `onlineManager`. When the device is offline, react-query pauses
 *      refetches; mutations queued during that window auto-resume on
 *      reconnect (per-mutation `networkMode: 'offlineFirst'` is set in
 *      the QueryClient defaults).
 *   2. Enable mutation-cache persistence so paused mutations survive a
 *      cold start and replay with their original idempotency key.
 *   3. Expose a small `useOnlineStatus` hook for the DevHud and any UI
 *      that wants to surface "you're offline" affordances.
 *
 * The persistor itself lives in `api/queryClient.ts`; this module only
 * configures the runtime hooks.
 */

import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { onlineManager, type Mutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

let attached = false;

/**
 * Wire NetInfo → onlineManager. Idempotent — safe to call multiple
 * times in dev under StrictMode. The bridge is installed once globally;
 * react-query's `onlineManager.setEventListener` replaces any prior
 * listener, so re-invocation is safe.
 */
export function attachOfflineBridge(): void {
  if (attached) return;
  attached = true;

  onlineManager.setEventListener((setOnline) => {
    return NetInfo.addEventListener((state: NetInfoState) => {
      const online = !!state.isConnected && state.isInternetReachable !== false;
      setOnline(online);
    });
  });

  // Seed the initial state. NetInfo's first emission can take ~1s on a
  // cold boot; until it lands, react-query assumes online (its default).
  NetInfo.fetch()
    .then((state) => {
      const online = !!state.isConnected && state.isInternetReachable !== false;
      onlineManager.setOnline(online);
    })
    .catch(() => {});
}

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState<boolean>(onlineManager.isOnline());
  useEffect(() => {
    return onlineManager.subscribe((next) => {
      setOnline(next);
    });
  }, []);
  return online;
}

/**
 * Dehydrate filter for `persistQueryClient`. We persist:
 *   - Every successful query (`status === 'success'`).
 *   - Pending mutations so they replay on next launch with their key
 *     intact. Failed/idle mutations are dropped (they'd serve no user
 *     value on rehydrate).
 *
 * Plug this into `persistOptions.dehydrateOptions` in the query client.
 */
export const dehydrateFilters = {
  shouldDehydrateMutation: (mutation: Mutation): boolean => mutation.state.status === 'pending',
};
