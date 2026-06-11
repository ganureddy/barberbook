/**
 * Lightweight UUID v4 generator. Hermes ships `crypto.randomUUID()` on RN
 * 0.74+; we keep a Math.random fallback for older runtimes / web. Not
 * cryptographically strong on the fallback path, but request IDs only need
 * to be globally distinct, not unguessable.
 */
export function uuid(): string {
  const cryptoObj = (globalThis as { crypto?: Crypto }).crypto;
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID();
  }
  // RFC 4122 v4 fallback.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
