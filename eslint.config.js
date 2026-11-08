import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      'dist',
      '.wrangler',
      'worker-configuration.d.ts',
      'test-results',
      'playwright-report',
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['src/client/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  {
    files: ['*.config.{ts,js}', 'e2e/**', 'scripts/**'],
    languageOptions: { globals: globals.node },
  },
)
