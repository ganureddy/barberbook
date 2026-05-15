import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';

import type { MenuStackParamList } from '../../navigation/types';
import { ScreenPlaceholder } from '../_components/ScreenPlaceholder';

type Nav = NativeStackNavigationProp<MenuStackParamList, 'OwnerAddService'>;
type Rt = RouteProp<MenuStackParamList, 'OwnerAddService'>;

export function OwnerAddService() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  return (
    <ScreenPlaceholder
      title={params?.serviceName ? 'Edit service' : 'Add service'}
      subtitle="Name · category · duration · price"
      role="Owner"
      routeName="OwnerAddService"
      params={params}
      nextSteps={[
        {
          label: 'Save service',
          variant: 'red',
          onPress: () => {
            nav.goBack();
          },
        },
        {
          label: 'Cancel',
          variant: 'ghost',
          onPress: () => {
            nav.goBack();
          },
        },
      ]}
    />
  );
}
