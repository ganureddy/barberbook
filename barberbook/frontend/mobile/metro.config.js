/**
 * Metro bundler config for the BarberBook Expo SDK 54 app.
 *
 * We start from the Expo default (`@expo/metro-config`) which already wires
 * Hermes, asset hashing, the CSS transformer, and `react-native-worklets`
 * resolution into Metro. The only customizations:
 *
 *   1. Add `cjs` to source extensions so Sentry / some Tanstack ESM-CJS
 *      builds resolve cleanly on Hermes.
 *   2. Add `svg` to the asset list (we don't use a transformer because the
 *      app references PNGs from `assets/`; this just keeps Metro from
 *      treating SVGs in `assets/brand/` as source files).
 */
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts = Array.from(
  new Set([...(config.resolver.sourceExts ?? []), 'cjs', 'mjs']),
);

config.resolver.assetExts = Array.from(
  new Set([...(config.resolver.assetExts ?? []), 'svg']),
);

module.exports = config;
