import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';

import { useReviewsForShop } from '../../api/hooks';
import type { DiscoverStackParamList } from '../../navigation/types';
import { ScreenPlaceholder } from '../_components/ScreenPlaceholder';

type Nav = NativeStackNavigationProp<DiscoverStackParamList, 'ShopReviewsTab'>;
type Rt = RouteProp<DiscoverStackParamList, 'ShopReviewsTab'>;

export function ShopReviewsTab() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const reviewsQ = useReviewsForShop(params.id);

  return (
    <ScreenPlaceholder
      title="Reviews"
      subtitle={reviewsQ.data ? `${reviewsQ.data.length} review(s)` : 'Loading…'}
      role="Customer"
      routeName="ShopReviewsTab"
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
          label: 'See barbers',
          variant: 'ghost',
          onPress: () => {
            nav.navigate('ShopBarbersTab', { id: params.id });
          },
        },
      ]}
    />
  );
}
