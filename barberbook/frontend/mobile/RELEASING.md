# Releasing the BarberBook mobile app

This is the operational runbook. Anyone with `EXPO_TOKEN` and bench SSH
access should be able to ship a release end-to-end by following it.

## TL;DR

- Push to `main` → preview build + staging migrate (automated).
- Tag `mobile-v1.2.3` → production build, store submission, prod migrate.
- Hotfix copy / image only? Use OTA: `eas update --channel production`.

---

## 0. Prerequisites (one-time)

| Item                              | Where it lives                                     |
| --------------------------------- | -------------------------------------------------- |
| `EXPO_TOKEN`                      | GitHub Actions secrets (org-level, scope `mobile`) |
| `SENTRY_DSN_STAGING` / `…_PROD`   | GitHub Actions secrets                             |
| `BENCH_SSH_KEY` (deploy keypair)  | GitHub Actions secrets                             |
| `STAGING_SSH_HOST` / `PROD_SSH_HOST` | `user@host` for the bench box                   |
| `ASC_APP_ID` / `APPLE_TEAM_ID`    | App Store Connect, set in eas.json submit.* env    |
| `google-play-service-account.json` | Encrypted file delivered via EAS secrets          |
| EAS project id                    | `app.json` → `expo.extra.eas.projectId`            |
| Expo Updates URL                  | `app.json` → `expo.updates.url`                    |

Both `projectId` and `updates.url` are placeholders today
(`00000000-…`). Set them once with:

```bash
eas init                       # creates the project + writes IDs back
eas update:configure           # wires EAS Update + sets the URL
```

## 1. Daily flow — preview channel

Every push to `main` that touches `frontend/mobile/**` triggers the
`mobile-build.yml` workflow. It runs three jobs in sequence:

1. **`ci`** — typecheck, lint, jest. Fast (~3 min). Blocks the rest.
2. **`build`** — `eas build --profile preview --platform all`.
   - iOS: `.ipa` for internal distribution (TestFlight invitees).
   - Android: `.apk` for direct install.
3. **`backend-migrate`** — SSHes into the staging bench box and runs
   `bench --site staging.barberbook.app migrate && clear-cache &&
   restart`. This applies any new BB DocTypes / fixtures.

Internal QA installs the build via [the EAS dashboard](https://expo.dev)
or the email link. There is no AppStore review on this path.

## 2. Production release

```bash
# 1. Bump version + buildNumber + versionCode.
cd frontend/mobile
node -e "let p=require('./package.json');p.version='1.0.0';require('fs').writeFileSync('./package.json', JSON.stringify(p,null,2)+'\n')"
# (also bump app.json:expo.version, ios.buildNumber, android.versionCode)

# 2. Commit + tag.
git add -A
git commit -m "release(mobile): v1.0.0"
git tag -s mobile-v1.0.0 -m "BarberBook mobile v1.0.0"
git push origin main mobile-v1.0.0
```

The `mobile-v*` tag triggers `mobile-build.yml`'s production path:

| Stage           | What happens                                                |
| --------------- | ----------------------------------------------------------- |
| `ci`            | Same gate as preview.                                       |
| `build`         | `eas build --profile production --platform all`. iOS = IPA, Android = AAB. |
| Submit step     | `eas submit --profile production --latest`. Uploads to ASC + Play. |
| `backend-migrate` | Runs `bench migrate` on the prod bench box.               |

**Manual after the workflow finishes:**

1. Open the build in App Store Connect → "Add to TestFlight + submit
   for review". (We mark releases as `releaseStatus=draft` so the
   build never publishes without a human pressing "Release".)
2. Open the release in Play Console → "Send for review" on the
   `production` track.
3. Update the [Release Notes](https://exp.host/@barberbook/barberbook/releases)
   document for the customer-facing changelog.

## 3. Hotfixes (OTA)

If the change is JS-only — copy fix, layout tweak, server URL — use EAS
Update instead of a full store release:

```bash
cd frontend/mobile
eas update --channel production --message "Hotfix: walk-in ETA copy"
```

The update lands on every device on the same `runtimeVersion` within
seconds. If the hotfix needs native code (new permission, new module),
you must do a full release per §2.

## 4. Rollback

- **OTA**: `eas update:rollback --channel production` reverts to the
  previous published update.
- **Native**: in App Store Connect / Play Console, expedite a re-review
  of the previous tag (re-run `eas submit --id <previous-build-id>`).

## 5. Backend coupling

The backend ships **with** the mobile release because new screens
expect new DocTypes / API endpoints. The workflow runs `bench migrate`
automatically; if the migrate fails it leaves the app pointing at the
older API and the new mobile build will hit `404` on the new methods.

If the migrate must run **before** the build (rare — only when a new
DocType is required for a server-rendered admin screen), trigger
manually:

```bash
ssh user@bench-host "cd ~/frappe-bench && bench --site app.barberbook.app migrate"
# wait for the prod bench to settle, then push the tag.
```

## 6. Dev-loop without EAS

Engineers don't need EAS to develop:

```bash
cd frontend/mobile
cp .env.example .env.local             # set EXPO_PUBLIC_FRAPPE_URL etc.
npm ci
npm start                              # opens Expo Go / dev client
```

`EXPO_PUBLIC_MOCK=1` short-circuits the API layer to in-process
fixtures so you can iterate before the backend is reachable.
