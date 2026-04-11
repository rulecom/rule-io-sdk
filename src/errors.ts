/**
 * Rule.io SDK Error Classes
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

  constructor(
    message: string,
    public statusCode: number,
    public requestId?: string
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
   * Check if this is a server error
   */
  isServerError(): boolean {
    return this.statusCode >= 500;
  }
}

/**
 * Error thrown when the client is not configured properly
 */
export class RuleConfigError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'RuleConfigError';
  }
}
