import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '../design/ThemeProvider';
import { palette, radii, spacing } from '../design/tokens';
import {
  LANGUAGE_LABELS,
  SUPPORTED_LANGUAGES,
  getLanguage,
  isRTL,
  setLanguage,
  type AppLanguage,
} from '../i18n';
import { toast } from '../lib/toast';

import { Icon } from './Icon';
import { Text } from './Text';

/**
 * Language switcher card. Renders one row per supported language, with
 * the active language pinned with a check. Tapping a row persists the
 * choice and — for RTL ↔ LTR transitions — restarts the bundle via
 * `expo-updates` so RN re-applies `I18nManager` direction.
 */
export function LanguageSwitcher() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [active, setActive] = useState<AppLanguage>(getLanguage());
  const [busy, setBusy] = useState(false);

  const apply = async (lang: AppLanguage) => {
    if (lang === active || busy) return;
    Haptics.selectionAsync().catch(() => {});

    const willToggleRTL = isRTL(lang) !== isRTL(active);
    if (willToggleRTL) {
      // Confirm the restart so people don't lose state mid-flow.
      const ok = await new Promise<boolean>((resolve) => {
        Alert.alert(t('switcher.language_label'), t('switcher.rtl_warning'), [
          {
            text: t('common.cancel'),
            onPress: () => {
              resolve(false);
            },
            style: 'cancel',
          },
          {
            text: t('common.continue'),
            onPress: () => {
              resolve(true);
            },
          },
        ]);
      });
      if (!ok) return;
    }

    setBusy(true);
    setActive(lang);
    const restarted = await setLanguage(lang);
    setBusy(false);

    if (willToggleRTL && !restarted) {
      // Expo Go path — can't trigger a JS reload; surface the manual step.
      toast.info('Language saved. Please relaunch the app to apply RTL.');
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
      <Text variant="label" color={theme.muted} style={styles.label}>
        {t('switcher.language_label').toUpperCase()}
      </Text>

      {SUPPORTED_LANGUAGES.map((code) => {
        const isActive = code === active;
        const labels = LANGUAGE_LABELS[code];
        return (
          <Pressable
            key={code}
            onPress={() => {
              apply(code).catch(() => {});
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected: isActive }}
            style={({ pressed }) => [
              styles.row,
              { opacity: pressed ? 0.85 : 1 },
              isActive && { backgroundColor: 'rgba(212,50,44,0.06)' },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text variant="bodyBold">{labels.native}</Text>
              <Text variant="caption" color={theme.muted}>
                {labels.english}
                {isRTL(code) ? ' · RTL' : ''}
              </Text>
            </View>
            {isActive && <Icon name="check" size={20} color={palette.red} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    paddingVertical: spacing.sm,
  },
  label: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});
