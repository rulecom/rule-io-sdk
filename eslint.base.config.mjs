import nx from '@nx/eslint-plugin';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: ['**/dist', '**/out-tsc', '**/node_modules'],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          depConstraints: [
            {
              sourceTag: '*',
              onlyDependOnLibsWithTags: ['*'],
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.cts', '**/*.mts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      // Allow numbers and booleans in template literals (common SDK pattern: `api/v3/campaigns/${id}`)
      // allowNever covers defensive runtime guards against tuple-type invariants
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        {
          allowNumber: true,
          allowBoolean: true,
          allowNever: true,
        },
      ],

      // Allow re-exporting deprecated symbols for backward compatibility
      '@typescript-eslint/no-deprecated': 'off',

      // Allow empty interfaces extending other types (used for type aliasing with documentation)
      '@typescript-eslint/no-empty-object-type': [
        'error',
        {
          allowInterfaces: 'with-single-extends',
        },
      ],

      // Prefix unused variables with _ (allow destructuring rest patterns)
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],

      // Non-null assertions are used in a handful of post-validation spots
      // where TS can't prove the narrowing. Keep visible as warnings;
      // upgrade to error once every site is cleaned up. Tests relax this
      // to `off` below.
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // Downgrade to warn: index signatures (Record<string, T>) return T at type level
      // but may be undefined at runtime — defensive checks are intentional
      '@typescript-eslint/no-unnecessary-condition': 'warn',

      // Downgrade to warn: spreading RequestInit.headers into objects is standard
      // HTTP client practice; HeadersInit union type triggers false positive
      '@typescript-eslint/no-misused-spread': 'warn',

      // Superseded by no-empty-object-type (configured above with allowInterfaces)
      '@typescript-eslint/no-empty-interface': 'off',

      // Empty functions are used intentionally (test mocks, no-op defaults)
      '@typescript-eslint/no-empty-function': 'off',

      // Control chars in regexes are intentional (email validation rejects them)
      'no-control-regex': 'off',
    },
  },

  // ── Readability / type-strictness (shared across all packages) ──────────
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.cts', '**/*.mts'],
    rules: {
      // `import type` for type-only imports; auto-fixable.
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],

      // Disallow `any` — use `unknown` or proper types.
      '@typescript-eslint/no-explicit-any': 'error',

      // Require explicit return types on exported / module-boundary functions.
      '@typescript-eslint/explicit-module-boundary-types': 'error',

      // Replace core JS rules with their TS-aware variants.
      'no-use-before-define': 'off',
      '@typescript-eslint/no-use-before-define': ['error', { functions: false }],
      'no-shadow': 'off',
      '@typescript-eslint/no-shadow': 'error',

      // Labels + `with` are disallowed; leave `for…of` / `for…in` alone.
      'no-restricted-syntax': [
        'error',
        {
          selector: 'LabeledStatement',
          message: 'Labels are a form of GOTO; using them makes code hard to understand.',
        },
        {
          selector: 'WithStatement',
          message: '`with` is disallowed in strict mode.',
        },
      ],
      // `continue` is idiomatic in content-parser / block-walker hot paths.
      'no-continue': 'off',

      // Readability: blank lines around blocks and before return.
      'padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: '*', next: 'return' },
        { blankLine: 'always', prev: ['const', 'let', 'var'], next: '*' },
        { blankLine: 'any',    prev: ['const', 'let', 'var'], next: ['const', 'let', 'var'] },
        { blankLine: 'always', prev: '*',          next: 'block-like' },
        { blankLine: 'always', prev: 'block-like', next: '*' },
      ],
    },
  },

  // ── Test files — relax the rules that are noise inside unit tests ───────
  {
    files: [
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      '**/tests/**/*.ts',
      '**/tests/**/*.tsx',
    ],
    rules: {
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
];
