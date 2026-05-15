import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';

import type { DiscoverStackParamList } from '../../navigation/types';
import { ScreenPlaceholder } from '../_components/ScreenPlaceholder';

type Nav = NativeStackNavigationProp<DiscoverStackParamList, 'BookingTime'>;
type Rt = RouteProp<DiscoverStackParamList, 'BookingTime'>;

export function BookingTime() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  return (
    <ScreenPlaceholder
      title="Pick a time"
      subtitle="Today, tomorrow, or any of the next 14 days."
      role="Customer"
      routeName="BookingTime"
      params={params}
      nextSteps={[
        {
          label: 'Continue → Pay',
          variant: 'red',
          onPress: () => {
            nav.navigate('BookingPay', { shopId: params.shopId });
          },
        },
        {
          label: 'Back',
          variant: 'ghost',
          onPress: () => {
            nav.goBack();
          },
        },
      ]}
    />
  );
}
