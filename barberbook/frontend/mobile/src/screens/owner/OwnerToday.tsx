import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';

import type { TodayStackParamList } from '../../navigation/types';
import { ScreenPlaceholder } from '../_components/ScreenPlaceholder';

type Nav = NativeStackNavigationProp<TodayStackParamList, 'OwnerToday'>;

export function OwnerToday() {
  const nav = useNavigation<Nav>();
  return (
    <ScreenPlaceholder
      title="Today"
      subtitle="Live walk-ins, today's bookings, takings so far."
      role="Owner"
      routeName="OwnerToday"
      nextSteps={[
        {
          label: 'Manage walk-in queue →',
          variant: 'red',
          onPress: () => {
            nav.navigate('OwnerWalkin');
          },
        },
      ]}
    />
  );
}
