import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';

import type { StaffStackParamList } from '../../navigation/types';
import { ScreenPlaceholder } from '../_components/ScreenPlaceholder';

type Nav = NativeStackNavigationProp<StaffStackParamList, 'StaffInService'>;
type Rt = RouteProp<StaffStackParamList, 'StaffInService'>;

export function StaffInService() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  return (
    <ScreenPlaceholder
      title="In service"
      subtitle="Customer · service · timer · last-visit notes."
      role="Staff"
      routeName="StaffInService"
      params={params}
      nextSteps={[
        {
          label: "View customer's profile",
          variant: 'primary',
          onPress: () => {
            nav.navigate('StaffCustomer', { customerId: 'arya@barberbook.app' });
          },
        },
        {
          label: 'Mark complete',
          variant: 'red',
          onPress: () => {
            nav.popToTop();
          },
        },
      ]}
    />
  );
}
