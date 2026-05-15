import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';

import type { BookingsStackParamList } from '../../navigation/types';
import { ScreenPlaceholder } from '../_components/ScreenPlaceholder';

type Nav = NativeStackNavigationProp<BookingsStackParamList, 'Walkin'>;

export function Walkin() {
  const nav = useNavigation<Nav>();
  return (
    <ScreenPlaceholder
      title="Walk-in queue"
      subtitle="Token #07 · 3rd in line · ~22 min"
      role="Customer"
      routeName="Walkin"
      nextSteps={[
        {
          label: 'Done · Rate the experience',
          variant: 'gold',
          onPress: () => {
            nav.navigate('RateExperience', { bookingId: 'BB-WLK-6001' });
          },
        },
      ]}
    />
  );
}
