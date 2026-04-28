import { describe, it, expect } from 'vitest';
import { RuleApiError, RuleConfigError } from '../src/errors.js';

describe('@rule-io/core errors', () => {
  it('RuleApiError is an Error subclass carrying statusCode', () => {
    const err = new RuleApiError('boom', 400);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(RuleApiError);
    expect(err.name).toBe('RuleApiError');
    expect(err.message).toBe('boom');
    expect(err.statusCode).toBe(400);
  });

  it('RuleApiError status-code helpers report the right category', () => {
    expect(new RuleApiError('', 401).isAuthError()).toBe(true);
    expect(new RuleApiError('', 404).isNotFound()).toBe(true);
    expect(new RuleApiError('', 429).isRateLimited()).toBe(true);
    expect(new RuleApiError('', 422).isValidationError()).toBe(true);
    expect(new RuleApiError('', 503).isServerError()).toBe(true);
  });

  it('RuleConfigError preserves cause when provided', () => {
    const cause = new Error('underlying');
    const err = new RuleConfigError('bad config', { cause });
    expect(err).toBeInstanceOf(RuleConfigError);
    expect(err.name).toBe('RuleConfigError');
    expect(err.cause).toBe(cause);
  });
});
