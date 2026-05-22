import baseConfig from '../../eslint.base.config.mjs';

export default [
  ...baseConfig,
  {
    ignores: [
      '.vitepress/cache/**',
      '.vitepress/dist/**',
      'src/api/**',
      'src/packages/**',
    ],
  },
];
