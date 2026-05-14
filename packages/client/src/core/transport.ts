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
 */

import { RuleApiError, type RuleValidationErrors } from '../errors.js';

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
  constructor(private readonly config: TransportConfig) {}

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
   */
  async fetchRaw(
    method: string,
    endpoint: string,
    opts: RequestOptions = {}
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
      const retryAfter = response.headers.get('Retry-After') || '60';

      this.log('Rate limited. Retry after', retryAfter, 'seconds');

      const error = new RuleApiError('Rate limited by Rule.io API', 429);

      if (version === 'v3') applyRateLimitHeaders(error, response.headers);

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

function readNonNegativeInt(headers: Headers, name: string): number | undefined {
  const raw = headers.get(name);

  return raw !== null && NON_NEGATIVE_INT.test(raw) ? Number.parseInt(raw, 10) : undefined;
}

// Maps Rule.io v3's rate-limit headers onto a RuleApiError. The headers Rule.io
// actually emits diverge from the names in their public docs:
//
//   docs claim            | live v3 header          | semantics
//   --------------------- | ----------------------- | --------------------------------
//   X-RateLimit-Limit     | RequestsCount-Allowed   | max requests per window
//   X-RateLimit-Remaining | RequestsCount-Current   | requests **used** (not remaining!)
//   Retry-After           | Retry-After             | seconds to wait (likely 429-only)
//   (undocumented)        | X-ErrorPercent-Limit    | the 49% trigger ceiling
//   (undocumented)        | X-ErrorPercent-Current  | observed error rate
//
// We read the live names but prefer the documented ones if Rule.io ever ships
// them. `rateLimitRemaining` is computed (`Allowed − Current`) when only the
// live pair is available.
//
// Only the integer-seconds form of Retry-After is parsed; the HTTP-date form
// (RFC 7231) is ignored. TODO: HTTP-date if Rule.io ever adopts it.
function applyRateLimitHeaders(error: RuleApiError, headers: Headers): RuleApiError {
  const retryAfter = readNonNegativeInt(headers, 'Retry-After');

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
