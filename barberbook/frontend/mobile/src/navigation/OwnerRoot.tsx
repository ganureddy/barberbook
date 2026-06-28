import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useMyShops } from '../api/hooks';
import { useTheme } from '../design/ThemeProvider';
import { palette } from '../design/tokens';
import { OwnerOnboard } from '../screens/owner/OwnerOnboard';
import { OwnerShops } from '../screens/owner/OwnerShops';
import { useWorkspaceStore } from '../store/useWorkspaceStore';

import { OwnerTabs } from './OwnerTabs';
import type { OwnerRootStackParamList } from './types';

const Stack = createNativeStackNavigator<OwnerRootStackParamList>();

/**
 * Owner entry gate. An owner can run zero, one, or many shops, so before the
 * tabbed dashboard mounts we resolve `my_shops` and pick the right landing:
 *
 *   - no shops          → OwnerOnboard (the full setup wizard)
 *   - shops, none active → OwnerShops (pick which one to manage)
 *   - shops + active     → OwnerHome (the dashboard, scoped to the selection)
 *
 * The picker and wizard stay registered so the dashboard can navigate back to
 * "switch shop" or "open another shop" at any time.
 */
export function OwnerRoot() {
  const myShopsQ = useMyShops();
  const activeShopId = useWorkspaceStore((s) => s.activeShopId);

  const initialRouteName = useMemo<keyof OwnerRootStackParamList>(() => {
    const shops = myShopsQ.data ?? [];
    if (shops.length === 0) return 'OwnerOnboard';
    const activeIsValid = activeShopId != null && shops.some((s) => s.shop.name === activeShopId);
    return activeIsValid ? 'OwnerHome' : 'OwnerShops';
  }, [myShopsQ.data, activeShopId]);

  if (myShopsQ.isLoading && !myShopsQ.data) {
    return <GateSplash />;
  }

  return (
    <Stack.Navigator
      // Re-key so the computed initial route applies once data has loaded.
      key={`owner-root:${initialRouteName}`}
      initialRouteName={initialRouteName}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="OwnerShops" component={OwnerShops} />
      <Stack.Screen name="OwnerOnboard" component={OwnerOnboard} />
      <Stack.Screen name="OwnerHome" component={OwnerTabs} />
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
