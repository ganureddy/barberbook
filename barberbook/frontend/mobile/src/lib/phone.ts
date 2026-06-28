/**
 * Phone-number normalization for matching.
 *
 * Numbers reach us in many shapes: a shop owner types a barber's number
 * free-form during onboarding (`+91 98000 00000`), while the login flow
 * produces a spaced E.164 string (`+91 98765 43210`). To reliably link a
 * barber to the shops they were added to, we compare the *significant
 * digits* — the last 10 — ignoring spaces, dashes and country prefixes.
 */
export function normalizePhone(input: string | null | undefined): string {
  const digits = (input ?? '').replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
}
