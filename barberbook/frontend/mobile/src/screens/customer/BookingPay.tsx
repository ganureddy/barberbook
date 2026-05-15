import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';

import type { DiscoverStackParamList } from '../../navigation/types';
import { ScreenPlaceholder } from '../_components/ScreenPlaceholder';

type Nav = NativeStackNavigationProp<DiscoverStackParamList, 'BookingPay'>;
type Rt = RouteProp<DiscoverStackParamList, 'BookingPay'>;

export function BookingPay() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  return (
    <ScreenPlaceholder
      title="Pay & confirm"
      subtitle="UPI · Cards · Wallets · Pay at shop"
      role="Customer"
      routeName="BookingPay"
      params={params}
      nextSteps={[
        {
          label: 'Pay ₹500 → Confirm',
          variant: 'red',
          onPress: () => {
            nav.navigate('BookingSuccess', { bookingId: 'BB-BKG-5001' });
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
