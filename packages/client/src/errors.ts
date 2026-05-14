/**
 * Rule.io HTTP API Error Classes
 */

/**
 * Field-level validation errors returned by the Rule.io v3 API.
 *
 * Maps field names to arrays of error messages.
 *
 * @example
 * ```typescript
 * // { automail_setting: ["The automail setting field is required..."] }
 * ```
 */
export type RuleValidationErrors = Record<string, string[]>;

/**
 * Custom error class for Rule.io API errors
 */
export class RuleApiError extends Error {
  /**
   * Field-level validation errors from the v3 API, if present.
   *
   * When the API returns an `errors` object with field-specific messages,
   * they are captured here for programmatic access.
   *
   * @example
   * ```typescript
   * try {
   *   await client.updateAutomail(id, data);
   * } catch (error) {
   *   if (error instanceof RuleApiError && error.validationErrors) {
   *     for (const [field, messages] of Object.entries(error.validationErrors)) {
   *       console.log(`${field}: ${messages.join(', ')}`);
   *     }
   *   }
   * }
   * ```
   */
  public validationErrors?: RuleValidationErrors;

  /**
   * Seconds the server asks the client to wait before retrying, parsed from
   * the `Retry-After` response header (v3 endpoints only).
   *
   * Rule.io's rate-limit contract triggers on a 49% error rate, so retrying
   * before this delay actively accelerates the block. Consumer retry layers
   * should prefer this value over a local backoff guess.
   *
   * Two input forms are accepted:
   *  - integer seconds (per RFC 7231 / Rule.io's published docs)
   *  - `YYYY-MM-DD HH:MM:SS` without a timezone (the form Rule.io v3 actually
   *    emits on real 429s). The timestamp is interpreted as `Europe/Stockholm`
   *    (CET/CEST). The delta is computed by converting the response `Date`
   *    header to the same timezone so the fixed offset cancels; a DST
   *    transition within the retry window could still cause ±3600 s error.
   *
   * RFC 7231 HTTP-date is not yet supported (TODO). Field is `undefined`
   * when the header is absent or can't be parsed.
   */
  public retryAfterSeconds?: number;

  /**
   * Maximum requests permitted in the current rate-limit window
   * (v3 endpoints only).
   *
   * Sourced from `RequestsCount-Allowed` (the header v3 actually emits) or
   * `X-RateLimit-Limit` (the documented name — used if Rule.io ever aligns).
   *
   * `undefined` when neither header is present.
   */
  public rateLimitLimit?: number;

  /**
   * Remaining requests in the current rate-limit window (v3 endpoints only).
   *
   * Sourced from `X-RateLimit-Remaining` if Rule.io ever ships it; otherwise
   * computed as `RequestsCount-Allowed − RequestsCount-Current` (clamped to
   * a non-negative integer).
   *
   * `undefined` when no header data is available to derive the value.
   */
  public rateLimitRemaining?: number;

  /**
   * The error-rate ceiling that, once crossed, triggers a rate-limit block.
   * Parsed from `X-ErrorPercent-Limit` (v3 endpoints only). Rule.io's
   * documented value is `49`.
   *
   * Consumer retry layers should treat this together with `errorPercentCurrent`
   * — retrying after a 4xx counts toward the error-percent budget.
   *
   * `undefined` when the header is absent.
   */
  public errorPercentLimit?: number;

  /**
   * The current observed error-rate, parsed from `X-ErrorPercent-Current`
   * (v3 endpoints only).
   *
   * `undefined` when the header is absent.
   */
  public errorPercentCurrent?: number;

  /** @deprecated This property is never populated. It will be removed in the next major version. */
  readonly requestId?: string;

  constructor(
    message: string,
    public statusCode: number,
    /** @deprecated This parameter is ignored. requestId will be removed in the next major version. */
    _requestId?: string,
  ) {
    super(message);
    this.name = 'RuleApiError';
  }

  /**
   * Check if this is a rate limiting error
   */
  isRateLimited(): boolean {
    return this.statusCode === 429;
  }

  /**
   * Check if this is an authentication error
   */
  isAuthError(): boolean {
    return this.statusCode === 401;
  }

  /**
   * Check if this is a not found error
   */
  isNotFound(): boolean {
    return this.statusCode === 404;
  }

  /**
   * Check if this is a validation error
   */
  isValidationError(): boolean {
    return this.statusCode === 400 || this.statusCode === 422;
  }

  /**
   * Check if this is a conflict error (resource already exists)
   */
  isConflict(): boolean {
    return this.statusCode === 409;
  }

  /**
   * Check if this is a server error
   */
  isServerError(): boolean {
    return this.statusCode >= 500;
  }
}

/**
 * Error thrown when the client is called incorrectly — missing credentials,
 * invalid method arguments, or unsatisfied preconditions.
 */
export class RuleClientError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'RuleClientError';
  }
}
