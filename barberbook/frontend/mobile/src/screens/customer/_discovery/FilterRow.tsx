import React from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Chip, Icon } from '../../../components';
import { useTheme } from '../../../design/ThemeProvider';
import { palette, radii, spacing } from '../../../design/tokens';

import type { DiscoveryFilterState } from './types';

interface Props {
  state: DiscoveryFilterState;
  onToggle: <K extends keyof DiscoveryFilterState>(k: K) => void;
}

/**
 * Horizontal scroll row of filter chips. Each chip is a real toggle on
 * `DiscoveryFilterState` (no decorative dead chips), so what you tap is what
 * filters the list. Scrolls horizontally for longer (Hindi / Arabic) labels.
 */
export function FilterRow({ state, onToggle }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      <View style={[styles.iconBadge, { borderColor: theme.line, backgroundColor: theme.surface }]}>
        <Icon name="filter" size={15} color={theme.muted} />
      </View>
      <Chip
        label={t('discover.filters.open_now')}
        active={state.open_now}
        onPress={() => {
          onToggle('open_now');
        }}
      />
      <Chip
        label={t('discover.filters.walkin')}
        active={state.walkin}
        color={palette.red}
        onPress={() => {
          onToggle('walkin');
        }}
      />
      <Chip
        label={t('discover.filters.highest_rated')}
        active={state.highest_rated}
        color={palette.gold}
        onPress={() => {
          onToggle('highest_rated');
        }}
      />
    </ScrollView>
  );
}

/**
 * Decorative leading-icon for headers that want to suggest "filters" — kept
 * here so callers don't have to import Icon directly for this one use.
 */
export function FilterIcon({ size = 18, color }: { size?: number; color?: string }) {
  return <Icon name="filter" size={size} color={color} />;
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xs,
    gap: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
