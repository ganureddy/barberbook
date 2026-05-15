import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';

import type { OnboardingStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/useAuthStore';
import { ScreenPlaceholder } from '../_components/ScreenPlaceholder';

type Nav = NativeStackNavigationProp<OnboardingStackParamList, 'OtpVerify'>;
type Rt = RouteProp<OnboardingStackParamList, 'OtpVerify'>;

export function OtpVerify() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const setDevRole = useAuthStore((s) => s.setDevRole);

  return (
    <ScreenPlaceholder
      title="Verify"
      subtitle={`Enter the 6-digit code sent to ${params.phone}.`}
      role="Onboarding"
      routeName="OtpVerify"
      params={params}
      nextSteps={[
        {
          label: 'Continue (mock OTP 4242) →',
          variant: 'red',
          onPress: () => {
            nav.navigate('LocationPerm');
          },
        },
        {
          label: 'Skip · land directly as Customer',
          variant: 'ghost',
          onPress: () => {
            setDevRole('Customer');
          },
        },
      ]}
    />
  );
}
