/**
 * @rulecom/sdk — meta-package re-exporting the Rule.io TypeScript SDK.
 *
 * This package is an umbrella over:
 * - `@rulecom/rcml`   — RCML email template builders and types
 * - `@rulecom/client` — HTTP API wrapper for the Rule.io endpoints
 *
 * Vendor presets (`@rulecom/vendor-shopify`, `@rulecom/vendor-bookzen`,
 * `@rulecom/vendor-samfora`) are under active development and will be
 * included in a future release.
 *
 * For smaller install footprints, import from the split packages directly.
 *
 * @packageDocumentation
 */

export * from '@rulecom/rcml';
export * from '@rulecom/client';
