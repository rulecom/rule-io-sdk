/**
 * `RuleClient` configuration: the user-facing input shape and the resolved
 * shape every internal piece (transport + namespace clients) sees after
 * defaults are applied.
 */

import { RuleClientError } from './errors.js';

import { RULE_API_V2_BASE_URL, RULE_API_V3_BASE_URL } from './constants.js';
import {
  resolveRateLimitOptions,
  type RateLimitOptions,
  type ResolvedRateLimitOptions,
} from './core/rate-limit.js';

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
   * Opt-in client-side rate limiting. When present, every HTTP request is
   * gated by a concurrency semaphore and retried on 429 according to the
   * supplied options (server `Retry-After` is honored when available).
   *
   * Omit to disable — the client fires requests with no concurrency cap and
   * surfaces 429s directly to the caller.
   */
  rateLimiting?: RateLimitOptions;
}

/** Fully-resolved configuration with every default applied. */
export interface ResolvedClientConfig {
  apiKey: string;
  baseUrlV2: string;
  baseUrlV3: string;
  fetch: typeof fetch;
  debug: boolean;
  /** Resolved rate-limit options, or `undefined` when rate limiting is off. */
  rateLimiting?: ResolvedRateLimitOptions;
}

/**
 * Apply defaults and validate configuration. Accepts a string for the
 * historical "just an API key" constructor form.
 *
 * Throws {@link RuleClientError} if `apiKey` is empty.
 */
export function resolveConfig(input: RuleClientConfig | string): ResolvedClientConfig {
  const config: RuleClientConfig =
    typeof input === 'string' ? { apiKey: input } : input;

  if (!config.apiKey) {
    throw new RuleClientError('API key is required');
  }

  return {
    apiKey: config.apiKey,
    baseUrlV2: config.baseUrlV2 ?? RULE_API_V2_BASE_URL,
    baseUrlV3: config.baseUrlV3 ?? RULE_API_V3_BASE_URL,
    fetch: config.fetch ?? globalThis.fetch,
    debug: config.debug ?? false,
    rateLimiting:
      config.rateLimiting !== undefined
        ? resolveRateLimitOptions(config.rateLimiting)
        : undefined,
  };
}
