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
  const { theme } = useTheme();
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
          padding: padded ? 16 : 0,
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
