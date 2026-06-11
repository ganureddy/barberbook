/**
 * BarberBook design tokens.
 *
 * Aesthetic from the brand canvas: retro barber-pole — bold, masculine,
 * classic American shop signage meets modern editorial. Red + navy + cream
 * stripes, condensed display type, editorial serif accents.
 *
 * These tokens are the single source of truth. Components must read from
 * `useTheme()` (for surface/text/line) and from `palette`/`radii`/`spacing`/
 * `shadow` (for static brand values that don't flip with theme mode).
 */

import { Platform, type ViewStyle } from 'react-native';

export const palette = {
  red: '#D4322C',
  redDeep: '#A8211B',
  navy: '#1E3A8A',
  navyDeep: '#142659',
  cream: '#F5F1E8',
  creamDeep: '#EBE3D0',
  ink: '#0E0E10',
  charcoal: '#1A1A1D',
  gold: '#C9A24C',
  goldSoft: '#E8C875',
  muted: '#6B6258',
  white: '#FFFFFF',
} as const;

export type PaletteColor = keyof typeof palette;

export const radii = {
  none: 0,
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export type Radius = keyof typeof radii;

/**
 * 4-pt spacing scale. Matches the steps the user requested
 * (4 / 8 / 12 / 16 / 20 / 24 / 32 / 48) plus 0 and a 2 step
 * for hairline gaps between glyphs / icons.
 */
export const spacing = {
  none: 0,
  '2xs': 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 48,
  '5xl': 64,
} as const;

export type Spacing = keyof typeof spacing;

/**
 * Shadow presets. RN expresses shadow differently per platform — iOS uses
 * `shadow*`, Android uses `elevation`. We bundle both so consumers can spread
 * one preset onto a View regardless of platform.
 *
 * On Android, `elevation` requires a non-transparent backgroundColor on the
 * shadowed view. Make sure the consuming component sets one.
 */
export const shadow = {
  none: {} as ViewStyle,
  sm: Platform.select<ViewStyle>({
    ios: {
      shadowColor: palette.ink,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 2,
    },
    default: { elevation: 1 },
  }),
  md: Platform.select<ViewStyle>({
    ios: {
      shadowColor: palette.ink,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 14,
    },
    default: { elevation: 3 },
  }),
  lg: Platform.select<ViewStyle>({
    ios: {
      shadowColor: palette.ink,
      shadowOffset: { width: 0, height: 18 },
      shadowOpacity: 0.18,
      shadowRadius: 40,
    },
    default: { elevation: 8 },
  }),
} as const;

export type Shadow = keyof typeof shadow;

/**
 * Functional theme tokens. The two themes share a shape so consumers can
 * read `theme.bg` regardless of mode.
 */
export interface ThemeTokens {
  mode: 'light' | 'dark';
  bg: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textOnDark: string;
  muted: string;
  line: string;
  lineStrong: string;
  accent: string;
  scrim: string;
}

export const lightTheme: ThemeTokens = {
  mode: 'light',
  bg: palette.cream,
  surface: palette.white,
  surfaceAlt: palette.creamDeep,
  text: palette.ink,
  textOnDark: palette.cream,
  muted: palette.muted,
  line: 'rgba(14,14,16,0.10)',
  lineStrong: 'rgba(14,14,16,0.22)',
  accent: palette.red,
  scrim: 'rgba(14,14,16,0.55)',
};

export const darkTheme: ThemeTokens = {
  mode: 'dark',
  bg: '#0A0A0C',
  surface: '#16161A',
  surfaceAlt: '#1F1F24',
  text: palette.cream,
  textOnDark: palette.cream,
  muted: '#8B8478',
  line: 'rgba(245,241,232,0.10)',
  lineStrong: 'rgba(245,241,232,0.22)',
  accent: palette.red,
  scrim: 'rgba(0,0,0,0.65)',
};

export type ThemeMode = ThemeTokens['mode'];

export const themes: Record<ThemeMode, ThemeTokens> = {
  light: lightTheme,
  dark: darkTheme,
};

export const tagline = 'The chair is waiting.';

/**
 * Hit-slop preset for small icon buttons — RN doesn't grow the touchable area
 * by default; tiny icons should always carry at least 44pt of hit target.
 */
export const hitSlop = { top: 12, bottom: 12, left: 12, right: 12 } as const;
