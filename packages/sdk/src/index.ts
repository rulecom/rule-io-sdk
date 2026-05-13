/**
 * @rulecom/sdk — meta-package re-exporting the full Rule.io TypeScript SDK.
 *
 * This package is an umbrella over the split packages:
 * - `@rulecom/core`   — shared error classes
 * - `@rulecom/rcml`   — RCML email template builders and types
 * - `@rulecom/client` — HTTP API wrapper for the Rule.io endpoints
 * - `@rulecom/vendor-shopify`, `@rulecom/vendor-bookzen`, `@rulecom/vendor-samfora`
 *
 * For smaller install footprints, import from those packages directly.
 * Existing consumers of `@rulecom/sdk` keep the same imports.
 *
 * @packageDocumentation
 */

export * from '@rulecom/core';
export * from '@rulecom/rcml';
export * from '@rulecom/client';
export * from '@rulecom/vendor';
export * from '@rulecom/vendor-shopify';
export * from '@rulecom/vendor-bookzen';
export * from '@rulecom/vendor-samfora';
