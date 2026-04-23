# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
