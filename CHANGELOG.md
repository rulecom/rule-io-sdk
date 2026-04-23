# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.0] - 2026-04-23

### Added
- Samfora vendor preset (`samforaPreset`, `SAMFORA_FIELDS`, `SAMFORA_TAGS`)
  for Swedish charitable-donation flows: donation confirmation (first-time,
  second-time, returning donors — gated by donor-lifecycle tags), monthly
  donation confirmation, welcome, and annual tax summary. Default copy ships
  in Swedish. Donor identity lives on the flat `Subscriber.*` group,
  per-donation event data on the historical `Donation.*` group, per
  Rule.io field-group praxis.
- Shopify order cancellation automation: new `'shopify-order-cancellation'`
  entry in `shopifyPreset.getAutomations()`.
- Standalone `createWelcomeEmail()` template — vertical-agnostic welcome email
  with `WelcomeEmailConfig`.
- E-commerce email templates enriched with structural building blocks for
  richer layouts across order confirmation, shipping update, abandoned cart,
  and order cancellation.
- RCML builders for social links and switch/case conditional rendering
  (`createSocial`, `createSwitch`, `createCase`).
- `resolvePreferredBrandStyle(client, overrideId?)` — discovers the account's
  preferred brand style via `is_default: true`, converts it to a
  `BrandStyleConfig`, and reports whether the pick came from the default flag,
  a caller-supplied override, or a fallback when no default is set.
- Configurable labels and colors in e-commerce templates (previously
  hardcoded English strings and hex values). New fields are optional with
  English defaults — existing consumers keep current behavior.
- `validateCustomFields` exported from the public API for consumers
  building custom templates.
- Template builders now wrap errors via `withTemplateContext` for better
  diagnostics (e.g. `"createOrderConfirmationEmail > createBrandButton:
  invalid or unsafe URL"`).
- `scripts/deploy-samfora.ts` — reference deployment script that resolves
  the account's preferred brand style via `listBrandStyles()`.
- `scripts/list-automations.ts` — probe script for inspecting account
  automations.
- `scripts/validate-rcml.ts` — CI-friendly RCML validation script.
- ESLint configuration for the SDK source tree.

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
- `createGreetingSection` parameter names renamed for clarity (previous
  `firstName` param was misleading).
- Tightened type safety across RCML types and error handling; consolidated
  query-param building in the client.

### Fixed
- URL sanitization added to low-level RCML element builders.
- `withTemplateContext` now preserves the original stack trace and `cause`
  when wrapping errors.
- ProseMirror mark types corrected.

### Removed
- Dead `isConfigured()` method removed from `RuleClient`.

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

[Unreleased]: https://github.com/rulecom/rule-io-sdk/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/rulecom/rule-io-sdk/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/rulecom/rule-io-sdk/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/rulecom/rule-io-sdk/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/rulecom/rule-io-sdk/releases/tag/v0.1.0
