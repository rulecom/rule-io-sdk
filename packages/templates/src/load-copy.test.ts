import { describe, expect, it } from 'vitest'

import { loadCopy } from './load-copy.js'

interface FixtureCopy {
  hello: string
  greeting: string
}

describe('loadCopy', () => {
  it('parses a JSON file resolved relative to import.meta.url', () => {
    const copy = loadCopy<FixtureCopy>(import.meta.url, './load-copy-fixture.json')

    expect(copy.hello).toBe('Hello')
    expect(copy.greeting).toBe('Hi {{name}}')
  })

  it('returns the parsed object typed as the generic parameter (compile-time check)', () => {
    const copy = loadCopy<FixtureCopy>(import.meta.url, './load-copy-fixture.json')
    // Assign to the typed slot — would fail to compile if loadCopy
    // returned `unknown` instead of the generic.
    const slot: FixtureCopy = copy

    expect(slot).toBeDefined()
  })

  it('throws when the JSON file is not found', () => {
    expect(() =>
      loadCopy(import.meta.url, './missing-copy.json'),
    ).toThrow(/ENOENT/)
  })
})
