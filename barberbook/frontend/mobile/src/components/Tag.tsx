import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { palette, radii } from '../design/tokens';

import { Text } from './Text';

export interface TagProps {
  label: string;
  bg?: string;
  color?: string;
  style?: ViewStyle;
}

/**
 * Small uppercase pill — used for status badges (LIVE, OPEN, NEXT UP, DONE).
 * Shorter / heavier than `Chip`; never interactive.
 */
export function Tag({ label, bg = palette.ink, color = palette.cream, style }: TagProps) {
  return (
    <View style={[styles.base, { backgroundColor: bg }, style]}>
      <Text variant="labelSm" color={color} uppercase>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
    alignSelf: 'flex-start',
  },
});
