import React from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet } from 'react-native';

import { Chip, Icon } from '../../../components';
import { palette, spacing } from '../../../design/tokens';

import type { DiscoveryFilterState } from './types';

interface Props {
  state: DiscoveryFilterState;
  onToggle: <K extends keyof DiscoveryFilterState>(k: K) => void;
}

/**
 * Horizontal scroll row of filter chips. Sticky on top of map / list, but
 * scrolls horizontally on narrow devices because Hindi labels can wrap wider
 * than English. Filter icon prefix is decorative — the filters live here, not
 * a separate sheet.
 */
export function FilterRow({ state, onToggle }: Props) {
  const { t } = useTranslation();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
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
      <Chip label={t('discover.filters.beard')} onPress={() => {}} />
      <Chip label={t('discover.filters.color')} onPress={() => {}} />
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
  },
});
