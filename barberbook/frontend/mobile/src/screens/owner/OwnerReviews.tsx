import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';

import type { ShopStackParamList } from '../../navigation/types';
import { ScreenPlaceholder } from '../_components/ScreenPlaceholder';

type Nav = NativeStackNavigationProp<ShopStackParamList, 'OwnerReviews'>;

export function OwnerReviews() {
  const nav = useNavigation<Nav>();
  return (
    <ScreenPlaceholder
      title="Shop & reviews"
      subtitle="Reply to reviews · Manage shop profile"
      role="Owner"
      routeName="OwnerReviews"
      nextSteps={[
        {
          label: 'Re-run shop signup',
          variant: 'primary',
          onPress: () => {
            nav.navigate('OwnerSignup');
          },
        },
        {
          label: 'Re-upload KYC',
          variant: 'gold',
          onPress: () => {
            nav.navigate('OwnerKYC');
          },
        },
      ]}
    />
  );
}
