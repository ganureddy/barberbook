import React from 'react';
import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { useTheme } from '../design/ThemeProvider';
import { fontFamilies, textVariants, type TextVariant } from '../design/typography';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  /**
   * Force a specific color. When omitted, uses the active theme's `text`
   * for opaque variants and `muted` for `caption` / `labelSm`.
   */
  color?: string;
  /** When true, uppercase the rendered string regardless of variant. */
  uppercase?: boolean;
  /** Right-align convenience. */
  align?: TextStyle['textAlign'];
}

/**
 * The single text primitive for the entire app. Always pick a `variant`;
 * raw `<RNText>` should not appear in feature code.
 *
 * Custom fonts are referenced by the literal name we register in `useAppFonts`,
 * not by `fontWeight` — RN's text engine does not synthesize weights for
 * custom fonts. The `font` field on each variant maps to that registered key.
 */
export function Text({
  variant = 'body',
  color,
  uppercase,
  align,
  style,
  children,
  ...rest
}: TextProps) {
  const { theme } = useTheme();
  const v = textVariants[variant];

  const defaultColor = variant === 'caption' || variant === 'labelSm' ? theme.muted : theme.text;

  const finalStyle: TextStyle = {
    fontFamily: fontFamilies[v.font],
    fontSize: v.fontSize,
    lineHeight: v.lineHeight,
    letterSpacing: v.letterSpacing,
    color: color ?? defaultColor,
    textAlign: align,
    textTransform:
      uppercase || variant === 'label' || variant === 'labelSm' || variant.startsWith('display')
        ? 'uppercase'
        : 'none',
    includeFontPadding: false,
  };

  return (
    <RNText {...rest} style={[finalStyle, style]}>
      {children}
    </RNText>
  );
}
