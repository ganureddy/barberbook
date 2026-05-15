import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';

import type { MenuStackParamList } from '../../navigation/types';
import { ScreenPlaceholder } from '../_components/ScreenPlaceholder';

type Nav = NativeStackNavigationProp<MenuStackParamList, 'OwnerMenu'>;

export function OwnerMenu() {
  const nav = useNavigation<Nav>();
  return (
    <ScreenPlaceholder
      title="Service menu"
      subtitle="Hair · Beard · Color · Spa · Combo"
      role="Owner"
      routeName="OwnerMenu"
      nextSteps={[
        {
          label: 'Add a service →',
          variant: 'red',
          onPress: () => {
            nav.navigate('OwnerAddService', {});
          },
        },
      ]}
    />
  );
}
