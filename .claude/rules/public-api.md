---
paths:
  - 'src/index.ts'
---

# Public API Surface Rules

## src/index.ts Is Sacred

This file defines the public API contract. Every line is consumed by external packages.
Every export is a promise to consumers that it will continue to exist and work.

## Before Adding Exports

Ask:
1. Is this useful to consumers, or is it internal?
2. Is the API stable, or might it change soon?
3. Does it have tests?
4. Does it have JSDoc with `@example`?
5. Does it have explicit TypeScript return types?

If any answer is "no", don't export it yet.

## Before Removing/Renaming Exports

This is a **BREAKING CHANGE**. It requires:
1. Major version bump (e.g., 0.1.0 → 1.0.0)
2. Deprecation in the previous release (`@deprecated` JSDoc tag)
3. Migration guide in CHANGELOG.md

Consider keeping the old name as a deprecated re-export:
```typescript
/** @deprecated Use newName instead */
export { newName as oldName } from './module';
```

## Export Organization

Keep exports grouped and ordered:

1. Client class
2. Error classes
3. Constants
4. API types
5. RCML types
6. RCML utilities and builders
7. Brand template utilities
8. Hospitality templates
9. E-commerce templates
10. Legacy templates (deprecated)
11. Automation configurations

## No Internal Utilities

Don't export helpers that are only used internally:

```typescript
// WRONG - internal helper leaked
export { buildPayload } from './client';

// CORRECT - only export what consumers need
export { RuleClient } from './client';
```
