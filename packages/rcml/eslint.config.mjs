import baseConfig from '../../eslint.base.config.mjs';

export default [
  ...baseConfig,
  {
    files: ['**/*.json'],
    rules: {
      '@nx/dependency-checks': [
        'error',
        {
          ignoredFiles: [
            '{projectRoot}/eslint.config.{js,cjs,mjs,ts,cts,mts}',
            '{projectRoot}/vite.config.{js,ts,mjs,mts}',
            '{projectRoot}/vitest.config.{js,ts,mjs,mts,cjs,cts}',
            '{projectRoot}/tests/**/*',
            '{projectRoot}/src/**/*.test.{ts,tsx,js,jsx}',
            '{projectRoot}/src/**/*.spec.{ts,tsx,js,jsx}',
          ],
          // Runtime-only imports that don't appear in published .d.ts output.
          ignoredDependencies: ['fast-xml-parser'],
        },
      ],
    },
    languageOptions: {
      parser: await import('jsonc-eslint-parser'),
    },
  },
];
