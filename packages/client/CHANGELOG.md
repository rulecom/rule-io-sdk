## 0.4.0-beta.4 (2026-05-20)

This was a version bump only for client to align it with other projects, there were no code changes.

## 0.4.0-beta.3 (2026-05-18)

### 🚀 Features

- **client:** opt-in rate limiting in HttpTransport ([954aca8](https://github.com/rulecom/rule-io-sdk/commit/954aca8))

### 🩹 Fixes

- **client:** clamp Retry-After delay to maxRetryAfterMs after jitter ([3591e34](https://github.com/rulecom/rule-io-sdk/commit/3591e34))
- **client:** reject NaN/Infinity in toNumericSendout; clarify UpdateRequest JSDoc ([72f4725](https://github.com/rulecom/rule-io-sdk/commit/72f4725))
- **client:** require all 5 fields for campaigns update fast path ([ab48d02](https://github.com/rulecom/rule-io-sdk/commit/ab48d02))
- **client:** repair campaigns update fast-path body completeness ([#140](https://github.com/rulecom/rule-io-sdk/issues/140))
- **client:** type campaigns toNumericSendout as RuleSendoutType ([#140](https://github.com/rulecom/rule-io-sdk/issues/140))
- **client:** updateCampaign partial updates via read-modify-write ([#129](https://github.com/rulecom/rule-io-sdk/issues/129), [#116](https://github.com/rulecom/rule-io-sdk/issues/116))
- **client:** log parsed retry-after seconds and fix tz doc ([49cbb12](https://github.com/rulecom/rule-io-sdk/commit/49cbb12))

### ❤️ Thank You

- Claude
- Claude Opus 4.7
- Claude Sonnet 4.6
- Oleksandr Ryzhyk
- swesam

## 0.4.0-beta.2 (2026-05-14)

### 🚀 Features

- **client:** expose v3 rate-limit headers on RuleApiError ([#136](https://github.com/rulecom/rule-io-sdk/pull/136))

### 🩹 Fixes

- **client:** parse Rule.io v3's actual Retry-After format on 429s ([#136](https://github.com/rulecom/rule-io-sdk/issues/136))
- **deps:** sync package versions with release and fix lock file consistency ([bb0d50f](https://github.com/rulecom/rule-io-sdk/commit/bb0d50f))

### ❤️ Thank You

- Claude
- Claude Opus 4.7
- Claude Sonnet 4.6
- Oleksandr Ryzhyk
- swesam

## 0.4.0-beta.1 (2026-05-14)

This was a version bump only for client to align it with other projects, there were no code changes.

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
