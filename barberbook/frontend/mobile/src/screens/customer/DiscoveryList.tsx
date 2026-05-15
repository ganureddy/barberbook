import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';

import { useShops } from '../../api/hooks';
import type { DiscoverStackParamList } from '../../navigation/types';
import { ScreenPlaceholder } from '../_components/ScreenPlaceholder';

type Nav = NativeStackNavigationProp<DiscoverStackParamList, 'DiscoveryList'>;

export function DiscoveryList() {
  const nav = useNavigation<Nav>();
  const shopsQ = useShops();
  const firstShop = shopsQ.data?.[0];

  return (
    <ScreenPlaceholder
      title="Discover"
      subtitle="Find a barber near you, walk in like a regular."
      role="Customer"
      routeName="DiscoveryList"
      nextSteps={[
        {
          label: 'Open map view →',
          variant: 'primary',
          onPress: () => {
            nav.navigate('DiscoveryMap');
          },
        },
        {
          label: 'Open filters',
          variant: 'ghost',
          onPress: () => {
            nav.navigate('FiltersSheet');
          },
        },
        {
          label: firstShop
            ? `Open ${firstShop.shop_name} →`
            : shopsQ.isLoading
              ? 'Loading shops…'
              : 'No shops loaded',
          variant: 'red',
          onPress: () => {
            const id = firstShop?.name ?? 'BB-SHOP-00001';
            nav.navigate('ShopDetail', { id });
          },
        },
      ]}
    />
  );
}
