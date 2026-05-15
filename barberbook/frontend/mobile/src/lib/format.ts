/**
 * Locale-aware currency formatting.
 *
 * `formatCurrency(value, currencyCode, locale?)` is the canonical entry
 * point for every screen that prints money. Use it instead of hard-coding
 * `₹` (or any other glyph) so a single change here ripples through the
 * whole app — important for the IN/AE/GB rollout in i18n.
 *
 * The formatter prefers the platform's `Intl.NumberFormat` (Hermes ships
 * a small ICU subset; locales beyond what ICU has fall back to a
 * deterministic symbol map).
 */

import type { Currency } from '../api/types';
import { i18n } from '../i18n';

/** ISO 4217 currency code → render glyph (used as the fallback when Intl
 *  doesn't have the locale data, and as the "AED" stand-in when the OS
 *  doesn't render the Arabic dirham symbol cleanly). */
const SYMBOL: Record<Currency, string> = {
  INR: '₹',
  AED: 'د.إ',
  GBP: '£',
};

/** Locale hint per currency. We try the user's i18n language first and
 *  fall back to a sensible regional locale so number grouping reads
 *  natively (Indian lakhs/crore for INR, etc.). */
const FALLBACK_LOCALE: Record<Currency, string> = {
  INR: 'en-IN',
  AED: 'en-AE',
  GBP: 'en-GB',
};

export function formatCurrency(
  value: number,
  currencyCode: Currency = 'INR',
  locale?: string,
): string {
  const useLocale = locale ?? i18n.language ?? FALLBACK_LOCALE[currencyCode];
  const fractionDigits = value % 1 === 0 ? 0 : 2;
  try {
    return new Intl.NumberFormat(useLocale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(value);
  } catch {
    // Hermes / Android < 11 / locales missing from ICU: hand-format.
    const symbol = SYMBOL[currencyCode] ?? currencyCode + ' ';
    const fixed = fractionDigits > 0 ? value.toFixed(2) : Math.round(value).toString();
    return `${symbol}${fixed}`;
  }
}

/**
 * Backwards-compatible shim. Prefer `formatCurrency` in new code.
 * Existing call sites that import `formatMoney` continue to work.
 */
export const formatMoney = formatCurrency;

/**
 * Locale-aware short date for headers (e.g. "Sat · 16 May").
 * Falls back to ISO if Intl can't format the user's locale.
 */
export function formatShortDate(value: string | number | Date, locale?: string): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const useLocale = locale ?? i18n.language ?? 'en-IN';
  try {
    return new Intl.DateTimeFormat(useLocale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

/** Locale-aware HH:mm. Strips seconds. */
export function formatLocalTime(value: string | number | Date, locale?: string): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const useLocale = locale ?? i18n.language ?? 'en-IN';
  try {
    return new Intl.DateTimeFormat(useLocale, {
      hour: 'numeric',
      minute: '2-digit',
    }).format(d);
  } catch {
    return d.toISOString().slice(11, 16);
  }
}
