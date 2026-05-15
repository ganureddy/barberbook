import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';

import { useShop } from '../../api/hooks';
import type { DiscoverStackParamList } from '../../navigation/types';
import { ScreenPlaceholder } from '../_components/ScreenPlaceholder';

type Nav = NativeStackNavigationProp<DiscoverStackParamList, 'ShopDetail'>;
type Rt = RouteProp<DiscoverStackParamList, 'ShopDetail'>;

export function ShopDetail() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const shopQ = useShop(params.id);

  return (
    <ScreenPlaceholder
      title={shopQ.data?.shop_name ?? 'Shop'}
      subtitle={
        shopQ.data
          ? `${shopQ.data.city} · ★${shopQ.data.rating.toFixed(1)} (${shopQ.data.rating_count})`
          : 'Loading…'
      }
      role="Customer"
      routeName="ShopDetail"
      params={params}
      nextSteps={[
        {
          label: 'Book a chair →',
          variant: 'red',
          onPress: () => {
            nav.navigate('BookingServices', { shopId: params.id });
          },
        },
        {
          label: 'View barbers',
          variant: 'primary',
          onPress: () => {
            nav.navigate('ShopBarbersTab', { id: params.id });
          },
        },
        {
          label: 'View reviews',
          variant: 'cream',
          onPress: () => {
            nav.navigate('ShopReviewsTab', { id: params.id });
          },
        },
      ]}
    />
  );
}
