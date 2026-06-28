import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useMyBarberWorkspaces } from '../api/hooks';
import { useTheme } from '../design/ThemeProvider';
import { palette } from '../design/tokens';
import { BarberOnboard } from '../screens/staff/BarberOnboard';
import { BarberShops } from '../screens/staff/BarberShops';
import { useAuthStore } from '../store/useAuthStore';
import { useWorkspaceStore } from '../store/useWorkspaceStore';

import { StaffStack } from './StaffStack';
import type { StaffRootStackParamList } from './types';

const Stack = createNativeStackNavigator<StaffRootStackParamList>();

/**
 * Staff entry gate. A barber can work in zero, one, or many shops, so before
 * the schedule mounts we resolve `my_shops` (the barber's workspaces) and pick
 * the landing:
 *
 *   - no shops              → BarberOnboard (profile + pick shops + hours)
 *   - shops, none active    → BarberShops (pick which to work from)
 *   - shops + active        → StaffHome (the schedule, scoped to selection)
 */
export function StaffRoot() {
  const phone = useAuthStore((s) => s.user?.phone);
  const workspacesQ = useMyBarberWorkspaces(phone);
  const activeBarberId = useWorkspaceStore((s) => s.activeBarberId);

  const initialRouteName = useMemo<keyof StaffRootStackParamList>(() => {
    const ws = workspacesQ.data ?? [];
    if (ws.length === 0) return 'BarberOnboard';
    const valid = activeBarberId != null && ws.some((w) => w.barber === activeBarberId);
    return valid ? 'StaffHome' : 'BarberShops';
  }, [workspacesQ.data, activeBarberId]);

  if (workspacesQ.isLoading && !workspacesQ.data) {
    return <GateSplash />;
  }

  return (
    <Stack.Navigator
      key={`staff-root:${initialRouteName}`}
      initialRouteName={initialRouteName}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="BarberShops" component={BarberShops} />
      <Stack.Screen name="BarberOnboard" component={BarberOnboard} />
      <Stack.Screen name="StaffHome" component={StaffStack} />
    </Stack.Navigator>
  );
}

function GateSplash() {
  const { theme } = useTheme();
  return (
    <View style={[styles.splash, { backgroundColor: theme.bg }]}>
      <ActivityIndicator color={palette.red} />
    </View>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
