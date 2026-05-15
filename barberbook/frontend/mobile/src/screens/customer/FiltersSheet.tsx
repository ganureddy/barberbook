import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';

import type { DiscoverStackParamList } from '../../navigation/types';
import { ScreenPlaceholder } from '../_components/ScreenPlaceholder';

type Nav = NativeStackNavigationProp<DiscoverStackParamList, 'FiltersSheet'>;

export function FiltersSheet() {
  const nav = useNavigation<Nav>();
  return (
    <ScreenPlaceholder
      title="Filters"
      subtitle="Open now · Walk-in · Service · Distance · Rating"
      role="Customer"
      routeName="FiltersSheet"
      nextSteps={[
        {
          label: 'Apply filters',
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
