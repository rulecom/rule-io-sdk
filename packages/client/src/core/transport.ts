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

import { RuleApiError, type RuleValidationErrors } from '@rule-io/core';

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

      return new RuleApiError('Rate limited by Rule.io API', 429);
    }

    if (response.status === 401) {
      return new RuleApiError('Invalid Rule.io API key', 401);
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

    return error;
  }
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
