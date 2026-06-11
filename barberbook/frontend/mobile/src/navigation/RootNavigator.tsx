import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';

import { DevRoleSwitcher } from '../screens/dev/DevRoleSwitcher';
import { Showcase as ShowcaseScreen } from '../screens/dev/Showcase';
import { useAuthStore } from '../store/useAuthStore';

import { CustomerTabs } from './CustomerTabs';
import { OnboardingStack } from './OnboardingStack';
import { OwnerTabs } from './OwnerTabs';
import { StaffStack } from './StaffStack';
import type { RootStackParamList } from './types';

const Root = createNativeStackNavigator<RootStackParamList>();

/**
 * Top-level role-switched navigator. Decides which sub-tree mounts based on
 * `useAuthStore` (status + activeRole). The dev-only RoleSwitcher and
 * Showcase modals are always registered so they're reachable from any flow.
 *
 * Why a stack rather than separate `NavigationContainer`s per role:
 *   - Single deep-link/ linking config shared across roles.
 *   - DevRoleSwitcher can navigate from any flow to any other.
 *   - The role-switch is `Root.Group` re-mounting the nested navigator,
 *     which is much cheaper than tearing down NavigationContainer.
 */
export function RootNavigator() {
  const status = useAuthStore((s) => s.status);
  const role = useAuthStore((s) => s.activeRole);

  const initialRouteName = useMemo<keyof RootStackParamList>(() => {
    if (status !== 'authenticated' || !role) return 'Onboarding';
    if (role === 'Owner') return 'Owner';
    if (role === 'Staff') return 'Staff';
    return 'Customer';
  }, [status, role]);

  // `key` flips the entire stack when the role changes so RN doesn't try to
  // re-use a stack instance from a different flow.
  const navKey = `${status}:${role ?? 'none'}`;

  return (
    <Root.Navigator
      key={navKey}
      initialRouteName={initialRouteName}
      screenOptions={{ headerShown: false }}
    >
      {status !== 'authenticated' || !role ? (
        <Root.Screen name="Onboarding" component={OnboardingStack} />
      ) : role === 'Owner' ? (
        <Root.Screen name="Owner" component={OwnerTabs} />
      ) : role === 'Staff' ? (
        <Root.Screen name="Staff" component={StaffStack} />
      ) : (
        <Root.Screen name="Customer" component={CustomerTabs} />
      )}

      {/* Dev-only modals — always available, gated at render-time below. */}
      {__DEV__ && (
        <Root.Group screenOptions={{ presentation: 'modal' }}>
          <Root.Screen name="DevRoleSwitcher" component={DevRoleSwitcher} />
          <Root.Screen name="DevShowcase" component={DevShowcaseRoute} />
        </Root.Group>
      )}
    </Root.Navigator>
  );
}

/**
 * Adapter so the existing Showcase component (built earlier with an
 * imperative `onClose` prop) plays nicely with react-navigation. We pass
 * `goBack` as the close handler.
 */
function DevShowcaseRoute({ navigation }: { navigation: { goBack: () => void } }) {
  return (
    <ShowcaseScreen
      onClose={() => {
        navigation.goBack();
      }}
    />
  );
}
