/**
 * Babel config for the BarberBook Expo SDK 54 app.
 *
 * Two non-negotiables for a working build:
 *   1. `babel-preset-expo` is the only preset (it covers TS, JSX, Flow, env).
 *   2. `react-native-worklets/plugin` MUST be the LAST plugin in the array.
 *      Reanimated 4 + Worklets 0.5 generate worklet stubs at this stage; if
 *      the plugin doesn't run, every `useSharedValue` / `useAnimatedStyle`
 *      throws at runtime and the JS bundle dies on first screen mount.
 *      (Splash.tsx and RoleSelect.tsx both use Reanimated, so a missing
 *      plugin manifests as "APK installs, opens for a flash, then closes".)
 *
 * Do NOT add the older `react-native-reanimated/plugin` here — it was
 * replaced by `react-native-worklets/plugin` in Reanimated 4.x.
 */
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-worklets/plugin'],
  };
};
