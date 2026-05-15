/**
 * Read-time environment surface.
 *
 * Expo inlines `EXPO_PUBLIC_*` env vars into the JS bundle at build time —
 * they are NOT secrets, do not put credentials here. Anything sensitive
 * belongs on the Frappe side or in `expo-secure-store`.
 *
 * All values get a sane dev fallback so the app boots even with no `.env`.
 */

const STR = (k: string, fallback: string): string => {
  const v = process.env[k];
  return typeof v === 'string' && v.length > 0 ? v : fallback;
};

const BOOL = (k: string, fallback: boolean): boolean => {
  const v = process.env[k];
  if (v == null || v === '') return fallback;
  return v === '1' || v.toLowerCase() === 'true';
};

export const env = {
  /**
   * Base URL of the Frappe site, e.g. `http://192.168.1.20:8000` for a local
   * bench reachable from the iOS sim / Android emulator. NO trailing slash.
   */
  frappeUrl: STR('EXPO_PUBLIC_FRAPPE_URL', 'http://localhost:8000').replace(/\/+$/, ''),

  /** When true, axios is short-circuited and all calls return mock fixtures. */
  mock: BOOL('EXPO_PUBLIC_MOCK', true),

  /**
   * Default country (drives currency formatting + the discovery search radius
   * default). Currently 'IN' — UAE / UK come online with their own configs.
   */
  defaultCountry: STR('EXPO_PUBLIC_DEFAULT_COUNTRY', 'IN'),

  appVersion: STR('EXPO_PUBLIC_APP_VERSION', '0.1.0'),

  /** Helps in DevHud / Sentry tags. */
  channel: STR('EXPO_PUBLIC_CHANNEL', 'dev'),
} as const;

export type Env = typeof env;
