import * as Haptics from 'expo-haptics';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme, type ThemePreference } from '../design/ThemeProvider';
import { palette, radii, spacing } from '../design/tokens';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

const OPTIONS: { id: ThemePreference; icon: IconName; key: 'system' | 'light' | 'dark' }[] = [
  { id: 'system', icon: 'menu', key: 'system' },
  { id: 'light', icon: 'star', key: 'light' },
  { id: 'dark', icon: 'pole', key: 'dark' },
];

/**
 * Theme switcher card. Three pill-style buttons in a row: System / Light /
 * Dark. The active one fills with brand red. Persistence is handled by
 * the `ThemeProvider`'s `setPreference`.
 */
export function ThemeSwitcher() {
  const { t } = useTranslation();
  const { theme, preference, setPreference } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
      <Text variant="label" color={theme.muted} style={styles.label}>
        {t('switcher.theme_label').toUpperCase()}
      </Text>

      <View style={styles.row}>
        {OPTIONS.map((opt) => {
          const active = opt.id === preference;
          return (
            <Pressable
              key={opt.id}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setPreference(opt.id);
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
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
