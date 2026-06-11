import { createNavigationContainerRef } from '@react-navigation/native';

import type { RootStackParamList } from './types';

/**
 * Module-level navigation ref. Used for imperative nav from non-React
 * callers (axios interceptor, push-notification handler) and from React
 * components that are siblings of `<NavigationContainer>` rather than
 * descendants — most notably `<DevHud>` and `<ToastHost>`, which we keep
 * outside the navigator so they layer cleanly above every screen.
 *
 * Always check `.isReady()` before navigating — pre-mount, the ref is a
 * no-op object.
 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigate<RouteName extends keyof RootStackParamList>(
  ...args: RootStackParamList[RouteName] extends undefined
    ? [name: RouteName]
    : [name: RouteName, params: RootStackParamList[RouteName]]
): void {
  if (!navigationRef.isReady()) return;
  // The conditional tuple typing above is too clever for the runtime call
  // site; cast to a permissive shape for the dispatch.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (navigationRef.navigate as any)(...args);
}
