import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';

import type { DiscoverStackParamList } from '../../navigation/types';
import { ScreenPlaceholder } from '../_components/ScreenPlaceholder';

type Nav = NativeStackNavigationProp<DiscoverStackParamList, 'RateExperience'>;
type Rt = RouteProp<DiscoverStackParamList, 'RateExperience'>;

export function RateExperience() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  return (
    <ScreenPlaceholder
      title="How was it?"
      subtitle="Tap a star, drop a line."
      role="Customer"
      routeName="RateExperience"
      params={params}
      nextSteps={[
        {
          label: 'Submit ★ ★ ★ ★ ★',
          variant: 'red',
          onPress: () => {
            nav.goBack();
          },
        },
        {
          label: 'Skip',
          variant: 'ghost',
          onPress: () => {
            nav.goBack();
          },
        },
      ]}
    />
  );
}
