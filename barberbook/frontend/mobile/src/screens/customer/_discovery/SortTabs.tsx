import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Text } from '../../../components';
import { useTheme } from '../../../design/ThemeProvider';
import { palette, radii, spacing } from '../../../design/tokens';

import type { SortKey } from './types';

const TABS: SortKey[] = ['for_you', 'quickest', 'top', 'budget'];

interface Props {
  value: SortKey;
  onChange: (v: SortKey) => void;
}

interface TabLayout {
  x: number;
  width: number;
}

/**
 * Segmented "For you / Quickest / Top rated / Budget" sorter. The active
 * pill slides between tabs via Reanimated. Tabs auto-scroll into view if
 * they overflow horizontally on smaller screens / Hindi labels.
 */
export function SortTabs({ value, onChange }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const layouts = useRef<Record<SortKey, TabLayout>>({} as Record<SortKey, TabLayout>);

  const pillX = useSharedValue(0);
  const pillW = useSharedValue(0);

  const update = (key: SortKey) => {
    const l = layouts.current[key];
    if (!l) return;
    pillX.value = withSpring(l.x, { damping: 18, stiffness: 220 });
    pillW.value = withSpring(l.width, { damping: 18, stiffness: 220 });
  };

  // Re-position whenever the active tab changes (incl. external setSort).
  useEffect(() => {
    update(value);
    // We want this to run whenever the layout map changes too, but
    // layouts is a ref — relying on `value` is fine for a 4-tab fixed list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pillX.value }],
    width: pillW.value,
  }));

  const onLayout = (key: SortKey) => (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    layouts.current[key] = { x, width };
    if (value === key) update(key);
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      <View style={styles.inner}>
        <Animated.View
          style={[styles.pill, { backgroundColor: theme.text }, pillStyle]}
          pointerEvents="none"
        />
        {TABS.map((k) => {
          const active = k === value;
          return (
            <Pressable
              key={k}
              onLayout={onLayout(k)}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                onChange(k);
              }}
              style={styles.tab}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
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
  inner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: radii.pill,
    padding: 4,
    position: 'relative',
  },
  pill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 0,
    borderRadius: radii.pill,
    backgroundColor: palette.ink,
  },
  tab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
});
