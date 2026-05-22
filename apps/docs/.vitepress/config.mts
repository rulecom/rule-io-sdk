import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Rule.io SDK',
  description: 'Documentation for @rulecom/client, @rulecom/rcml, and @rulecom/sdk',
  srcDir: 'src',
  base: (process.env['DOCS_BASE'] ?? '/rule-io-sdk/') as `/${string}/`,
});
