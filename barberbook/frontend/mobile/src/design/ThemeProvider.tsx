import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

import { kv } from './storage';
import {
  themes,
  type ThemeMode,
  type ThemeTokens,
  palette,
  radii,
  spacing,
  shadow,
} from './tokens';

const STORAGE_KEY = 'barberbook.themePreference.v1';

/**
 * Possible user preferences. `system` follows OS. `light`/`dark` pin.
 */
export type ThemePreference = 'system' | 'light' | 'dark';

interface ThemeContextValue {
  /** The resolved tokens for the currently active mode. */
  theme: ThemeTokens;
  /** The resolved mode (after applying preference + OS fallback). */
  mode: ThemeMode;
  /** What the user picked. May be 'system'. */
  preference: ThemePreference;
  setPreference: (next: ThemePreference) => void;
  /** Convenience: flip between light / dark, ignoring 'system'. */
  toggle: () => void;
  /** Static brand tokens, exposed here for ergonomic consumption. */
  palette: typeof palette;
  radii: typeof radii;
  spacing: typeof spacing;
  shadow: typeof shadow;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredPreference(): ThemePreference {
  const raw = kv.getString(STORAGE_KEY);
  if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  return 'system';
}

interface ThemeProviderProps {
  children: React.ReactNode;
  /** Force a mode in tests / Storybook. Overrides stored preference. */
  forceMode?: ThemeMode;
}

export function ThemeProvider({ children, forceMode }: ThemeProviderProps) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>(readStoredPreference);

  // Persist whenever the user changes their preference.
  useEffect(() => {
    kv.set(STORAGE_KEY, preference);
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
  }, []);

  const toggle = useCallback(() => {
    setPreferenceState((prev) => {
      const current: ThemeMode =
        prev === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : prev;
      return current === 'dark' ? 'light' : 'dark';
    });
  }, [systemScheme]);

  const mode: ThemeMode =
    forceMode ??
    (preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: themes[mode],
      mode,
      preference,
      setPreference,
      toggle,
      palette,
      radii,
      spacing,
      shadow,
    }),
    [mode, preference, setPreference, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be called inside a <ThemeProvider>.');
  }
  return ctx;
}
