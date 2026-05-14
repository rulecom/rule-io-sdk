import { describe, expect, it } from 'vitest';

import { buildQueryString } from './query-string.js';

describe('buildQueryString', () => {
  it('returns an empty string when every value is undefined/null', () => {
    expect(buildQueryString({})).toBe('');
    expect(buildQueryString({ a: undefined, b: null })).toBe('');
  });

  it('serializes scalars and skips nullish values', () => {
    expect(
      buildQueryString({ a: 1, b: 'x', c: true, d: null, e: undefined })
    ).toBe('?a=1&b=x&c=true');
  });

  it('emits one pair per array element', () => {
    expect(buildQueryString({ 'ids[]': [1, 2, 3] })).toBe(
      '?ids%5B%5D=1&ids%5B%5D=2&ids%5B%5D=3'
    );
  });

  it('drops nullish entries inside arrays', () => {
    expect(buildQueryString({ ids: [1, undefined, null, 2] })).toBe(
      '?ids=1&ids=2'
    );
  });

  it('encodes special characters in keys and values', () => {
    expect(buildQueryString({ 'a&b': 'c d' })).toBe('?a%26b=c%20d');
  });
});
