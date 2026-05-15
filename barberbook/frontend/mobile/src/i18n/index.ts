/**
 * i18next initialization.
 *
 * Two locales today (en, hi). The active language at boot is picked from
 * `expo-localization` — Hindi if the device's primary languageCode is `hi`,
 * English for everything else. Users can override at runtime via
 * `setLanguage(lang)`; the choice is persisted via the design-system MMKV
 * shim so subsequent launches honour it.
 */

import * as Localization from 'expo-localization';
import i18n, { type i18n as I18n } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { kv } from '../design/storage';

import en from './en.json';
import hi from './hi.json';

export type AppLanguage = 'en' | 'hi';

export const SUPPORTED_LANGUAGES: AppLanguage[] = ['en', 'hi'];

const STORAGE_KEY = 'barberbook.lang.v1';

function detectLanguage(): AppLanguage {
  const stored = kv.getString(STORAGE_KEY);
  if (stored === 'en' || stored === 'hi') return stored;
  const code = (Localization.getLocales()[0]?.languageCode ?? 'en').toLowerCase();
  return code === 'hi' ? 'hi' : 'en';
}

let initialized = false;

export function initI18n(): I18n {
  if (initialized) return i18n;
  initialized = true;

  i18n
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: en },
        hi: { translation: hi },
      },
      lng: detectLanguage(),
      fallbackLng: 'en',
      // RN doesn't have a DOM; escaping is i18next default but pointless here.
      interpolation: { escapeValue: false },
      compatibilityJSON: 'v4',
      // Don't attempt to suspend at the React level — we control the splash.
      react: { useSuspense: false },
    })
    .catch(() => {
      /* silenced — fall back to keys if init fails */
    });

  return i18n;
}

export function setLanguage(lang: AppLanguage): void {
  kv.set(STORAGE_KEY, lang);
  i18n.changeLanguage(lang).catch(() => {});
}

export function getLanguage(): AppLanguage {
  const cur = (i18n.language ?? 'en').slice(0, 2).toLowerCase();
  return cur === 'hi' ? 'hi' : 'en';
}

export { i18n };
