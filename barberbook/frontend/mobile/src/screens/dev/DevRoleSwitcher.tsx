import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';

import type { UserRole } from '../../api/types';
import { Card, Text } from '../../components';
import { useTheme } from '../../design/ThemeProvider';
import { palette, spacing } from '../../design/tokens';
import type { RootStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/useAuthStore';
import { ScreenPlaceholder } from '../_components/ScreenPlaceholder';

type Nav = NativeStackNavigationProp<RootStackParamList, 'DevRoleSwitcher'>;

const ROLE_LABEL: Record<UserRole, string> = {
  Customer: '👤 Customer flow',
  Owner: '🏪 Owner flow',
  Staff: '✂️ Staff flow',
  Admin: '🛠 Admin (web only)',
};

const ROLE_DESCRIPTION: Record<UserRole, string> = {
  Customer: 'Discover · Bookings · Pass · Rewards · Me · 21 screens',
  Owner: 'Today · Roster · Menu · Money · Shop · 11 screens',
  Staff: 'Schedule · In-service · Customer · Earnings · 4 screens',
  Admin: 'Lives in the web admin panel — no mobile UI.',
};

/**
 * Dev-only screen for jumping between role flows without going through OTP.
 * Mounted under the root stack so it's reachable from any screen via
 * `navigation.navigate('DevRoleSwitcher')` (the DevHud has a button).
 */
export function DevRoleSwitcher() {
  const nav = useNavigation<Nav>();
  const setDevRole = useAuthStore((s) => s.setDevRole);
  const logout = useAuthStore((s) => s.logout);
  const { theme } = useTheme();

  const switchTo = (role: UserRole) => {
    setDevRole(role);
    // Pop the modal — the root navigator will swap the underlying stack
    // to the chosen role's tree on the next render.
    nav.goBack();
  };

  return (
    <ScreenPlaceholder
      title="Switch role"
      subtitle="Jump straight into any flow. Auth is faked (no OTP)."
      role="Dev"
      routeName="DevRoleSwitcher"
      nextSteps={[
        {
          label: ROLE_LABEL.Customer,
          variant: 'red',
          onPress: () => {
            switchTo('Customer');
          },
        },
        {
          label: ROLE_LABEL.Owner,
          variant: 'primary',
          onPress: () => {
            switchTo('Owner');
          },
        },
        {
          label: ROLE_LABEL.Staff,
          variant: 'gold',
          onPress: () => {
            switchTo('Staff');
          },
        },
        {
          label: 'Open Design Showcase',
          variant: 'cream',
          onPress: () => {
            nav.goBack();
            nav.navigate('DevShowcase');
          },
        },
        {
          label: 'Sign out → onboarding',
          variant: 'ghost',
          onPress: () => {
            logout().catch(() => {});
            nav.goBack();
          },
        },
      ]}
    >
      <Card style={{ marginTop: spacing.xl }} alt>
        <Text variant="label" color={theme.muted}>
          ABOUT EACH FLOW
        </Text>
        {(['Customer', 'Owner', 'Staff'] as const).map((r) => (
          <Text key={r} variant="caption" style={{ marginTop: spacing.xs }}>
            <Text variant="bodyBold" color={palette.ink}>
              {r}:{' '}
            </Text>
            {ROLE_DESCRIPTION[r]}
          </Text>
        ))}
      </Card>
    </ScreenPlaceholder>
  );
}
