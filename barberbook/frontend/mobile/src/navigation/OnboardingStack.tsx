import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { LocationPerm } from '../screens/customer/LocationPerm';
import { OtpVerify } from '../screens/customer/OtpVerify';
import { PhoneEntry } from '../screens/customer/PhoneEntry';
import { RoleSelect } from '../screens/customer/RoleSelect';
import { Splash } from '../screens/customer/Splash';

import type { OnboardingStackParamList } from './types';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

/**
 * Pre-auth flow. Always starts at Splash. Each step calls into useAuthStore
 * (or, for the bypass path, setDevRole) when complete; the root navigator
 * swaps to the appropriate role tree on the next render.
 */
export function OnboardingStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen name="Splash" component={Splash} />
      <Stack.Screen name="RoleSelect" component={RoleSelect} />
      <Stack.Screen name="PhoneEntry" component={PhoneEntry} />
      <Stack.Screen name="OtpVerify" component={OtpVerify} />
      <Stack.Screen name="LocationPerm" component={LocationPerm} />
    </Stack.Navigator>
  );
}
