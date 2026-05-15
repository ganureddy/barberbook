import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';

import type { RosterStackParamList } from '../../navigation/types';
import { ScreenPlaceholder } from '../_components/ScreenPlaceholder';

type Nav = NativeStackNavigationProp<RosterStackParamList, 'OwnerSeats'>;

export function OwnerSeats() {
  const nav = useNavigation<Nav>();
  return (
    <ScreenPlaceholder
      title="Seats & barbers"
      subtitle="2 chairs · 2 barbers active."
      role="Owner"
      routeName="OwnerSeats"
      nextSteps={[
        {
          label: 'Back to roster',
          variant: 'primary',
          onPress: () => {
            nav.goBack();
          },
        },
      ]}
    />
  );
}
