# Changelog

## 0.4.0-beta.0 (2026-05-14)

### Initial Beta Release

First public beta of `@rulecom/client` — a TypeScript HTTP client for the Rule.io email marketing API.

#### Features

- **`RuleClient`** — typed HTTP client covering the Rule.io v2/v3 API:
  - Subscriber management (create, update, delete, tag, block/unblock, bulk import)
  - Campaign and automation management
  - Template and message management
  - Brand style discovery and creation
  - Custom fields management
  - Analytics queries
  - Enterprise exports (dispatchers, statistics)
- **Error types** — `RuleApiError` and `RuleClientError` for typed error handling
- **Helpers** — `findTemplateOwner`, `brandStyleToTheme`, `formatDateForRule`
- **Full TypeScript types** for all API request/response shapes
