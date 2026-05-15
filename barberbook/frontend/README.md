# BarberBook · Frontend Workspace

This directory holds the BarberBook client-side codebase that ships alongside
the Frappe app `barberbook`. It is a multi-package workspace:

```
frontend/
  mobile/   # Expo (React Native) — Customer / Owner / Staff apps in one binary
  ui/       # (planned) shared design-system primitives (Btn, Chip, Tag, BarberPole…)
  api/      # (planned) shared Frappe REST/RPC client + typed DocType wrappers
```

The Frappe Python app under `apps/barberbook/barberbook/` is the source of
truth for DocTypes, business logic, and APIs. The mobile app talks to it over
HTTP (`/api/method/...`, `/api/resource/...`).

## Getting started

```bash
cd apps/barberbook/barberbook/frontend
yarn install            # or: pnpm install
yarn mobile:dev         # equivalent to: cd mobile && yarn start
```

See [`mobile/README.md`](./mobile/README.md) for app-specific commands.

## Workspace tooling

- Yarn 1 workspaces (`package.json`) and `pnpm-workspace.yaml` are both
  declared so you can use whichever package manager you prefer.
- React Native / Expo / Metro packages are explicitly **not hoisted** out of
  `mobile/`. Metro's resolver assumes its dependencies live in the project's
  own `node_modules/`; hoisting them up the tree breaks dev builds.
