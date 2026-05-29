## 0.4.0-beta.5 (2026-05-29)

### 🚀 Features

- **docs:** add VitePress docs app skeleton (Phase 1) ([b7d4405](https://github.com/rulecom/rule-io-sdk/commit/b7d4405))
- **docs:** add VitePress documentation site (Phases 1–8) ([#147](https://github.com/rulecom/rule-io-sdk/pull/147))
- **rcml:** export machine-readable rcmlSpec as public API ([101797d](https://github.com/rulecom/rule-io-sdk/commit/101797d))
- **rcml:** expose machine-readable rfmSpec public API ([c82c917](https://github.com/rulecom/rule-io-sdk/commit/c82c917))
- **rcml:** expose machine-readable placeholderSpec public API ([73b0ac6](https://github.com/rulecom/rule-io-sdk/commit/73b0ac6))
- **rcml:** machine-readable rcmlSpec, rfmSpec, and placeholderSpec public APIs ([#146](https://github.com/rulecom/rule-io-sdk/pull/146))

### 🩹 Fixes

- **docs:** address Copilot review findings ([b02f989](https://github.com/rulecom/rule-io-sdk/commit/b02f989))
- **docs:** fix 9 dead links breaking VitePress build ([3939cf9](https://github.com/rulecom/rule-io-sdk/commit/3939cf9))
- **docs:** address Copilot review comments on PR #148 ([#148](https://github.com/rulecom/rule-io-sdk/issues/148))
- **rcml:** address Copilot review comments on public specs ([5641c11](https://github.com/rulecom/rule-io-sdk/commit/5641c11))

### ❤️ Thank You

- Claude Sonnet 4.6
- Oleksandr Ryzhyk @webmarket7

## 0.4.0-beta.4 (2026-05-20)

### 🩹 Fixes

- **rcml:** add missing T.Font/T.Class to specs and fix buildBgNode override nodes ([e602e90](https://github.com/rulecom/rule-io-sdk/commit/e602e90))
- **rcml:** accept attribute-override nodes in rc-attributes without children/content ([e4896f2](https://github.com/rulecom/rule-io-sdk/commit/e4896f2))
- **rcml:** add content schemas for rc-preview, rc-plain-text, and rc-raw ([fcb0e7f](https://github.com/rulecom/rule-io-sdk/commit/fcb0e7f))
- **rcml:** drop spurious children/content from attribute-default bg nodes ([8607393](https://github.com/rulecom/rule-io-sdk/commit/8607393))
- **rcml:** allow sparse font marks in ProseMirror content JSON schema ([c417af9](https://github.com/rulecom/rule-io-sdk/commit/c417af9))
- **rcml:** propagate logo src to rc-logo body nodes in applyTheme ([68f1d99](https://github.com/rulecom/rule-io-sdk/commit/68f1d99))
- **rcml:** fix lint errors in json-schema.ts ([c3530c3](https://github.com/rulecom/rule-io-sdk/commit/c3530c3))
- **rcml:** enforce minProperties:1 on font-mark attrs in JSON schema ([3367d58](https://github.com/rulecom/rule-io-sdk/commit/3367d58))
- **rcml:** scope attr-override relaxation and align RcmlAttributesChild types ([d0727d1](https://github.com/rulecom/rule-io-sdk/commit/d0727d1))
- **rcml:** add missing T.Font/T.Class to specs and fix buildBgNode override nodes ([#143](https://github.com/rulecom/rule-io-sdk/pull/143))
- **rcml:** fix validation for editor-emitted documents and logo src propagation ([#144](https://github.com/rulecom/rule-io-sdk/pull/144))

### ❤️ Thank You

- Claude Sonnet 4.6
- Oleksandr Ryzhyk @webmarket7

## 0.4.0-beta.3 (2026-05-18)

### 🚀 Features

- **client:** opt-in rate limiting in HttpTransport ([954aca8](https://github.com/rulecom/rule-io-sdk/commit/954aca8))
- **client:** opt-in rate limiting in HttpTransport ([#141](https://github.com/rulecom/rule-io-sdk/pull/141))
- **client:** opt-in rate limiting, campaign partial-update fixes, and utility refactors ([#142](https://github.com/rulecom/rule-io-sdk/pull/142))

### 🩹 Fixes

- **client:** log parsed retry-after seconds and fix tz doc ([49cbb12](https://github.com/rulecom/rule-io-sdk/commit/49cbb12))
- **client:** updateCampaign partial updates via read-modify-write ([#129](https://github.com/rulecom/rule-io-sdk/issues/129), [#116](https://github.com/rulecom/rule-io-sdk/issues/116))
- **client:** type campaigns toNumericSendout as RuleSendoutType ([#140](https://github.com/rulecom/rule-io-sdk/issues/140))
- **client:** repair campaigns update fast-path body completeness ([#140](https://github.com/rulecom/rule-io-sdk/issues/140))
- **client:** require all 5 fields for campaigns update fast path ([ab48d02](https://github.com/rulecom/rule-io-sdk/commit/ab48d02))
- **client:** reject NaN/Infinity in toNumericSendout; clarify UpdateRequest JSDoc ([72f4725](https://github.com/rulecom/rule-io-sdk/commit/72f4725))
- **client:** updateCampaign partial updates via read-modify-write ([#140](https://github.com/rulecom/rule-io-sdk/pull/140))
- **client:** clamp Retry-After delay to maxRetryAfterMs after jitter ([3591e34](https://github.com/rulecom/rule-io-sdk/commit/3591e34))

### ❤️ Thank You

- Claude
- Claude Opus 4.7
- Claude Sonnet 4.6
- Oleksandr Ryzhyk @webmarket7
- Sam
- swesam

## 0.4.0-beta.2 (2026-05-14)

### 🚀 Features

- **client:** expose v3 rate-limit headers on RuleApiError ([#136](https://github.com/rulecom/rule-io-sdk/pull/136))
- **client:** expose v3 rate-limit headers on RuleApiError ([#136](https://github.com/rulecom/rule-io-sdk/pull/136), [#137](https://github.com/rulecom/rule-io-sdk/pull/137))

### 🩹 Fixes

- **ci:** use commit SHA instead of tag ref for publish job checkout ([61b2a57](https://github.com/rulecom/rule-io-sdk/commit/61b2a57))
- **ci:** push release tag explicitly instead of --follow-tags ([b61a759](https://github.com/rulecom/rule-io-sdk/commit/b61a759))
- **ci:** fix tag push and publish job checkout ([#135](https://github.com/rulecom/rule-io-sdk/pull/135))
- **ci,deps:** atomic tag+branch push and mark vendor packages private ([28044ee](https://github.com/rulecom/rule-io-sdk/commit/28044ee))
- **client:** parse Rule.io v3's actual Retry-After format on 429s ([#136](https://github.com/rulecom/rule-io-sdk/issues/136))
- **client:** parse Rule.io v3's actual Retry-After format on 429s (#136 follow-up) ([#138](https://github.com/rulecom/rule-io-sdk/pull/138), [#136](https://github.com/rulecom/rule-io-sdk/issues/136))
- **deps:** sync package versions with release and fix lock file consistency ([bb0d50f](https://github.com/rulecom/rule-io-sdk/commit/bb0d50f))

### ❤️ Thank You

- Claude
- Claude Opus 4.7
- Claude Sonnet 4.6
- Oleksandr Ryzhyk @webmarket7
- swesam

## 0.4.0-beta.1 (2026-05-14)

### 🩹 Fixes

- **ci:** replace workflow_run with push trigger for release workflow ([eb441f1](https://github.com/rulecom/rule-io-sdk/commit/eb441f1))
- **ci:** replace workflow_run with push trigger for release workflow ([#133](https://github.com/rulecom/rule-io-sdk/pull/133))
- **ci:** fix release workflow and clean up nx release config ([7e3b399](https://github.com/rulecom/rule-io-sdk/commit/7e3b399))
- **ci:** pin publish job checkout to release tag ([10ae1bf](https://github.com/rulecom/rule-io-sdk/commit/10ae1bf))
- **ci:** fix release workflow for first npm publish ([#134](https://github.com/rulecom/rule-io-sdk/pull/134))
- **ci,docs:** add concurrency guard to release workflow and tighten README sync command ([ec85a47](https://github.com/rulecom/rule-io-sdk/commit/ec85a47))
- **deps:** resolve npm audit vulnerabilities ([d2b9d41](https://github.com/rulecom/rule-io-sdk/commit/d2b9d41))

### ❤️ Thank You

- Claude Sonnet 4.6
- Oleksandr Ryzhyk @webmarket7

# Changelog

## 0.4.0-beta.0 (2026-05-14)

### Initial Beta Release

First public beta of the Rule.io TypeScript SDK.

Published packages: `@rulecom/client`, `@rulecom/rcml`, `@rulecom/sdk`.
