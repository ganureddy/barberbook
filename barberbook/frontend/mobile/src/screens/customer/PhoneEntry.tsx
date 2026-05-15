import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';

import type { OnboardingStackParamList } from '../../navigation/types';
import { ScreenPlaceholder } from '../_components/ScreenPlaceholder';

type Nav = NativeStackNavigationProp<OnboardingStackParamList, 'PhoneEntry'>;

const DEMO_PHONE = '+91 98000 12345';

export function PhoneEntry() {
  const nav = useNavigation<Nav>();
  return (
    <ScreenPlaceholder
      title="Enter your phone"
      subtitle="We'll text you a 4-digit code."
      role="Onboarding"
      routeName="PhoneEntry"
      nextSteps={[
        {
          label: `Send OTP to ${DEMO_PHONE} →`,
          variant: 'red',
          onPress: () => {
            nav.navigate('OtpVerify', { phone: DEMO_PHONE });
          },
        },
      ]}
    />
  );
}
