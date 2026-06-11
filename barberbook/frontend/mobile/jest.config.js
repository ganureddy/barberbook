/**
 * Jest config. The booking calculator (and any future pure-logic helpers)
 * lives under `src/lib/` and ships zero RN imports — we test it through
 * `jest-expo` so future tests that need the full RN runtime work too.
 *
 * `transformIgnorePatterns` opts the few RN-flavored packages back IN to
 * Babel transformation; without it Jest fails on the ESM `import`s shipped
 * by RN itself. The pattern is verbatim from the Expo docs.
 */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.ts?(x)'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  // Keep tests fast: don't gather coverage by default; CI will opt in.
  collectCoverage: false,
};
