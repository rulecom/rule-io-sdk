/**
 * `RuleClient` configuration: the user-facing input shape and the resolved
 * shape every internal piece (transport + namespace clients) sees after
 * defaults are applied.
 */

import { RuleConfigError } from '@rule-io/core';

import { RULE_API_V2_BASE_URL, RULE_API_V3_BASE_URL } from './constants.js';

/** User-facing client configuration. All fields except `apiKey` have defaults. */
export interface RuleClientConfig {
  apiKey: string;
  /** Base URL for v2 API (default: https://app.rule.io/api/v2). */
  baseUrlV2?: string;
  /** Base URL for v3 API (default: https://app.rule.io/api/v3). */
  baseUrlV3?: string;
  /** Custom fetch implementation for testing. */
  fetch?: typeof fetch;
  /** Enable debug logging. */
  debug?: boolean;
  /**
   * Group prefix for subscriber custom fields (default: 'Booking').
   * Fields are sent as `{prefix}.{fieldName}` (e.g., 'Booking.FirstName').
   */
  fieldGroupPrefix?: string;
}

/** Fully-resolved configuration with every default applied. */
export interface ResolvedClientConfig {
  apiKey: string;
  baseUrlV2: string;
  baseUrlV3: string;
  fetch: typeof fetch;
  debug: boolean;
  fieldGroupPrefix: string;
}

/**
 * Apply defaults and validate configuration. Accepts a string for the
 * historical "just an API key" constructor form.
 *
 * Throws {@link RuleConfigError} if `apiKey` is empty, or `fieldGroupPrefix`
 * is empty after trimming, or contains a dot (since dots are the separator
 * between group and field name in the v2 subscriber API).
 */
export function resolveConfig(input: RuleClientConfig | string): ResolvedClientConfig {
  const config: RuleClientConfig =
    typeof input === 'string' ? { apiKey: input } : input;

  if (!config.apiKey) {
    throw new RuleConfigError('API key is required');
  }

  const fieldGroupPrefix = (config.fieldGroupPrefix ?? 'Booking').trim();

  if (!fieldGroupPrefix) {
    throw new RuleConfigError('fieldGroupPrefix must not be empty');
  }

  if (fieldGroupPrefix.includes('.')) {
    throw new RuleConfigError('fieldGroupPrefix must not contain dots');
  }

  return {
    apiKey: config.apiKey,
    baseUrlV2: config.baseUrlV2 ?? RULE_API_V2_BASE_URL,
    baseUrlV3: config.baseUrlV3 ?? RULE_API_V3_BASE_URL,
    fetch: config.fetch ?? globalThis.fetch,
    debug: config.debug ?? false,
    fieldGroupPrefix,
  };
}
