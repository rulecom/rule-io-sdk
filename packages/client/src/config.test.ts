import { describe, expect, it } from 'vitest';

import { RuleConfigError } from '@rule-io/core';

import { resolveConfig } from './config.js';
import { RULE_API_V2_BASE_URL, RULE_API_V3_BASE_URL } from './constants.js';

describe('resolveConfig', () => {
  it('accepts a bare api-key string', () => {
    const c = resolveConfig('k');

    expect(c.apiKey).toBe('k');
    expect(c.baseUrlV2).toBe(RULE_API_V2_BASE_URL);
    expect(c.baseUrlV3).toBe(RULE_API_V3_BASE_URL);
    expect(c.debug).toBe(false);
    expect(c.fieldGroupPrefix).toBe('Booking');
    expect(c.fetch).toBe(globalThis.fetch);
  });

  it('honors overrides for every optional field', () => {
    const customFetch: typeof fetch = (() => undefined) as unknown as typeof fetch;
    const c = resolveConfig({
      apiKey: 'k',
      baseUrlV2: 'https://v2.example',
      baseUrlV3: 'https://v3.example',
      fetch: customFetch,
      debug: true,
      fieldGroupPrefix: 'Order',
    });

    expect(c).toEqual({
      apiKey: 'k',
      baseUrlV2: 'https://v2.example',
      baseUrlV3: 'https://v3.example',
      fetch: customFetch,
      debug: true,
      fieldGroupPrefix: 'Order',
    });
  });

  it('trims whitespace from fieldGroupPrefix', () => {
    expect(resolveConfig({ apiKey: 'k', fieldGroupPrefix: '  Order  ' }).fieldGroupPrefix)
      .toBe('Order');
  });

  it('throws RuleConfigError when apiKey is empty', () => {
    expect(() => resolveConfig('')).toThrow(RuleConfigError);
    expect(() => resolveConfig({ apiKey: '' })).toThrow(RuleConfigError);
  });

  it('throws RuleConfigError when fieldGroupPrefix is blank', () => {
    expect(() => resolveConfig({ apiKey: 'k', fieldGroupPrefix: '' })).toThrow(RuleConfigError);
    expect(() => resolveConfig({ apiKey: 'k', fieldGroupPrefix: '   ' })).toThrow(RuleConfigError);
  });

  it('throws RuleConfigError when fieldGroupPrefix contains a dot', () => {
    expect(() => resolveConfig({ apiKey: 'k', fieldGroupPrefix: 'A.B' })).toThrow(RuleConfigError);
  });
});
