import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '../design/ThemeProvider';

export interface DividerProps {
  vertical?: boolean;
  strong?: boolean;
  inset?: number;
  style?: ViewStyle;
}

export function Divider({ vertical = false, strong = false, inset = 0, style }: DividerProps) {
  const { theme } = useTheme();
  const color = strong ? theme.lineStrong : theme.line;

  if (vertical) {
    return (
      <View
        style={[
          {
            width: StyleSheet.hairlineWidth * 2,
            backgroundColor: color,
            marginVertical: inset,
            alignSelf: 'stretch',
          },
          style,
        ]}
      />
    );
  }
  return (
    <View
      style={[
        {
          height: StyleSheet.hairlineWidth * 2,
          backgroundColor: color,
          marginHorizontal: inset,
          alignSelf: 'stretch',
        },
        style,
      ]}
    />
  );
}
