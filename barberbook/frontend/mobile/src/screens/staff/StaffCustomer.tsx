import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';

import type { StaffStackParamList } from '../../navigation/types';
import { ScreenPlaceholder } from '../_components/ScreenPlaceholder';

type Nav = NativeStackNavigationProp<StaffStackParamList, 'StaffCustomer'>;
type Rt = RouteProp<StaffStackParamList, 'StaffCustomer'>;

export function StaffCustomer() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  return (
    <ScreenPlaceholder
      title="Customer profile"
      subtitle="Last visit, preferences, notes you wrote."
      role="Staff"
      routeName="StaffCustomer"
      params={params}
      nextSteps={[
        {
          label: 'Back to service',
          variant: 'primary',
          onPress: () => {
            nav.goBack();
          },
        },
      ]}
    />
  );
}
