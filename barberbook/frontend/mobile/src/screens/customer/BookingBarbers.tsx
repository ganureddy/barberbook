import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';

import type { DiscoverStackParamList } from '../../navigation/types';
import { ScreenPlaceholder } from '../_components/ScreenPlaceholder';

type Nav = NativeStackNavigationProp<DiscoverStackParamList, 'BookingBarbers'>;
type Rt = RouteProp<DiscoverStackParamList, 'BookingBarbers'>;

export function BookingBarbers() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  return (
    <ScreenPlaceholder
      title="Pick a barber"
      subtitle="Or let any free barber take you."
      role="Customer"
      routeName="BookingBarbers"
      params={params}
      nextSteps={[
        {
          label: 'Continue → Pick time',
          variant: 'red',
          onPress: () => {
            nav.navigate('BookingTime', { shopId: params.shopId });
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
