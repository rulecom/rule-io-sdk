import { describe, expect, it } from 'vitest';

import { RuleApiError, RuleClientError } from './errors.js';

describe('RuleApiError', () => {
  it('is an instance of Error and RuleApiError', () => {
    const err = new RuleApiError('Bad request', 400);

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(RuleApiError);
  });

  it('sets message, name, and statusCode', () => {
    const err = new RuleApiError('Not found', 404);

    expect(err.message).toBe('Not found');
    expect(err.name).toBe('RuleApiError');
    expect(err.statusCode).toBe(404);
  });

  it('isRateLimited returns true only for 429', () => {
    expect(new RuleApiError('Rate limited', 429).isRateLimited()).toBe(true);
    expect(new RuleApiError('Other', 400).isRateLimited()).toBe(false);
  });

  it('isAuthError returns true only for 401', () => {
    expect(new RuleApiError('Unauthorized', 401).isAuthError()).toBe(true);
    expect(new RuleApiError('Other', 403).isAuthError()).toBe(false);
  });

  it('isNotFound returns true only for 404', () => {
    expect(new RuleApiError('Not found', 404).isNotFound()).toBe(true);
    expect(new RuleApiError('Other', 400).isNotFound()).toBe(false);
  });

  it('isValidationError returns true for 400 and 422', () => {
    expect(new RuleApiError('Bad request', 400).isValidationError()).toBe(true);
    expect(new RuleApiError('Unprocessable', 422).isValidationError()).toBe(true);
    expect(new RuleApiError('Other', 404).isValidationError()).toBe(false);
  });

  it('isConflict returns true only for 409', () => {
    expect(new RuleApiError('Conflict', 409).isConflict()).toBe(true);
    expect(new RuleApiError('Other', 400).isConflict()).toBe(false);
  });

  it('isServerError returns true for 500+', () => {
    expect(new RuleApiError('Internal error', 500).isServerError()).toBe(true);
    expect(new RuleApiError('Gateway error', 502).isServerError()).toBe(true);
    expect(new RuleApiError('Client error', 404).isServerError()).toBe(false);
  });

  it('validationErrors is initially undefined and can be set', () => {
    const err = new RuleApiError('Validation', 422);

    expect(err.validationErrors).toBeUndefined();
    err.validationErrors = { email: ['invalid format'] };
    expect(err.validationErrors).toEqual({ email: ['invalid format'] });
  });
});

describe('RuleClientError', () => {
  it('is an instance of Error and RuleClientError', () => {
    const err = new RuleClientError('Missing credentials');

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(RuleClientError);
  });

  it('sets message and name', () => {
    const err = new RuleClientError('Invalid argument');

    expect(err.message).toBe('Invalid argument');
    expect(err.name).toBe('RuleClientError');
  });

  it('wraps a cause when provided', () => {
    const cause = new Error('original');
    const err = new RuleClientError('Wrapped', { cause });

    expect(err.cause).toBe(cause);
  });
});
