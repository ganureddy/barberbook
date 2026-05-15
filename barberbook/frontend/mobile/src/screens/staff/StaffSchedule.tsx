import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';

import type { StaffStackParamList } from '../../navigation/types';
import { ScreenPlaceholder } from '../_components/ScreenPlaceholder';

type Nav = NativeStackNavigationProp<StaffStackParamList, 'StaffSchedule'>;

export function StaffSchedule() {
  const nav = useNavigation<Nav>();
  return (
    <ScreenPlaceholder
      title="Your week"
      subtitle="Your shifts, today's lineup, who's next."
      role="Staff"
      routeName="StaffSchedule"
      nextSteps={[
        {
          label: 'Start next service →',
          variant: 'red',
          onPress: () => {
            nav.navigate('StaffInService', { bookingId: 'BB-BKG-5001' });
          },
        },
        {
          label: 'View earnings',
          variant: 'gold',
          onPress: () => {
            nav.navigate('StaffEarnings');
          },
        },
      ]}
    />
  );
}
