/**
 * @rule-io/sdk — meta-package re-exporting the full Rule.io TypeScript SDK.
 *
 * This package is an umbrella over the split packages:
 * - `@rule-io/core`   — shared error classes
 * - `@rule-io/rcml`   — RCML email template builders and types
 * - `@rule-io/client` — HTTP API wrapper for the Rule.io endpoints
 * - `@rule-io/vendor-shopify`, `@rule-io/vendor-bookzen`, `@rule-io/vendor-samfora`
 *
 * For smaller install footprints, import from those packages directly.
 * Existing consumers of `@rule-io/sdk` keep the same imports.
 *
 * @packageDocumentation
 */

export * from '@rule-io/core';
export * from '@rule-io/rcml';
export * from '@rule-io/client';
export * from '@rule-io/vendor-shopify';
export * from '@rule-io/vendor-bookzen';
export * from '@rule-io/vendor-samfora';
