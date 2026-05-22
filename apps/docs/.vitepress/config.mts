import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitepress';
import { buildApiSidebar, guideSidebar } from './sidebar';

const srcDir = resolve(dirname(fileURLToPath(import.meta.url)), '../src');

export default defineConfig({
  title: 'Rule.io SDK',
  description: 'Documentation for @rulecom/client, @rulecom/rcml, and @rulecom/sdk',
  srcDir: 'src',
  base: (process.env['DOCS_BASE'] ?? '/rule-io-sdk/') as `/${string}/`,

  themeConfig: {
    nav: [
      {
        text: 'Guide',
        link: '/guide/getting-started',
        activeMatch: '^/(guide|packages)/',
      },
      {
        text: 'API Reference',
        link: '/api/',
        activeMatch: '^/api/',
      },
    ],

    sidebar: {
      '/guide/': guideSidebar,
      '/packages/': guideSidebar,
      '/api/': buildApiSidebar(srcDir),
    },
  },
});
