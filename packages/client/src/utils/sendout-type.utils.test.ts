import { describe, it, expect } from 'vitest';
import { toNumericSendout } from './sendout-type.utils.js';

describe('toNumericSendout', () => {
  it('returns a number value as-is', () => {
    expect(toNumericSendout(1)).toBe(1);
    expect(toNumericSendout(2)).toBe(2);
  });

  it('unwraps the numeric value from an API response object', () => {
    expect(toNumericSendout({ value: 1, key: 'campaign', description: 'Campaign' })).toBe(1);
    expect(toNumericSendout({ value: 2, key: 'transaction', description: 'Transactional' })).toBe(2);
  });

  it('returns undefined for an object whose value property is not a number', () => {
    expect(toNumericSendout({ value: 'campaign' })).toBeUndefined();
    expect(toNumericSendout({ value: null })).toBeUndefined();
  });

  it('returns undefined for an object without a value property', () => {
    expect(toNumericSendout({})).toBeUndefined();
    expect(toNumericSendout({ key: 'campaign' })).toBeUndefined();
  });

  it('returns undefined for null, undefined, and non-object primitives', () => {
    expect(toNumericSendout(null)).toBeUndefined();
    expect(toNumericSendout(undefined)).toBeUndefined();
    expect(toNumericSendout('1')).toBeUndefined();
    expect(toNumericSendout(true)).toBeUndefined();
  });

  it('returns undefined for non-finite numbers (NaN, Infinity)', () => {
    expect(toNumericSendout(NaN)).toBeUndefined();
    expect(toNumericSendout(Infinity)).toBeUndefined();
    expect(toNumericSendout(-Infinity)).toBeUndefined();
    expect(toNumericSendout({ value: NaN })).toBeUndefined();
    expect(toNumericSendout({ value: Infinity })).toBeUndefined();
  });
});
