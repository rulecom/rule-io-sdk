import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { DefaultTheme } from 'vitepress';

const API_PACKAGES: { dir: string; label: string }[] = [
  { dir: 'client/src', label: '@rulecom/client' },
  { dir: 'rcml/src', label: '@rulecom/rcml' },
  { dir: 'sdk/src', label: '@rulecom/sdk' },
];

const CATEGORIES: { dir: string; label: string }[] = [
  { dir: 'classes', label: 'Classes' },
  { dir: 'enumerations', label: 'Enumerations' },
  { dir: 'functions', label: 'Functions' },
  { dir: 'interfaces', label: 'Interfaces' },
  { dir: 'type-aliases', label: 'Type Aliases' },
  { dir: 'variables', label: 'Variables' },
];

function mdFilesToItems(dir: string, linkPrefix: string): DefaultTheme.SidebarItem[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => ({ text: f.replace(/\.md$/, ''), link: `${linkPrefix}/${f.replace(/\.md$/, '')}` }));
}

export function buildApiSidebar(srcDir: string): DefaultTheme.SidebarItem[] {
  const apiDir = join(srcDir, 'api');
  if (!existsSync(apiDir)) return [];

  return API_PACKAGES.map(({ dir, label }) => {
    const pkgDir = join(apiDir, dir);
    const items: DefaultTheme.SidebarItem[] = [{ text: 'Overview', link: `/api/${dir}/` }];

    for (const { dir: catDir, label: catLabel } of CATEGORIES) {
      const files = mdFilesToItems(join(pkgDir, catDir), `/api/${dir}/${catDir}`);
      if (files.length === 0) continue;
      items.push({ text: catLabel, collapsed: true, items: files });
    }

    return { text: label, items };
  });
}

export const guideSidebar: DefaultTheme.SidebarItem[] = [
  {
    text: 'Getting Started',
    items: [
      { text: 'Quick Start', link: '/guide/getting-started' },
      { text: 'Contributing to Docs', link: '/guide/contributing' },
    ],
  },
  {
    text: '@rulecom/sdk',
    items: [
      { text: 'Overview', link: '/packages/sdk/' },
      { text: 'Sending Emails', link: '/packages/sdk/sending-emails' },
      { text: 'Brand Styles', link: '/packages/sdk/brand-styles' },
      { text: 'Managing Subscribers', link: '/packages/sdk/subscribers' },
      { text: 'Templates', link: '/packages/sdk/templates' },
      { text: 'Direct API Reference', link: '/packages/sdk/api-reference' },
    ],
  },
  {
    text: '@rulecom/client',
    items: [{ text: 'Overview', link: '/packages/client/' }],
  },
  {
    text: '@rulecom/rcml',
    items: [{ text: 'Overview', link: '/packages/rcml/' }],
  },
];
