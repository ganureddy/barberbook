import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';

import type { RosterStackParamList } from '../../navigation/types';
import { ScreenPlaceholder } from '../_components/ScreenPlaceholder';

type Nav = NativeStackNavigationProp<RosterStackParamList, 'OwnerRoster'>;

export function OwnerRoster() {
  const nav = useNavigation<Nav>();
  return (
    <ScreenPlaceholder
      title="Weekly roster"
      subtitle="Drag barbers onto seats, by shift, by day."
      role="Owner"
      routeName="OwnerRoster"
      nextSteps={[
        {
          label: 'Resolve conflicts →',
          variant: 'red',
          onPress: () => {
            nav.navigate('OwnerRosterConflict', { rosterName: 'BB-ROS-4001' });
          },
        },
        {
          label: 'Manage seats',
          variant: 'primary',
          onPress: () => {
            nav.navigate('OwnerSeats');
          },
        },
      ]}
    />
  );
}
