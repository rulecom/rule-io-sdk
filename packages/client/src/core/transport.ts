/**
 * Shared HTTP transport for every namespace client.
 *
 * Owns every concern that previously lived inline on `RuleClient`:
 * - resolved config (api key, base URLs, fetch impl, debug flag)
 * - v2 vs. v3 base URL + content-type selection
 * - authorization header
 * - 429 / 401 / non-OK error mapping into `RuleApiError`
 * - v3 validation-error normalization
 * - 204 No Content → `{ success: true }` JSON convenience
 * - debug logging
 * - opt-in client-side rate limiting (concurrency cap + 429 retry that
 *   honors `Retry-After`), enabled by `TransportConfig.rateLimiting`.
 */

import { RuleApiError, type RuleValidationErrors } from '../errors.js';
import { RateLimitGate, type ResolvedRateLimitOptions } from './rate-limit.js';

/**
 * Resolved transport configuration. Every field is required — the caller
 * (`resolveConfig` in `../config.ts`) is responsible for filling defaults.
 */
export interface TransportConfig {
  apiKey: string;
  baseUrlV2: string;
  baseUrlV3: string;
  fetch: typeof fetch;
  debug: boolean;
  /**
   * Optional resolved rate-limit options. When present, every HTTP request
   * is gated by a concurrency semaphore and retried on 429. When absent,
   * requests fire without gating and 429s surface directly.
   */
  rateLimiting?: ResolvedRateLimitOptions;
}

export type ApiVersion = 'v2' | 'v3';

export interface RequestOptions {
  /** Default 'v3'. */
  version?: ApiVersion;
  body?: RequestInit['body'];
  headers?: Record<string, string>;
}

/** Minimal shape for a JSON envelope returned by Rule.io. */
interface JsonEnvelope {
  success?: boolean;
  error?: string;
  message?: string;
  errors?: Record<string, unknown>;
}

export class HttpTransport {
  private readonly gate: RateLimitGate | undefined;

  constructor(private readonly config: TransportConfig) {
    this.gate = config.rateLimiting ? new RateLimitGate(config.rateLimiting) : undefined;
  }

  get<T>(endpoint: string, opts: RequestOptions = {}): Promise<T> {
    return this.requestJson<T>('GET', endpoint, opts);
  }

  post<T>(endpoint: string, opts: RequestOptions = {}): Promise<T> {
    return this.requestJson<T>('POST', endpoint, opts);
  }

  put<T>(endpoint: string, opts: RequestOptions = {}): Promise<T> {
    return this.requestJson<T>('PUT', endpoint, opts);
  }

  patch<T>(endpoint: string, opts: RequestOptions = {}): Promise<T> {
    return this.requestJson<T>('PATCH', endpoint, opts);
  }

  delete<T>(endpoint: string, opts: RequestOptions = {}): Promise<T> {
    return this.requestJson<T>('DELETE', endpoint, opts);
  }

  /**
   * Send a request and return the parsed JSON body cast to `T`.
   *
   * On HTTP 204 returns `{ success: true } as T` so callers do not have to
   * special-case empty bodies.
   */
  async requestJson<T>(
    method: string,
    endpoint: string,
    opts: RequestOptions = {}
  ): Promise<T> {
    const response = await this.fetchRaw(method, endpoint, opts);

    if (response.status === 204) {
      this.log('Response 204 No Content');

      return { success: true } as T;
    }

    const data = (await response.json()) as T;

    this.log('Response', data);

    return data;
  }

  /**
   * Send a request and return the response body as plain text.
   *
   * Used by template-render endpoints that return rendered HTML.
   */
  async requestText(
    method: string,
    endpoint: string,
    opts: RequestOptions = {}
  ): Promise<string> {
    const response = await this.fetchRaw(method, endpoint, opts);
    const text = await response.text();

    this.log('Response (text)', text.slice(0, 200));

    return text;
  }

  /**
   * Send a request and return the raw `Response` after error mapping.
   *
   * Callers that need the response object directly (e.g. async fire-and-forget
   * endpoints that ignore the body) use this instead of `requestJson`.
   *
   * When `rateLimiting` is configured, the call is gated by a concurrency
   * semaphore and retried on 429 according to the resolved options.
   */
  async fetchRaw(
    method: string,
    endpoint: string,
    opts: RequestOptions = {}
  ): Promise<Response> {
    if (this.gate === undefined) {
      return this.doFetchRaw(method, endpoint, opts);
    }

    return this.gate.run(`${method} ${endpoint}`, () =>
      this.doFetchRaw(method, endpoint, opts)
    );
  }

  /**
   * The actual HTTP send. Extracted from {@link fetchRaw} so the rate-limit
   * gate can wrap it without recursing through itself.
   */
  private async doFetchRaw(
    method: string,
    endpoint: string,
    opts: RequestOptions
  ): Promise<Response> {
    const version: ApiVersion = opts.version ?? 'v3';
    const baseUrl = version === 'v3' ? this.config.baseUrlV3 : this.config.baseUrlV2;
    const url = `${baseUrl}${endpoint}`;

    this.log('Request', method, url);

    let response: Response;

    try {
      response = await this.config.fetch(url, {
        method,
        body: opts.body,
        headers: {
          ...this.authHeaders(version),
          ...opts.headers,
        },
      });
    } catch (error) {
      if (error instanceof RuleApiError) throw error;
      this.log('Network error', error);
      throw new RuleApiError(
        error instanceof Error ? error.message : 'Network error',
        0
      );
    }

    if (response.ok) return response;

    throw await this.mapErrorResponse(response, version);
  }

  /** True if `debug` is enabled in the resolved config. */
  isDebug(): boolean {
    return this.config.debug;
  }

  log(...args: unknown[]): void {
    if (this.config.debug) {
      console.log('[RuleClient]', ...args);
    }
  }

  private authHeaders(version: ApiVersion): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.apiKey}`,
      'Content-Type':
        version === 'v3' ? 'application/json;charset=utf-8' : 'application/json',
    };
  }

  private async mapErrorResponse(response: Response, version: ApiVersion): Promise<RuleApiError> {
    if (response.status === 429) {
      const error = new RuleApiError('Rate limited by Rule.io API', 429);

      if (version === 'v3') applyRateLimitHeaders(error, response.headers);

      if (error.retryAfterSeconds !== undefined) {
        this.log('Rate limited. Retry after', error.retryAfterSeconds, 'seconds');
      } else {
        this.log('Rate limited.');
      }

      return error;
    }

    if (response.status === 401) {
      const error = new RuleApiError('Invalid Rule.io API key', 401);

      if (version === 'v3') applyRateLimitHeaders(error, response.headers);

      return error;
    }

    let message = version === 'v3' ? 'Rule.io v3 API error' : 'Rule.io API error';
    let validationErrors: RuleValidationErrors | undefined;

    try {
      const text = await response.text();

      if (version === 'v3') this.log('Error response body:', text);

      if (text) {
        const parsed = JSON.parse(text) as JsonEnvelope;

        if (
          parsed.errors &&
          typeof parsed.errors === 'object' &&
          !Array.isArray(parsed.errors)
        ) {
          validationErrors = normalizeValidationErrors(parsed.errors);

          const fieldMessages = formatFieldMessages(validationErrors);

          if (fieldMessages) message = fieldMessages;
        } else if (parsed.error || parsed.message) {
          message = parsed.error || parsed.message || message;
        }
      }
    } catch {
      // Response body was not valid JSON — keep the default message.
    }

    const error = new RuleApiError(message, response.status);

    if (validationErrors) error.validationErrors = validationErrors;

    if (version === 'v3') applyRateLimitHeaders(error, response.headers);

    return error;
  }
}

const NON_NEGATIVE_INT = /^\s*\d+\s*$/;
const RULE_TIMESTAMP = /^\s*(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})\s*$/;

function readNonNegativeInt(headers: Headers, name: string): number | undefined {
  const raw = headers.get(name);

  return raw !== null && NON_NEGATIVE_INT.test(raw) ? Number.parseInt(raw, 10) : undefined;
}

// Rule.io is a Swedish company; the live v3 API emits `Retry-After` as a
// server-local timestamp without a timezone marker, in Stockholm time
// (CET / CEST with DST). `Intl.DateTimeFormat` resolves the offset for us
// including DST. If Rule.io ever relocates its servers, this becomes wrong;
// the safer alternative would be punting to `undefined`. We choose to be
// useful by default and document the assumption.
const RULE_SERVER_TZ = 'Europe/Stockholm';

const ruleServerWallFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: RULE_SERVER_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

function serverWallIso(utcMs: number): string {
  const parts: Record<string, string> = {};

  for (const part of ruleServerWallFormatter.formatToParts(new Date(utcMs))) {
    if (part.type !== 'literal') parts[part.type] = part.value;
  }

  // `Intl` can return 24:00:00 instead of 00:00:00 in some locales/runtimes.
  const hour = parts.hour === '24' ? '00' : parts.hour;

  return `${parts.year}-${parts.month}-${parts.day}T${hour}:${parts.minute}:${parts.second}Z`;
}

/**
 * Parse the `Retry-After` header into seconds-from-now.
 *
 * Three input forms are accepted:
 *
 * 1. Integer seconds (per Rule.io's published docs and RFC 7231) — returned as-is.
 * 2. `YYYY-MM-DD HH:MM:SS` without a timezone (the form Rule.io's live v3 API
 *    emits on real 429s, e.g. `2026-05-14 14:22:16`). The timestamp is in the
 *    server's local timezone (Europe/Stockholm). We use the response's `Date`
 *    header as the "server now" reference: convert it to the server's
 *    wall-clock frame, then diff against the retry-after wall components.
 *    The tz offset cancels (DST included).
 * 3. RFC 7231 HTTP-date — TODO; not yet observed from Rule.io.
 *
 * Returns `undefined` when the header is absent or the value can't be parsed,
 * or when the form-2 parse fails to find a usable `Date` header.
 */
function parseRetryAfter(headers: Headers): number | undefined {
  const raw = headers.get('Retry-After');

  if (raw === null) return undefined;

  if (NON_NEGATIVE_INT.test(raw)) return Number.parseInt(raw, 10);

  const match = RULE_TIMESTAMP.exec(raw);

  if (!match) return undefined;

  const dateHeader = headers.get('Date');

  if (dateHeader === null) return undefined;

  const serverNowUtcMs = Date.parse(dateHeader);

  if (Number.isNaN(serverNowUtcMs)) return undefined;

  const serverWallMs = Date.parse(serverWallIso(serverNowUtcMs));
  const retryWallMs = Date.parse(`${match[1]}T${match[2]}Z`);

  if (Number.isNaN(serverWallMs) || Number.isNaN(retryWallMs)) return undefined;

  return Math.max(0, Math.round((retryWallMs - serverWallMs) / 1000));
}

// Maps Rule.io v3's rate-limit headers onto a RuleApiError. Live v3 emits
// different header sets on different status codes:
//
//   on 200 / 4xx (non-429)        | on 429
//   ----------------------------- | ----------------------------------
//   RequestsCount-Allowed         | (absent — counter not echoed)
//   RequestsCount-Current         | (absent — counter not echoed)
//   X-ErrorPercent-Limit          | X-ErrorPercent-Limit
//   X-ErrorPercent-Current        | X-ErrorPercent-Current
//   (no Retry-After)              | Retry-After: YYYY-MM-DD HH:MM:SS
//                                 |   (server-local timestamp, no tz)
//
// The X-RateLimit-* family Rule.io's docs claim is never emitted in practice
// (probed May 2026, including a real 429). We still read those names because
// they're cheap and would Just Work if Rule.io ever aligns. We compute
// `rateLimitRemaining = Allowed - Current` (clamped non-negative) when the
// RequestsCount pair is present (i.e. on non-429 responses).
function applyRateLimitHeaders(error: RuleApiError, headers: Headers): RuleApiError {
  const retryAfter = parseRetryAfter(headers);

  if (retryAfter !== undefined) error.retryAfterSeconds = retryAfter;

  const documentedLimit = readNonNegativeInt(headers, 'X-RateLimit-Limit');
  const liveAllowed = readNonNegativeInt(headers, 'RequestsCount-Allowed');
  const liveCurrent = readNonNegativeInt(headers, 'RequestsCount-Current');

  if (documentedLimit !== undefined) {
    error.rateLimitLimit = documentedLimit;
  } else if (liveAllowed !== undefined) {
    error.rateLimitLimit = liveAllowed;
  }

  const documentedRemaining = readNonNegativeInt(headers, 'X-RateLimit-Remaining');

  if (documentedRemaining !== undefined) {
    error.rateLimitRemaining = documentedRemaining;
  } else if (liveAllowed !== undefined && liveCurrent !== undefined) {
    error.rateLimitRemaining = Math.max(0, liveAllowed - liveCurrent);
  }

  const errorPercentLimit = readNonNegativeInt(headers, 'X-ErrorPercent-Limit');

  if (errorPercentLimit !== undefined) error.errorPercentLimit = errorPercentLimit;

  const errorPercentCurrent = readNonNegativeInt(headers, 'X-ErrorPercent-Current');

  if (errorPercentCurrent !== undefined) error.errorPercentCurrent = errorPercentCurrent;

  return error;
}

function normalizeValidationErrors(
  raw: Record<string, unknown>
): RuleValidationErrors {
  const out: RuleValidationErrors = {};

  for (const [field, value] of Object.entries(raw)) {
    if (Array.isArray(value)) {
      out[field] = value.map((v) => String(v));
    } else if (typeof value === 'string') {
      out[field] = [value];
    }
    // Skip non-string, non-array values silently — matches legacy behavior.
  }

  return out;
}

function formatFieldMessages(errors: RuleValidationErrors): string {
  return Object.entries(errors)
    .map(([field, messages]) => messages.map((msg) => `${field}: ${msg}`).join('; '))
    .join('; ');
}
