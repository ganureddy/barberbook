/**
 * BarberBook design tokens, lifted directly from the canvas brand system.
 *
 * Aesthetic: retro barber-pole — bold, masculine, classic American shop signage
 * meets modern editorial. Red + navy + cream stripes, condensed display type,
 * editorial serif accents.
 */

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
  white: '#FFFFFF',
} as const;

export interface Theme {
  bg: string;
  surface: string;
  text: string;
  muted: string;
  line: string;
  lineStrong: string;
  accent: string;
}

export const lightTheme: Theme = {
  bg: palette.cream,
  surface: palette.white,
  text: palette.ink,
  muted: '#6B6258',
  line: 'rgba(14,14,16,0.10)',
  lineStrong: 'rgba(14,14,16,0.22)',
  accent: palette.red,
};

export const darkTheme: Theme = {
  bg: '#0A0A0C',
  surface: '#16161A',
  text: palette.cream,
  muted: '#8B8478',
  line: 'rgba(245,241,232,0.10)',
  lineStrong: 'rgba(245,241,232,0.22)',
  accent: palette.red,
};

export const fonts = {
  display: 'Anton',
  serif: 'DM Serif Display',
  body: 'Manrope',
  mono: 'JetBrains Mono',
} as const;

export const radii = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
} as const;

export const shadow = {
  sm: {
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  lg: {
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.16,
    shadowRadius: 40,
    elevation: 8,
  },
} as const;

export type ThemeMode = 'light' | 'dark';

export const themes: Record<ThemeMode, Theme> = {
  light: lightTheme,
  dark: darkTheme,
};

export const tagline = 'The chair is waiting.';
