import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';

import type { MeStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/useAuthStore';
import { ScreenPlaceholder } from '../_components/ScreenPlaceholder';

type Nav = NativeStackNavigationProp<MeStackParamList, 'Profile'>;

export function Profile() {
  const nav = useNavigation<Nav>();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <ScreenPlaceholder
      title={user?.full_name ?? 'Profile'}
      subtitle={user ? `${user.email} · ${user.phone}` : 'Not signed in'}
      role="Customer"
      routeName="Profile"
      nextSteps={[
        {
          label: 'Notifications',
          variant: 'primary',
          onPress: () => {
            nav.navigate('NotificationsList');
          },
        },
        {
          label: 'Sign out',
          variant: 'ghost',
          onPress: () => {
            logout().catch(() => {});
          },
        },
      ]}
    />
  );
}
