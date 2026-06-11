/**
 * Pure pricing logic for the booking flow. Kept dependency-free so we can
 * unit-test it under Jest without spinning up React Native or Expo.
 *
 * Ordering is deliberate:
 *   1. Sum service prices → subtotal
 *   2. Add GST on the subtotal (CGST+SGST 18% for unisex salon services in IN)
 *   3. Apply loyalty redemption against the GROSS (subtotal + GST), capped
 *      at the gross so a refund line never appears.
 *   4. Round each line to two decimals; round the final total to the integer
 *      paise/rupee per the active currency's minor-unit count.
 *
 * GST being applied BEFORE loyalty matches Indian retail practice — the
 * customer pays tax on the full service value; loyalty is a discount on
 * what the shop receives, not on the tax base.
 */

import type { Currency } from '../api/types';

export interface BookingServiceLine {
  /** Display name (e.g. 'Skin Fade'). Not used for math, kept on the line
   *  for the itemized summary the UI renders.
   */
  name: string;
  price: number;
  /** Optional. Default 1; used only by future multi-quantity flows. */
  quantity?: number;
}

export interface CalculateBookingTotalInput {
  services: BookingServiceLine[];
  /** GST as a decimal (0.18 for 18%). Default 0.18. Pass 0 to opt out. */
  gstRate?: number;
  /** Number of loyalty points the customer wants to redeem. Default 0. */
  loyaltyPointsToRedeem?: number;
  /** INR / AED / GBP per loyalty point. Default 0.5 INR. */
  loyaltyPointValue?: number;
  /** ISO 4217. Default 'INR'. Drives only minor-unit rounding precision. */
  currency?: Currency;
}

export interface BookingTotal {
  subtotal: number;
  gstRate: number;
  gstAmount: number;
  /** The actual amount in currency the loyalty redemption knocks off. */
  loyaltyDiscount: number;
  /** Loyalty points actually consumed (clamped if redemption would over-shoot). */
  pointsConsumed: number;
  total: number;
  currency: Currency;
}

const MINOR_UNITS: Record<Currency, number> = {
  INR: 2,
  AED: 2,
  GBP: 2,
};

const DEFAULT_GST = 0.18;
const DEFAULT_POINT_VALUE = 0.5;

export function calculateBookingTotal(input: CalculateBookingTotalInput): BookingTotal {
  const currency = input.currency ?? 'INR';
  const gstRate = input.gstRate ?? DEFAULT_GST;
  const pointValue = input.loyaltyPointValue ?? DEFAULT_POINT_VALUE;
  const minorUnits = MINOR_UNITS[currency];

  const subtotal = round(
    input.services.reduce((acc, s) => acc + s.price * (s.quantity ?? 1), 0),
    minorUnits,
  );
  const gstAmount = round(subtotal * gstRate, minorUnits);
  const gross = round(subtotal + gstAmount, minorUnits);

  const wantedDiscount = Math.max(0, (input.loyaltyPointsToRedeem ?? 0) * pointValue);
  const loyaltyDiscount = round(Math.min(gross, wantedDiscount), minorUnits);
  const pointsConsumed = pointValue > 0 ? Math.round(loyaltyDiscount / pointValue) : 0;

  const total = round(gross - loyaltyDiscount, minorUnits);

  return {
    subtotal,
    gstRate,
    gstAmount,
    loyaltyDiscount,
    pointsConsumed,
    total,
    currency,
  };
}

/**
 * Format a numeric amount + currency for display. Used by the itemized
 * summary on BookingPay and inline elsewhere. Locale-aware via Intl when
 * available; falls back to a sensible string otherwise.
 */
export function formatMoney(amount: number, currency: Currency = 'INR', locale = 'en-IN'): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    const symbol = currency === 'INR' ? '₹' : currency === 'AED' ? 'AED ' : '£';
    const fixed = amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2);
    return `${symbol}${fixed}`;
  }
}

function round(n: number, decimals: number): number {
  const f = 10 ** decimals;
  // Half-away-from-zero so 0.005 rounds to 0.01 rather than banker's-round
  // 0.00 — matches retail expectations.
  return (Math.sign(n) * Math.round(Math.abs(n) * f)) / f;
}
