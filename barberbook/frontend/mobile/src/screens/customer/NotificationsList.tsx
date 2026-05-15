import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';

import type { MeStackParamList } from '../../navigation/types';
import { ScreenPlaceholder } from '../_components/ScreenPlaceholder';

type Nav = NativeStackNavigationProp<MeStackParamList, 'NotificationsList'>;

export function NotificationsList() {
  const nav = useNavigation<Nav>();
  return (
    <ScreenPlaceholder
      title="Notifications"
      subtitle="Booking confirmations, walk-in updates, points earned."
      role="Customer"
      routeName="NotificationsList"
      nextSteps={[
        {
          label: 'Back',
          variant: 'primary',
          onPress: () => {
            nav.goBack();
          },
        },
      ]}
    />
  );
}
