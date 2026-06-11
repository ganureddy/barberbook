/**
 * Sentry crash reporting — currently disabled.
 *
 * The `@sentry/react-native` package was removed because:
 *   1. We never ship `EXPO_PUBLIC_SENTRY_DSN` for the preview channel,
 *      so the SDK was always a no-op at runtime.
 *   2. `@sentry/react-native@7.2.x` (the version Expo SDK 54 demands)
 *      autolinks a native module whose Android startup path is
 *      incompatible with our RN 0.81 / New-Architecture setup, causing
 *      the APK to crash at `Application.onCreate` *before* any JS runs.
 *      Symptom: "BarberBook keeps stopping" with no JS red-box.
 *
 * The functions exported here keep the same signatures so the rest of
 * the app's call sites don't need to change. To re-enable Sentry later:
 *
 *   1. `yarn add @sentry/react-native@<version-Expo-SDK-supports>`
 *   2. Replace this file with the previous git history (or restore from
 *      `assets/brand/render_logo.py` style — render fresh).
 *   3. Add `EXPO_PUBLIC_SENTRY_DSN` to `eas.json:build.<profile>.env`.
 */

export function initSentry(): void {
  // Intentional no-op — see file header.
}

/** Manually capture an exception. No-op while Sentry is disabled. */
export function captureException(_err: unknown, _context?: Record<string, unknown>): void {
  // Intentional no-op — see file header.
}
