import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';

import type { ShopStackParamList } from '../../navigation/types';
import { ScreenPlaceholder } from '../_components/ScreenPlaceholder';

type Nav = NativeStackNavigationProp<ShopStackParamList, 'OwnerKYC'>;

export function OwnerKYC() {
  const nav = useNavigation<Nav>();
  return (
    <ScreenPlaceholder
      title="Verify identity"
      subtitle="GST · PAN · Bank account · Owner photo"
      role="Owner"
      routeName="OwnerKYC"
      nextSteps={[
        {
          label: 'Submit for review',
          variant: 'red',
          onPress: () => {
            nav.goBack();
          },
        },
      ]}
    />
  );
}
