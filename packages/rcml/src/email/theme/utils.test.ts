import { describe, expect, it } from 'vitest'

import { deepClone } from './utils.js'

describe('deepClone', () => {
  it('clones a nested POJO so the copy and original share no references', () => {
    const original = { a: 1, b: { c: [2, 3] } }
    const copy = deepClone(original)

    expect(copy).toEqual(original)
    expect(copy).not.toBe(original)
    expect(copy.b).not.toBe(original.b)
    expect(copy.b.c).not.toBe(original.b.c)
  })

  it('preserves primitive values', () => {
    expect(deepClone('hello')).toBe('hello')
    expect(deepClone(42)).toBe(42)
    expect(deepClone(true)).toBe(true)
    expect(deepClone(null)).toBeNull()
  })

  it('drops undefined fields (JSON round-trip limitation)', () => {
    expect(deepClone({ a: 1, b: undefined })).toEqual({ a: 1 })
  })
})
