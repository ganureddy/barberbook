import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';

import type { DiscoverStackParamList } from '../../navigation/types';
import { ScreenPlaceholder } from '../_components/ScreenPlaceholder';

type Nav = NativeStackNavigationProp<DiscoverStackParamList, 'DiscoveryMap'>;

export function DiscoveryMap() {
  const nav = useNavigation<Nav>();
  return (
    <ScreenPlaceholder
      title="Map view"
      subtitle="Pins for every nearby chair."
      role="Customer"
      routeName="DiscoveryMap"
      nextSteps={[
        {
          label: 'Back to list',
          variant: 'primary',
          onPress: () => {
            nav.goBack();
          },
        },
        {
          label: "Open Raj's Classic Cuts →",
          variant: 'red',
          onPress: () => {
            nav.navigate('ShopDetail', { id: 'BB-SHOP-00001' });
          },
        },
      ]}
    />
  );
}
