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
