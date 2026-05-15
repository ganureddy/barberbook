import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';

import { useBarbersForShop } from '../../api/hooks';
import type { DiscoverStackParamList } from '../../navigation/types';
import { ScreenPlaceholder } from '../_components/ScreenPlaceholder';

type Nav = NativeStackNavigationProp<DiscoverStackParamList, 'ShopBarbersTab'>;
type Rt = RouteProp<DiscoverStackParamList, 'ShopBarbersTab'>;

export function ShopBarbersTab() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const barbersQ = useBarbersForShop(params.id);

  return (
    <ScreenPlaceholder
      title="Barbers"
      subtitle={
        barbersQ.data
          ? `${barbersQ.data.length} barber${barbersQ.data.length === 1 ? '' : 's'} on staff`
          : 'Loading…'
      }
      role="Customer"
      routeName="ShopBarbersTab"
      params={params}
      nextSteps={[
        {
          label: 'Back to shop',
          variant: 'primary',
          onPress: () => {
            nav.goBack();
          },
        },
        {
          label: 'See reviews',
          variant: 'ghost',
          onPress: () => {
            nav.navigate('ShopReviewsTab', { id: params.id });
          },
        },
      ]}
    />
  );
}
