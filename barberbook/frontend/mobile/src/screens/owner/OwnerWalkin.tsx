import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';

import type { TodayStackParamList } from '../../navigation/types';
import { ScreenPlaceholder } from '../_components/ScreenPlaceholder';

type Nav = NativeStackNavigationProp<TodayStackParamList, 'OwnerWalkin'>;

export function OwnerWalkin() {
  const nav = useNavigation<Nav>();
  return (
    <ScreenPlaceholder
      title="Walk-in queue"
      subtitle="Call next, mark done, hold a chair."
      role="Owner"
      routeName="OwnerWalkin"
      nextSteps={[
        {
          label: 'Back to Today',
          variant: 'primary',
          onPress: () => {
            nav.goBack();
          },
        },
      ]}
    />
  );
}
