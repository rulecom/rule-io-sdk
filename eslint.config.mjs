import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      // Allow numbers and booleans in template literals (common SDK pattern: `api/v3/campaigns/${id}`)
      '@typescript-eslint/restrict-template-expressions': ['error', {
        allowNumber: true,
        allowBoolean: true,
      }],

      // Allow re-exporting deprecated symbols for backward compatibility
      '@typescript-eslint/no-deprecated': 'off',

      // Allow empty interfaces extending other types (used for type aliasing with documentation)
      '@typescript-eslint/no-empty-object-type': ['error', {
        allowInterfaces: 'with-single-extends',
      }],

      // Prefix unused variables with _ (allow destructuring rest patterns)
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
      }],

      // Allow non-null assertions (used sparingly in SDK for known-safe access)
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // Downgrade to warn: index signatures (Record<string, T>) return T at type level
      // but may be undefined at runtime — defensive checks are intentional
      '@typescript-eslint/no-unnecessary-condition': 'warn',

      // Downgrade to warn: spreading RequestInit.headers into objects is standard
      // HTTP client practice; HeadersInit union type triggers false positive
      '@typescript-eslint/no-misused-spread': 'warn',
    },
  },
  {
    ignores: ['dist/', 'node_modules/', '*.config.*'],
  },
);
