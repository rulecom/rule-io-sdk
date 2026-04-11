# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0] - 2026-04-07

### Added
- Campaign email API support (`createCampaignEmail` helper)
- RCML template builders for hospitality and e-commerce verticals
- Brand style integration for consistent email theming (`brandStyleId` option)
- Editor-compatible RCML auto-built from brand styles
- Comprehensive campaign API test coverage

### Fixed
- URL sanitization for RCML element builders (`createButton`, `createImage`, `createVideo`)
- DELETE method for unsuppress endpoint
- Brand builder return types assignable to `RCMLColumnChild`
- Suppression endpoint uses POST `/suppressions/delete` instead of DELETE

## [0.2.0] - 2026-04-06

### Added
- Automation API support (v2) with `createAutomationEmail` helper
- Subscriber management (v3 API)
- Single-step automail creation per API developer feedback
- GitHub Actions CI workflow

### Changed
- Renamed automail methods to automation (`createAutomail` -> `createAutomation`)

## [0.1.0] - 2026-04-06

### Added
- Initial release
- `RuleClient` with v2 and v3 API support (81 methods)
- Basic RCML document creation and element builders
- Type-safe request/response types for all endpoints
- `RuleApiError` and `RuleConfigError` error handling
- Zero runtime dependencies
