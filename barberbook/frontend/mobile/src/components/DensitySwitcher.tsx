import * as Haptics from 'expo-haptics';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme, type Density } from '../design/ThemeProvider';
import { palette, radii, spacing } from '../design/tokens';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

const OPTIONS: { id: Density; key: Density; icon: IconName }[] = [
  { id: 'comfortable', key: 'comfortable', icon: 'menu' },
  { id: 'compact', key: 'compact', icon: 'check' },
];

/**
 * Density switcher card. Mirrors `<ThemeSwitcher>` in shape so the
 * Profile settings stack reads as a clean trio (language / theme /
 * density). Compact density reduces card vertical padding by ~25%.
 */
export function DensitySwitcher() {
  const { t } = useTranslation();
  const { theme, density, setDensity } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
      <Text variant="label" color={theme.muted} style={styles.label}>
        {t('switcher.density_label').toUpperCase()}
      </Text>

      <View style={styles.row}>
        {OPTIONS.map((opt) => {
          const active = opt.id === density;
          return (
            <Pressable
              key={opt.id}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setDensity(opt.id);
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={t(`switcher.${opt.key}`)}
              style={({ pressed }) => [
                styles.pill,
                {
                  backgroundColor: active ? palette.red : 'transparent',
                  borderColor: active ? palette.red : theme.lineStrong,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Icon name={opt.icon} size={16} color={active ? palette.cream : theme.text} />
              <Text variant="label" color={active ? palette.cream : theme.text}>
                {t(`switcher.${opt.key}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  label: {},
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1.5,
  },
});
