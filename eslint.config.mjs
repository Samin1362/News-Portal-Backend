import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

/**
 * Backend lint config (flat). Type-aware linting is intentionally off to keep
 * `npm run lint` fast and dependency-light; `tsc --noEmit` already provides
 * full type checking. The goal here is catching the things tsc won't —
 * unused vars, unsafe patterns, accidental `any`, etc.
 */
export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      // Surface but don't block on intentional `any` at the Express/Mongo
      // boundary — fail the build only on genuinely broken code.
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
);
