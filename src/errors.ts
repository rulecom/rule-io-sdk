/**
 * Rule.io SDK Error Classes
 */

/**
 * Custom error class for Rule.io API errors
 */
export class RuleApiError extends Error {
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
  constructor(message: string) {
    super(message);
    this.name = 'RuleConfigError';
  }
}
