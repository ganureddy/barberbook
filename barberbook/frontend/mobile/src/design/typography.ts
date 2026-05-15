/**
 * Typography stack and font loading.
 *
 * Custom fonts in React Native MUST be referenced by the exact key passed to
 * `useFonts`, not by the conceptual font weight. We pre-load every weight we
 * use so the Text primitive can pick a `fontFamily` deterministically.
 */

import { Anton_400Regular } from '@expo-google-fonts/anton';
import {
  DMSerifDisplay_400Regular,
  DMSerifDisplay_400Regular_Italic,
} from '@expo-google-fonts/dm-serif-display';
import { JetBrainsMono_500Medium, JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import { useFonts } from 'expo-font';

export const fontFamilies = {
  display: 'Anton_400Regular',
  serif: 'DMSerifDisplay_400Regular',
  serifItalic: 'DMSerifDisplay_400Regular_Italic',
  body: 'Manrope_400Regular',
  bodyMedium: 'Manrope_500Medium',
  bodySemiBold: 'Manrope_600SemiBold',
  bodyBold: 'Manrope_700Bold',
  bodyExtraBold: 'Manrope_800ExtraBold',
  mono: 'JetBrainsMono_500Medium',
  monoBold: 'JetBrainsMono_700Bold',
} as const;

export type FontFamilyKey = keyof typeof fontFamilies;

/**
 * Type ramp. Sizes follow the canvas — the display ramp is intentionally
 * very large; lineHeight is tightened on display variants since Anton is a
 * condensed face. The `font` field maps to a key in `fontFamilies`.
 */
export const textVariants = {
  displayXl: { font: 'display', fontSize: 96, lineHeight: 92, letterSpacing: 1 },
  display: { font: 'display', fontSize: 56, lineHeight: 56, letterSpacing: 1 },
  displaySm: { font: 'display', fontSize: 32, lineHeight: 34, letterSpacing: 0.5 },
  editorial: { font: 'serifItalic', fontSize: 24, lineHeight: 30, letterSpacing: 0 },
  editorialLg: { font: 'serif', fontSize: 32, lineHeight: 36, letterSpacing: 0 },
  bodyLg: { font: 'bodySemiBold', fontSize: 17, lineHeight: 24, letterSpacing: 0 },
  body: { font: 'body', fontSize: 15, lineHeight: 22, letterSpacing: 0 },
  bodyBold: { font: 'bodyBold', fontSize: 15, lineHeight: 22, letterSpacing: 0 },
  label: { font: 'bodyExtraBold', fontSize: 11, lineHeight: 14, letterSpacing: 1.5 },
  labelSm: { font: 'bodyExtraBold', fontSize: 9, lineHeight: 12, letterSpacing: 1.2 },
  caption: { font: 'bodyMedium', fontSize: 12, lineHeight: 16, letterSpacing: 0 },
  mono: { font: 'mono', fontSize: 13, lineHeight: 18, letterSpacing: 0.5 },
  monoLg: { font: 'monoBold', fontSize: 22, lineHeight: 24, letterSpacing: 0.5 },
} as const satisfies Record<
  string,
  { font: FontFamilyKey; fontSize: number; lineHeight: number; letterSpacing: number }
>;

export type TextVariant = keyof typeof textVariants;

/**
 * Loads every font weight the design system needs. Returns the standard
 * expo-font tuple `[loaded, error]`. Render a splash / null while !loaded so
 * Text doesn't FOUC into the system fallback.
 */
export function useAppFonts(): readonly [boolean, Error | null] {
  const [loaded, error] = useFonts({
    Anton_400Regular,
    DMSerifDisplay_400Regular,
    DMSerifDisplay_400Regular_Italic,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  });
  return [loaded, error] as const;
}
