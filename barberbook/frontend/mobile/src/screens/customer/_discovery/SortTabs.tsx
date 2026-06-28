import * as Haptics from 'expo-haptics';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '../../../components';
import { useTheme } from '../../../design/ThemeProvider';
import { radii, spacing } from '../../../design/tokens';

import type { SortKey } from './types';

const TABS: SortKey[] = ['for_you', 'quickest', 'top', 'budget'];

interface Props {
  value: SortKey;
  onChange: (v: SortKey) => void;
}

/**
 * Segmented "For you / Quickest / Top rated / Budget" sorter.
 *
 * Each tab renders its own pill so the active state is always visible — no
 * absolute/measured slider that can flash empty before layout. Scrolls
 * horizontally when labels overflow (e.g. Hindi / Arabic).
 */
export function SortTabs({ value, onChange }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      <View style={[styles.track, { backgroundColor: theme.surfaceAlt, borderColor: theme.line }]}>
        {TABS.map((k) => {
          const active = k === value;
          return (
            <Pressable
              key={k}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                onChange(k);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[styles.tab, active && { backgroundColor: theme.text }]}
            >
              <Text variant="label" color={active ? theme.bg : theme.muted}>
                {t(`discover.tabs.${k}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  track: {
    flexDirection: 'row',
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: 4,
    gap: 4,
  },
  tab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: 'transparent',
  },
});
