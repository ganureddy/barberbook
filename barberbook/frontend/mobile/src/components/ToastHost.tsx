import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../design/ThemeProvider';
import { palette, radii, shadow, spacing } from '../design/tokens';
import { useToastStore, type Toast, type ToastIndicator } from '../lib/toast';

import { Icon } from './Icon';
import { Text } from './Text';

const INDICATOR_BG: Record<ToastIndicator, string> = {
  green: '#3F6B5F',
  red: palette.red,
  yellow: palette.gold,
  blue: palette.navy,
  gray: palette.charcoal,
};

const INDICATOR_FG: Record<ToastIndicator, string> = {
  green: palette.cream,
  red: palette.cream,
  yellow: palette.ink,
  blue: palette.cream,
  gray: palette.cream,
};

const INDICATOR_ICON: Record<ToastIndicator, 'check' | 'close' | 'bell' | 'star' | 'plus'> = {
  green: 'check',
  red: 'close',
  yellow: 'bell',
  blue: 'bell',
  gray: 'star',
};

/**
 * Stack of toasts pinned to the bottom of the screen, above the safe area.
 * Drives off `useToastStore`. Designed to live once at the root, beneath
 * the navigation tree, so the entire app shares a single host.
 */
export function ToastHost() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  const { mode } = useTheme();

  if (toasts.length === 0) return null;

  return (
    <SafeAreaView pointerEvents="box-none" style={styles.root} edges={['bottom', 'left', 'right']}>
      <View style={styles.stack}>
        {toasts.map((t) => (
          <ToastItem
            key={t.id}
            toast={t}
            onDismiss={() => {
              dismiss(t.id);
            }}
            dark={mode === 'dark'}
          />
        ))}
      </View>
    </SafeAreaView>
  );
}

interface ToastItemProps {
  toast: Toast;
  dark: boolean;
  onDismiss: () => void;
}

function ToastItem({ toast: t, onDismiss }: ToastItemProps) {
  const bg = INDICATOR_BG[t.indicator];
  const fg = INDICATOR_FG[t.indicator];
  const iconName = INDICATOR_ICON[t.indicator];

  return (
    <Pressable
      onPress={onDismiss}
      accessibilityRole="alert"
      style={({ pressed }) => [
        styles.toast,
        { backgroundColor: bg, opacity: pressed ? 0.85 : 1 },
        shadow.md,
      ]}
    >
      <Icon name={iconName} size={18} color={fg} />
      <View style={{ flex: 1 }}>
        {t.title != null && t.title.length > 0 && (
          <Text variant="label" color={fg}>
            {t.title}
          </Text>
        )}
        <Text variant="body" color={fg}>
          {t.message}
        </Text>
      </View>
      <Icon name="close" size={16} color={fg} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9000,
    elevation: 9,
  },
  stack: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
  },
});
