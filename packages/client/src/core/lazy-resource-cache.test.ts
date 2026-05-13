import { describe, expect, it } from 'vitest';

import { LazyResourceCache } from './lazy-resource-cache.js';

describe('LazyResourceCache', () => {
  it('stores and retrieves values', () => {
    const cache = new LazyResourceCache();

    cache.set('a', 42);
    expect(cache.get<number>('a')).toBe(42);
    expect(cache.has('a')).toBe(true);
    expect(cache.size).toBe(1);
  });

  it('returns undefined for missing keys', () => {
    const cache = new LazyResourceCache();

    expect(cache.get('missing')).toBeUndefined();
    expect(cache.has('missing')).toBe(false);
  });

  it('preserves identity for stored references', () => {
    const cache = new LazyResourceCache();
    const obj = { id: 1 };

    cache.set('o', obj);
    expect(cache.get<typeof obj>('o')).toBe(obj);
  });
});
