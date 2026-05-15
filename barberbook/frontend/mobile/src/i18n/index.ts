/**
 * i18next initialization + language/RTL switching.
 *
 * Three locales today (en, hi, ar). Active language is picked from
 * `expo-localization` at first launch and persisted via the design-system
 * MMKV shim. Switch at runtime via `setLanguage(lang)`; for languages
 * whose layout direction differs from the current `I18nManager` state, the
 * helper triggers a soft reload via `expo-updates` so RN re-applies RTL.
 */

import * as Localization from 'expo-localization';
import * as Updates from 'expo-updates';
import i18n, { type i18n as I18n } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';

import { kv } from '../design/storage';

import ar from './ar.json';
import en from './en.json';
import hi from './hi.json';

export type AppLanguage = 'en' | 'hi' | 'ar';

/** Display labels — kept here so the LanguageSwitcher doesn't ship its own copy. */
export const LANGUAGE_LABELS: Record<AppLanguage, { native: string; english: string }> = {
  en: { native: 'English', english: 'English' },
  hi: { native: 'हिन्दी', english: 'Hindi' },
  ar: { native: 'العربية', english: 'Arabic' },
};

export const SUPPORTED_LANGUAGES: AppLanguage[] = ['en', 'hi', 'ar'];

const STORAGE_KEY = 'barberbook.lang.v1';

/** Languages that read right-to-left. */
const RTL_LANGUAGES: ReadonlySet<AppLanguage> = new Set<AppLanguage>(['ar']);

export function isRTL(lang: AppLanguage): boolean {
  return RTL_LANGUAGES.has(lang);
}

function detectLanguage(): AppLanguage {
  const stored = kv.getString(STORAGE_KEY);
  if (stored === 'en' || stored === 'hi' || stored === 'ar') return stored;
  const code = (Localization.getLocales()[0]?.languageCode ?? 'en').toLowerCase();
  if (code === 'hi') return 'hi';
  if (code === 'ar') return 'ar';
  return 'en';
}

let initialized = false;

export function initI18n(): I18n {
  if (initialized) return i18n;
  initialized = true;

  const lng = detectLanguage();

  // Apply RTL synchronously at boot — RN reads I18nManager state during
  // its first View layout, so any later change requires a JS reload.
  const wantRTL = isRTL(lng);
  if (I18nManager.isRTL !== wantRTL) {
    try {
      I18nManager.allowRTL(wantRTL);
      I18nManager.forceRTL(wantRTL);
    } catch {
      /* RNN error in dev mode — harmless. */
    }
  }

  i18n
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: en },
        hi: { translation: hi },
        ar: { translation: ar },
      },
      lng,
      fallbackLng: 'en',
      interpolation: { escapeValue: false },
      compatibilityJSON: 'v4',
      react: { useSuspense: false },
    })
    .catch(() => {
      /* silenced — fall back to keys if init fails */
    });

  return i18n;
}

/**
 * Persist the user's language choice and apply it. If the new language
 * has a different RTL direction than the current one, the app needs to
 * restart for RN's layout engine to pick it up — we kick that off via
 * `expo-updates.reloadAsync()` when available.
 *
 * Returns `true` if a restart was kicked off.
 */
export async function setLanguage(next: AppLanguage): Promise<boolean> {
  kv.set(STORAGE_KEY, next);
  await i18n.changeLanguage(next);

  const wantRTL = isRTL(next);
  if (I18nManager.isRTL === wantRTL) return false;

  try {
    I18nManager.allowRTL(wantRTL);
    I18nManager.forceRTL(wantRTL);
  } catch {
    /* swallow — non-fatal */
  }

  // expo-updates only reloads the JS bundle in EAS-built clients; in Expo
  // Go this throws. We catch and let the caller surface a "please restart"
  // toast in that case.
  try {
    await Updates.reloadAsync();
    return true;
  } catch {
    return false;
  }
}

export function getLanguage(): AppLanguage {
  const cur = (i18n.language ?? 'en').slice(0, 2).toLowerCase();
  if (cur === 'hi') return 'hi';
  if (cur === 'ar') return 'ar';
  return 'en';
}

export { i18n };
