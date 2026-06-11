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
const DENSITY_KEY = 'barberbook.density.v1';

/**
 * Possible user preferences. `system` follows OS. `light`/`dark` pin.
 */
export type ThemePreference = 'system' | 'light' | 'dark';

/**
 * Layout density. `comfortable` is the canvas default; `compact`
 * reduces vertical padding by ~25% (driven by `densityScale`) so
 * data-dense screens (Owner timeline, walk-in queue, roster) fit more
 * rows on smaller phones without breaking the visual rhythm.
 */
export type Density = 'comfortable' | 'compact';

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
  /** Density preference: comfortable / compact. */
  density: Density;
  setDensity: (next: Density) => void;
  /** 1.0 for comfortable, 0.75 for compact. Multiply vertical paddings by this. */
  densityScale: number;
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

function readStoredDensity(): Density {
  const raw = kv.getString(DENSITY_KEY);
  if (raw === 'comfortable' || raw === 'compact') return raw;
  return 'comfortable';
}

interface ThemeProviderProps {
  children: React.ReactNode;
  /** Force a mode in tests / Storybook. Overrides stored preference. */
  forceMode?: ThemeMode;
}

export function ThemeProvider({ children, forceMode }: ThemeProviderProps) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>(readStoredPreference);
  const [density, setDensityState] = useState<Density>(readStoredDensity);

  // Persist whenever the user changes their preference.
  useEffect(() => {
    kv.set(STORAGE_KEY, preference);
  }, [preference]);
  useEffect(() => {
    kv.set(DENSITY_KEY, density);
  }, [density]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
  }, []);

  const setDensity = useCallback((next: Density) => {
    setDensityState(next);
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

  const densityScale = density === 'compact' ? 0.75 : 1;

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: themes[mode],
      mode,
      preference,
      setPreference,
      toggle,
      density,
      setDensity,
      densityScale,
      palette,
      radii,
      spacing,
      shadow,
    }),
    [density, densityScale, mode, preference, setDensity, setPreference, toggle],
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
