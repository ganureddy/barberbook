import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';

import type { OnboardingStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/useAuthStore';
import { ScreenPlaceholder } from '../_components/ScreenPlaceholder';

type Nav = NativeStackNavigationProp<OnboardingStackParamList, 'RoleSelect'>;

export function RoleSelect() {
  const nav = useNavigation<Nav>();
  const setDevRole = useAuthStore((s) => s.setDevRole);

  return (
    <ScreenPlaceholder
      title="Who are you?"
      subtitle="Pick a role to continue."
      role="Onboarding"
      routeName="RoleSelect"
      nextSteps={[
        {
          label: "I'm a customer →",
          variant: 'red',
          onPress: () => {
            nav.navigate('PhoneEntry');
          },
        },
        {
          label: 'I run a shop',
          variant: 'primary',
          onPress: () => {
            setDevRole('Owner');
          },
        },
        {
          label: "I'm a barber on staff",
          variant: 'gold',
          onPress: () => {
            setDevRole('Staff');
          },
        },
      ]}
    />
  );
}
