import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';

import type { RosterStackParamList } from '../../navigation/types';
import { ScreenPlaceholder } from '../_components/ScreenPlaceholder';

type Nav = NativeStackNavigationProp<RosterStackParamList, 'OwnerRosterConflict'>;
type Rt = RouteProp<RosterStackParamList, 'OwnerRosterConflict'>;

export function OwnerRosterConflict() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  return (
    <ScreenPlaceholder
      title="Conflicts"
      subtitle="Two barbers on Seat 1, Wed 2-4pm. Pick one."
      role="Owner"
      routeName="OwnerRosterConflict"
      params={params}
      nextSteps={[
        {
          label: 'Keep first · drop second',
          variant: 'red',
          onPress: () => {
            nav.goBack();
          },
        },
        {
          label: 'Keep second · drop first',
          variant: 'primary',
          onPress: () => {
            nav.goBack();
          },
        },
      ]}
    />
  );
}
