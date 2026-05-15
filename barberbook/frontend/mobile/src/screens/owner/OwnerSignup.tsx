import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';

import type { ShopStackParamList } from '../../navigation/types';
import { ScreenPlaceholder } from '../_components/ScreenPlaceholder';

type Nav = NativeStackNavigationProp<ShopStackParamList, 'OwnerSignup'>;

export function OwnerSignup() {
  const nav = useNavigation<Nav>();
  return (
    <ScreenPlaceholder
      title="Register your shop"
      subtitle="Name, address, phone, hours."
      role="Owner"
      routeName="OwnerSignup"
      nextSteps={[
        {
          label: 'Continue → KYC',
          variant: 'red',
          onPress: () => {
            nav.navigate('OwnerKYC');
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
