import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { useTheme } from '../design/ThemeProvider';
import { palette, radii } from '../design/tokens';

import { Text } from './Text';

export interface ChipProps {
  label: string;
  active?: boolean;
  /** When passed, overrides the active background color. */
  color?: string;
  onPress?: () => void;
  style?: ViewStyle;
}

/**
 * Filter chip. Larger than Tag, interactive, supports a selected state.
 * Default active color is the user-supplied `color`, falling back to
 * theme `text` so it reads well on both modes.
 */
export function Chip({ label, active = false, color, onPress, style }: ChipProps) {
  const { theme } = useTheme();
  const activeBg = color ?? theme.text;
  const activeFg =
    activeBg === palette.cream || activeBg === palette.gold ? palette.ink : palette.cream;

  const handlePress = () => {
    if (!onPress) return;
    Haptics.selectionAsync().catch(() => {});
    onPress();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress ? handlePress : undefined}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: active ? activeBg : 'transparent',
          borderColor: active ? activeBg : theme.lineStrong,
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <Text variant="label" color={active ? activeFg : theme.text}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignSelf: 'flex-start',
  },
});
