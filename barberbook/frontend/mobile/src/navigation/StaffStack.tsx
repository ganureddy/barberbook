import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { BarberProfile } from '../screens/staff/BarberProfile';
import { StaffCustomer } from '../screens/staff/StaffCustomer';
import { StaffEarnings } from '../screens/staff/StaffEarnings';
import { StaffInService } from '../screens/staff/StaffInService';
import { StaffSchedule } from '../screens/staff/StaffSchedule';

import type { StaffStackParamList } from './types';

const Stack = createNativeStackNavigator<StaffStackParamList>();

/**
 * Staff app intentionally has NO tab bar — the canvas brief calls for
 * "the least-distracted barber app". The day collapses into one
 * navigation thread: Schedule (today's lineup) is the home, and screens
 * push on top during a service.
 */
export function StaffStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerTitleStyle: { fontFamily: 'Manrope_700Bold' },
      }}
    >
      <Stack.Screen
        name="StaffSchedule"
        component={StaffSchedule}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="StaffInService"
        component={StaffInService}
        options={{ title: 'In service' }}
      />
      <Stack.Screen
        name="StaffCustomer"
        component={StaffCustomer}
        options={{ title: 'Customer' }}
      />
      <Stack.Screen
        name="StaffEarnings"
        component={StaffEarnings}
        options={{ title: 'Earnings' }}
      />
      <Stack.Screen name="StaffProfile" component={BarberProfile} options={{ title: 'Profile' }} />
    </Stack.Navigator>
  );
}
