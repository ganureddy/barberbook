/**
 * eslint-config-universe is the official ruleset Expo recommends for
 * React Native + TypeScript projects. The "native" preset is tuned for RN
 * (no DOM globals, proper React/RN plugin presets), and the "shared/typescript-analysis"
 * preset adds @typescript-eslint with the project tsconfig wired in.
 */
module.exports = {
  root: true,
  extends: [
    'universe/native',
    'universe/shared/typescript-analysis',
  ],
  ignorePatterns: ['node_modules/', '.expo/', 'dist/', 'web-build/', 'babel.config.js'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx', '*.d.ts'],
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      },
    },
  ],
  rules: {
    'import/order': [
      'warn',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
      },
    ],
  },
};
