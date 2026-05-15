import React from 'react';

import { ScreenPlaceholder } from '../_components/ScreenPlaceholder';

export function OwnerMoney() {
  return (
    <ScreenPlaceholder
      title="Money"
      subtitle="Today's takings · Last payout · Pending settlements"
      role="Owner"
      routeName="OwnerMoney"
    />
  );
}
