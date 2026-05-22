// Public packages whose API reference is generated via TypeDoc.
export const API_PACKAGES = ['client', 'rcml', 'sdk'] as const;

// Public packages with docs/ content to sync into the site.
export const DOCS_PACKAGES = ['client', 'rcml', 'sdk'] as const;

export type ApiPackage = (typeof API_PACKAGES)[number];
export type DocsPackage = (typeof DOCS_PACKAGES)[number];
