import * as Haptics from 'expo-haptics';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '../design/ThemeProvider';
import { palette, radii } from '../design/tokens';

import { Text } from './Text';

export type ButtonVariant = 'primary' | 'red' | 'ghost' | 'gold' | 'cream';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Render an icon (or any node) inside the button, before the label. */
  leading?: React.ReactNode;
  /** Render a node after the label (e.g. a price or chevron). */
  trailing?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  /** Default `true`. iOS-style light tap on press. */
  haptic?: boolean;
  /** Stretch to fill the parent's main axis. */
  block?: boolean;
  style?: ViewStyle;
}

interface VariantStyle {
  bg: string;
  text: string;
  border?: string;
}

const SIZE: Record<ButtonSize, { paddingV: number; paddingH: number; gap: number }> = {
  sm: { paddingV: 8, paddingH: 14, gap: 6 },
  md: { paddingV: 12, paddingH: 18, gap: 8 },
  lg: { paddingV: 16, paddingH: 22, gap: 10 },
};

const TEXT_VARIANT: Record<ButtonSize, 'label' | 'bodyBold' | 'bodyLg'> = {
  sm: 'label',
  md: 'bodyBold',
  lg: 'bodyLg',
};

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  leading,
  trailing,
  loading = false,
  disabled = false,
  haptic = true,
  block = false,
  onPress,
  style,
  ...rest
}: ButtonProps) {
  const { theme } = useTheme();

  // Variant resolution depends on theme mode for `primary` / `ghost`.
  const variants: Record<ButtonVariant, VariantStyle> = {
    primary: { bg: theme.text, text: theme.bg },
    red: { bg: palette.red, text: palette.white },
    ghost: { bg: 'transparent', text: theme.text, border: theme.lineStrong },
    gold: { bg: palette.gold, text: palette.ink },
    cream: { bg: palette.cream, text: palette.ink, border: theme.line },
  };

  const v = variants[variant];
  const s = SIZE[size];
  const isInteractive = !disabled && !loading;

  const handlePress: PressableProps['onPress'] = (e) => {
    if (!isInteractive) return;
    if (haptic) {
      // Selection is the lightest non-blocking impact and matches the
      // canvas's deliberately understated interaction feel.
      Haptics.selectionAsync().catch(() => {});
    }
    onPress?.(e);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, busy: loading }}
      accessibilityLabel={label}
      disabled={!isInteractive}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: v.bg,
          borderColor: v.border ?? 'transparent',
          borderWidth: v.border ? StyleSheet.hairlineWidth * 2 : 0,
          paddingVertical: s.paddingV,
          paddingHorizontal: s.paddingH,
          gap: s.gap,
          opacity: disabled ? 0.45 : pressed ? 0.78 : 1,
          alignSelf: block ? 'stretch' : 'flex-start',
          transform: pressed ? [{ scale: 0.985 }] : undefined,
        },
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={v.text} />
      ) : (
        <>
          {leading != null && <View style={styles.affix}>{leading}</View>}
          <Text variant={TEXT_VARIANT[size]} color={v.text}>
            {label}
          </Text>
          {trailing != null && <View style={styles.affix}>{trailing}</View>}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  affix: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
