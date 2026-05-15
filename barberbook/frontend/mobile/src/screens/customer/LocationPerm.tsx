import React from 'react';

import { useAuthStore } from '../../store/useAuthStore';
import { useLocationStore } from '../../store/useLocationStore';
import { ScreenPlaceholder } from '../_components/ScreenPlaceholder';

export function LocationPerm() {
  const setDevRole = useAuthStore((s) => s.setDevRole);
  const setPermission = useLocationStore((s) => s.setPermission);

  return (
    <ScreenPlaceholder
      title="Find shops near you"
      subtitle="We'll only use your location to show nearby chairs."
      role="Onboarding"
      routeName="LocationPerm"
      nextSteps={[
        {
          label: 'Allow location → enter app',
          variant: 'red',
          onPress: () => {
            setPermission('granted');
            setDevRole('Customer');
          },
        },
        {
          label: 'Not now',
          variant: 'ghost',
          onPress: () => {
            setPermission('denied');
            setDevRole('Customer');
          },
        },
      ]}
    />
  );
}
