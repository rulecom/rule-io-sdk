# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### BREAKING CHANGES
- **Published package name changed from `rule-io-sdk` to `@rule-io/sdk`.**
  Existing consumers must run
  `npm uninstall rule-io-sdk && npm install @rule-io/sdk` and update import
  specifiers (`from 'rule-io-sdk'` → `from '@rule-io/sdk'`).
- **CommonJS output dropped.** `@rule-io/sdk` is now ESM-only (`type: "module"`);
  the `exports` map provides only an `import` condition. Consumers on CommonJS
  must either migrate to ESM or use dynamic `import()`. No dual-build planned.
- **Minimum Node.js version bumped from `>=18` to `>=20`.** The Nx plugins used
  by the workspace (`@nx/vitest`) rely on `node:util.styleText`, added in
  Node 20.12 / 22.
- **SDK split into a meta-package over six focused siblings** — `@rule-io/core`,
  `@rule-io/rcml`, `@rule-io/client`, `@rule-io/vendor-shopify`,
  `@rule-io/vendor-bookzen`, `@rule-io/vendor-samfora`. Existing
  `import { X } from '@rule-io/sdk'` keeps working via transitive re-exports;
  new consumers can install only the subset they need (e.g. `@rule-io/client`
  alone, or a single `@rule-io/vendor-*`).
- **New sibling package: `@rule-io/cli`** — `npx @rule-io/cli` / `rule-io`
  binary replacing the previous `scripts/` utilities. See
  [packages/cli/README.md](../cli/README.md).

### Added
- Samfora vendor preset (`samforaPreset`, `SAMFORA_FIELDS`, `SAMFORA_TAGS`)
  for Swedish charitable-donation flows: donation confirmation (first-time,
  second-time, returning donors — gated by donor-lifecycle tags), monthly
  donation confirmation, welcome, and annual tax summary. Default copy ships
  in Swedish. Donor identity lives on the flat `Subscriber.*` group,
  per-donation event data on the historical `Donation.*` group, per
  Rule.io field-group praxis.
- `scripts/deploy-samfora.ts` — reference deployment script that resolves
  the account's preferred brand style via `is_default: true` from
  `listBrandStyles()`.
- `resolvePreferredBrandStyle(client, overrideId?)` — discovers the account's
  preferred brand style via `is_default: true`, converts it to a
  `BrandStyleConfig`, and reports whether the pick came from the default flag,
  a caller-supplied override, or a fallback when no default is set.

### Changed
- `BOOKZEN_FIELDS.guestFirstName` moved from `'Booking.FirstName'` to
  `'Subscriber.FirstName'`. Guest identity belongs on the flat
  `Subscriber.*` group (overwritten per sync), not the historical
  `Booking.*` group (appended per sync). Brings Bookzen in line with
  Shopify and Samfora per Rule.io field-group praxis.
- `scripts/deploy-shopify.ts` and `scripts/validate-rcml.ts` now use
  `resolvePreferredBrandStyle` instead of hardcoded IDs / `styles.data[0]`.
  The previous Shopify default `--brand` ID (`11025`) is removed; discovery
  runs when no override is given. Explicit overrides via `--brand=<id>` and
  `RULE_BRAND_STYLE_ID` are still supported.

### Fixed
- `exportStatistics` now transparently decodes the base64-encoded
  `object.name` that Rule.io returns for records where
  `object.type === 'message'` (every other object type returns plain text).
  A round-trip guard limits decoding to values that look like canonical
  base64. If you need to inspect the raw API response or disable this
  behavior, opt out with `decodeNames: false`. (#95)

## [0.3.0] - 2026-04-07

### Added
- Campaign email API support (`createCampaignEmail` helper)
- RCML template builders for hospitality and e-commerce verticals
- Brand style integration for consistent email theming (`brandStyleId` option)
- Editor-compatible RCML auto-built from brand styles
- Comprehensive campaign API test coverage

### Fixed
- URL sanitization for RCML element builders (`createButton`, `createImage`, `createVideo`)
- Unsuppress endpoint now uses `DELETE /suppressions/` instead of `POST`
- Brand builder return types assignable to `RCMLColumnChild`

## [0.2.0] - 2026-04-06

### Added
- Automation API support (v3 editor endpoints) with `createAutomationEmail` helper
- Subscriber management (v3 API)
- Single-step automail creation per API developer feedback
- GitHub Actions CI workflow

### Changed
- Introduced automation-named methods (`createAutomation`, etc.); automail-named methods kept as deprecated aliases

## [0.1.0] - 2026-04-06

### Added
- Initial release
- `RuleClient` with v2 and v3 API support (81 methods)
- Basic RCML document creation and element builders
- Type-safe request/response types for all endpoints
- `RuleApiError` and `RuleConfigError` error handling
- Zero runtime dependencies

[Unreleased]: https://github.com/rulecom/rule-io-sdk/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/rulecom/rule-io-sdk/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/rulecom/rule-io-sdk/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/rulecom/rule-io-sdk/releases/tag/v0.1.0
