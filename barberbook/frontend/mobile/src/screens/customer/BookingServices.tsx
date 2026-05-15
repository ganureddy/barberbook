import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';

import { useServicesForShop } from '../../api/hooks';
import type { DiscoverStackParamList } from '../../navigation/types';
import { useBookingDraftStore } from '../../store/useBookingDraftStore';
import { ScreenPlaceholder } from '../_components/ScreenPlaceholder';

type Nav = NativeStackNavigationProp<DiscoverStackParamList, 'BookingServices'>;
type Rt = RouteProp<DiscoverStackParamList, 'BookingServices'>;

export function BookingServices() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const startForShop = useBookingDraftStore((s) => s.startForShop);
  const draftServices = useBookingDraftStore((s) => s.services);
  const servicesQ = useServicesForShop(params.shopId);

  useEffect(() => {
    startForShop(params.shopId);
  }, [params.shopId, startForShop]);

  return (
    <ScreenPlaceholder
      title="Pick services"
      subtitle={
        servicesQ.data
          ? `${servicesQ.data.length} services available · ${draftServices.length} selected`
          : 'Loading…'
      }
      role="Customer"
      routeName="BookingServices"
      params={params}
      nextSteps={[
        {
          label: 'Continue → Choose barber',
          variant: 'red',
          onPress: () => {
            nav.navigate('BookingBarbers', { shopId: params.shopId });
          },
        },
      ]}
    />
  );
}
