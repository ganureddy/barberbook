# `@barberbook/mobile`

Expo (SDK 54, React Native 0.81, React 19, TS strict) client for BarberBook.
Designed to ship the **Customer**, **Owner**, and **Barber Staff** experiences
from a single binary, with a Web Admin Panel handled separately on the Frappe
side.

## Status

This package is currently a scaffold:

- App identity is configured (`app.json`: `BarberBook` / slug `barberbook` /
  scheme `barberbook` / bundle id `app.barberbook.client` on both platforms).
- Brand design tokens from the canvas (palette, type stack, radii, spacing,
  shadows) are in [`src/theme/tokens.ts`](./src/theme/tokens.ts).
- Production-grade dependencies are installed: `@react-navigation/*`,
  `react-native-screens`, `react-native-safe-area-context`, `expo-router`,
  `zustand`, `@tanstack/react-query`, `axios`, `react-native-mmkv`,
  `expo-localization`, `i18next`, `react-i18next`, `react-native-reanimated`
  (+ `react-native-worklets`), `react-native-gesture-handler`, `expo-haptics`,
  `expo-secure-store`.
- ESLint (`eslint-config-universe/native` + `shared/typescript-analysis`) and
  Prettier are wired into the package scripts.
- Metro bundles successfully on both iOS and Android (verified with
  `npx expo export`).

The screens themselves (the 39 frames from the canvas) land in subsequent
commits.

## Scripts

```bash
yarn start         # expo start
yarn ios           # expo start --ios
yarn android       # expo start --android
yarn lint          # eslint . --ext .ts,.tsx --max-warnings=0
yarn lint:fix
yarn typecheck     # tsc --noEmit
yarn format        # prettier --write
yarn format:check
```

Or use the parent `Makefile` (`make mobile-dev`, etc.) from `apps/barberbook/`.

## Project layout (planned)

```
mobile/
├── App.tsx              # entry; wires providers + nav once ready
├── app.json             # Expo config
├── src/
│   ├── theme/           # design tokens (✅ in place)
│   ├── lib/             # api client, storage, i18n, hooks (planned)
│   ├── navigation/      # role-based nav stacks (planned)
│   └── features/        # one folder per canvas section (customer, owner, staff)
└── assets/              # icons, splash, fonts
```

## TS path aliases

```ts
import { palette } from '@theme/tokens';   // → src/theme/tokens.ts
import { api } from '@lib/api';            // → src/lib/api.ts (planned)
import { Btn } from '@/components/Btn';    // → src/components/Btn.tsx (planned)
```
