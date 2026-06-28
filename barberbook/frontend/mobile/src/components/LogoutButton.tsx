import * as Haptics from 'expo-haptics';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '../design/ThemeProvider';
import { palette, radii } from '../design/tokens';
import { useAuthStore } from '../store/useAuthStore';

import { Icon } from './Icon';
import { Text } from './Text';

interface Props {
  /** When true, renders an icon + "Sign out" label pill; otherwise icon-only. */
  withLabel?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Sign-out control available to every role (owner / staff / customer).
 * Confirms first, then clears the session + active role via the auth store —
 * which drops the user back to the onboarding/login flow (RootNavigator
 * switches to Onboarding once `status` is unauthenticated), so they can log
 * back in as any role.
 */
export function LogoutButton({ withLabel = false, style }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const logout = useAuthStore((s) => s.logout);

  const confirm = () => {
    Haptics.selectionAsync().catch(() => {});
    Alert.alert(t('profile.sign_out'), t('profile.sign_out_confirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.sign_out'),
        style: 'destructive',
        onPress: () => {
          logout().catch(() => {});
        },
      },
    ]);
  };

  return (
    <Pressable
      onPress={confirm}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={t('profile.sign_out')}
      style={[
        withLabel ? styles.pill : styles.icon,
        { backgroundColor: theme.surface, borderColor: theme.line },
        style,
      ]}
    >
      <Icon name="close" size={18} color={palette.red} />
      {withLabel && (
        <Text variant="label" color={palette.red}>
          {t('profile.sign_out').toUpperCase()}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  icon: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
});
