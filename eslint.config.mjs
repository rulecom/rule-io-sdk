import baseConfig from './eslint.base.config.mjs';

export default [
  ...baseConfig,
  {
    ignores: ['dist/', 'node_modules/', '**/*.config.*', 'packages/*/dist'],
  },
];
