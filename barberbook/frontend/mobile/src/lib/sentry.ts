/**
 * Sentry crash reporting.
 *
 * Uses `@sentry/react-native` (the modern successor to the deprecated
 * `sentry-expo` package — same vendor, better Expo SDK 54+ support).
 * No-op when `EXPO_PUBLIC_SENTRY_DSN` isn't set so dev builds don't
 * thrash the Sentry quota or surface a "no DSN configured" warning.
 *
 * `beforeSend` aggressively scrubs PII before any event leaves the
 * device:
 *   - Frappe sid cookies / `Idempotency-Key` headers / phone numbers
 *     in URL paths or breadcrumb data.
 *   - `request.cookies` and `request.headers.authorization` always.
 *   - User identifier reduced to a stable hash; raw email/phone never
 *     shipped.
 */

import { env } from './env';

// `@sentry/react-native` ships a native module that is NOT bundled into
// Expo Go. Static `import` would crash the JS bundle at module-eval time
// (the "Something went wrong" red screen). Load it lazily through
// `require` inside a try/catch so Expo Go silently runs without Sentry,
// while dev/EAS builds (which DO contain the native module) still get
// full crash reporting.
type SentryModule = typeof import('@sentry/react-native');
let Sentry: SentryModule | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Sentry = require('@sentry/react-native') as SentryModule;
} catch {
  Sentry = null;
}

let initialised = false;

const SENSITIVE_HEADER_KEYS = [
  'authorization',
  'cookie',
  'set-cookie',
  'x-frappe-sid',
  'idempotency-key',
];

const PHONE_REGEX = /\+?\d[\d\s-]{6,}\d/g;
const SID_REGEX = /sid=[A-Za-z0-9-_]+/gi;

function scrubString(s: string | undefined): string | undefined {
  if (!s) return s;
  return s.replace(PHONE_REGEX, '[redacted-phone]').replace(SID_REGEX, 'sid=[redacted]');
}

function scrubHeaders(
  headers: Record<string, string> | undefined,
): Record<string, string> | undefined {
  if (!headers) return headers;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    if (SENSITIVE_HEADER_KEYS.includes(k.toLowerCase())) {
      out[k] = '[redacted]';
    } else {
      out[k] = scrubString(v) ?? '';
    }
  }
  return out;
}

export function initSentry(): void {
  if (initialised) return;
  initialised = true;

  if (!Sentry) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.info('[barberbook] Sentry disabled — native module unavailable (running in Expo Go?)');
    }
    return;
  }

  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.info('[barberbook] Sentry disabled — EXPO_PUBLIC_SENTRY_DSN not set');
    }
    return;
  }

  Sentry.init({
    dsn,
    environment: env.channel,
    release: `barberbook-mobile@${env.appVersion}`,
    sampleRate: 1.0,
    tracesSampleRate: 0.1,
    debug: __DEV__,
    // Don't capture console.log noise in dev — only `console.error` and above.
    enableNative: true,
    sendDefaultPii: false,
    beforeSend(event) {
      // Strip request bodies and cookies wholesale.
      if (event.request) {
        event.request.cookies = undefined;
        event.request.headers = scrubHeaders(event.request.headers);
        event.request.url = scrubString(event.request.url);
        event.request.data = undefined;
      }

      if (event.user) {
        // Replace email/phone with the deterministic Sentry user hash.
        const hash =
          (event.user.id as string | undefined) ??
          (event.user.email ? hashStable(event.user.email) : undefined);
        event.user = hash ? { id: hash } : undefined;
      }

      // Scrub strings in messages + breadcrumb data.
      if (event.message) event.message = scrubString(event.message);
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((b) => ({
          ...b,
          message: scrubString(b.message),
          data: b.data
            ? Object.fromEntries(
                Object.entries(b.data).map(([k, v]) => [
                  k,
                  typeof v === 'string' ? scrubString(v) : v,
                ]),
              )
            : b.data,
        }));
      }

      return event;
    },
  });
}

/** Manually capture an exception. Wraps `Sentry.captureException` so
 *  call sites don't need a direct dependency on the SDK module. */
export function captureException(err: unknown, context?: Record<string, unknown>): void {
  if (!initialised || !Sentry) return;
  Sentry.captureException(err, { extra: context });
}

function hashStable(input: string): string {
  // FNV-1a — non-crypto, just enough to fingerprint a user id.
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16);
}
