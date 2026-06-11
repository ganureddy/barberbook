import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { useTheme } from '../design/ThemeProvider';
import { radii, shadow as shadowPresets, type Shadow } from '../design/tokens';

export interface CardProps extends ViewProps {
  padded?: boolean;
  /** Shadow elevation. Default 'sm'. Pass 'none' for borderless flat. */
  shadow?: Shadow;
  /** When true, renders with `surfaceAlt` (cream-deep) rather than `surface`. */
  alt?: boolean;
  bordered?: boolean;
  radius?: keyof typeof radii;
}

/**
 * Base surface for grouping content. Uses theme `surface` so it reads
 * correctly in both light and dark mode without consumers thinking about it.
 */
export function Card({
  padded = true,
  shadow = 'sm',
  alt = false,
  bordered = true,
  radius = 'lg',
  style,
  children,
  ...rest
}: CardProps) {
  const { theme, densityScale } = useTheme();
  // Compact density shaves ~25% off the default padding. Horizontal
  // padding stays close to comfortable to keep text legible; vertical
  // padding takes the bulk of the cut.
  const padV = padded ? Math.round(16 * densityScale) : 0;
  const padH = padded ? Math.round(16 * Math.max(0.85, densityScale)) : 0;
  return (
    <View
      {...rest}
      style={[
        styles.base,
        {
          backgroundColor: alt ? theme.surfaceAlt : theme.surface,
          borderColor: bordered ? theme.line : 'transparent',
          borderWidth: bordered ? StyleSheet.hairlineWidth * 2 : 0,
          borderRadius: radii[radius],
          paddingVertical: padV,
          paddingHorizontal: padH,
        },
        shadowPresets[shadow],
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {},
});
