/**
 * Idempotency key minting + axios attachment.
 *
 * The same key is reused across retries of the same logical request — if
 * the network drops mid-flight, the server uses the key to detect the
 * duplicate and return the prior result instead of double-booking.
 *
 * Lifetime: tied to the booking draft. Generated lazily on the first call
 * to `getDraftIdempotencyKey()`, cleared by `useBookingDraftStore.reset()`.
 */

import { kv } from '../design/storage';

import { uuid } from './uuid';

const KEY = 'barberbook.booking.idempotency.v1';

/**
 * Returns the current draft's idempotency key, generating one if needed.
 * Stable across module-level callers and across reloads (until `clear`).
 */
export function getDraftIdempotencyKey(): string {
  const existing = kv.getString(KEY);
  if (existing && existing.length > 0) return existing;
  const next = `bk-${uuid()}`;
  kv.set(KEY, next);
  return next;
}

/** Wipe the key — call after a successful create or after `draft.reset()`. */
export function clearDraftIdempotencyKey(): void {
  kv.delete(KEY);
}

/**
 * Compose the standard `Idempotency-Key` header value for axios requests.
 * Frappe doesn't enforce this server-side today; the BarberBook custom
 * methods inspect the header and use it as the dedupe key on a Redis set.
 */
export function withIdempotency<T extends Record<string, unknown>>(
  headers: T = {} as T,
): T & { 'Idempotency-Key': string } {
  return { ...headers, 'Idempotency-Key': getDraftIdempotencyKey() };
}
