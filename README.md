# BarberBook

Mobile-first barber-shop booking platform. Three client apps (customer, owner,
barber staff) plus a web admin panel, all backed by a single Frappe app.

```
apps/barberbook/
├── barberbook/                 # Frappe Python app (DocTypes, hooks, REST/RPC)
│   ├── hooks.py                # ← do not touch from the mobile side
│   ├── public/, www/, ...
│   └── frontend/               # ← mobile + future ui/ + api/ packages live here
│       ├── package.json        # yarn workspaces root
│       ├── pnpm-workspace.yaml
│       └── mobile/             # Expo (RN, TS) — Customer / Owner / Staff in one binary
└── Makefile                    # `make mobile-dev`, `make mobile-lint`, etc.
```

## 1. Frappe site (backend)

Standard `bench` workflow from your bench root:

```bash
cd $PATH_TO_YOUR_BENCH
bench get-app barberbook /path/to/this/repo --branch develop   # first time only
bench --site <your-site> install-app barberbook
bench start                                                    # Frappe + Redis + workers
```

The Frappe site typically serves on `http://<your-site>:8000` (or whatever you
configured in `sites/<your-site>/site_config.json`).

## 2. Mobile app (Expo / React Native)

The mobile client lives at `barberbook/frontend/mobile/` and is wired into
yarn workspaces under `barberbook/frontend/`. From the `apps/barberbook/`
directory, use the Makefile:

```bash
# one-time install
make mobile-install

# start Metro (Expo dev server) — scan the QR with Expo Go,
# or hit `i` for iOS simulator / `a` for Android emulator
make mobile-dev

# native shells
make mobile-ios
make mobile-android

# quality gates
make mobile-typecheck
make mobile-lint
```

### Pointing the app at your local Frappe site

The mobile app reads the Frappe base URL from `EXPO_PUBLIC_FRAPPE_SITE_URL`
(public Expo env vars are inlined into the JS bundle at build time). For a
local bench:

```bash
# from apps/barberbook/barberbook/frontend/mobile
echo 'EXPO_PUBLIC_FRAPPE_SITE_URL=http://<your-lan-ip>:8000' > .env.local
make -C ../../.. mobile-dev
```

Use your machine's LAN IP (not `localhost`) so the simulator and physical
devices on Expo Go can reach the bench. The exact API client wiring lands in
a follow-up commit (see `frontend/api/`).

## 3. Design system

The mobile app's design tokens (colors, type stack, radii, shadows) live in
`barberbook/frontend/mobile/src/theme/tokens.ts` and are derived from the
BarberBook brand canvas:

- Palette: red `#D4322C`, navy `#1E3A8A`, cream `#F5F1E8`, ink `#0E0E10`, gold `#C9A24C`
- Type: Anton (display), DM Serif Display (editorial), Manrope (body), JetBrains Mono (numeric)
- Radii: 6 / 10 / 16 / pill
- Tagline: *"The chair is waiting."*

## 4. Repository hygiene

This app uses `pre-commit` for code formatting and linting on the Python side.
[Install pre-commit](https://pre-commit.com/#installation) and enable it:

```bash
cd apps/barberbook
pre-commit install
```

Pre-commit covers: ruff, eslint, prettier, pyupgrade.

## 5. CI

GitHub Actions:

- **CI** — installs the Frappe app and runs unit tests on every push to `develop`.
- **Linters** — runs [Frappe Semgrep Rules](https://github.com/frappe/semgrep-rules) and [pip-audit](https://pypi.org/project/pip-audit/) on every PR.

## License

MIT
