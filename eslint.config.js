// @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

export default [
  {
    // These JS config files don't need linting and cause issues with
    // type-aware @typescript-eslint rules when using project references.
    ignores: ['apps/dashboard/eslint.config.js', 'apps/dashboard/prettier.config.js'],
  },
  ...tanstackConfig,
  {
    files: ['apps/dashboard/vite.config.ts'],
    languageOptions: {
      parserOptions: {
        // Use the dashboard tsconfig for type-aware rules on the Vite config.
        project: ['./apps/dashboard/tsconfig.json'],
      },
    },
    rules: {
      // Allow cycles in the Vite config to keep things simple.
      'import/no-cycle': 'off',
      // Disable type-aware rules that cause issues without full type information.
      '@typescript-eslint/no-unnecessary-condition': 'off',
    },
  },
]
