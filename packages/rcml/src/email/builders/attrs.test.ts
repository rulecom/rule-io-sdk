import { describe, expect, it } from 'vitest'
import { normalizeAttrs, validateAttrs } from './attrs.js'

describe('validateAttrs', () => {
  it('returns no issues for an empty / undefined attr map', () => {
    expect(validateAttrs('rc-text', undefined)).toEqual([])
    expect(validateAttrs('rc-text', {})).toEqual([])
  })

  it('accepts a valid attribute value', () => {
    expect(validateAttrs('rc-text', { align: 'center', color: '#333' })).toEqual([])
  })

  it('flags an unknown attribute', () => {
    const issues = validateAttrs('rc-text', { 'not-an-attr': 'value' })
    expect(issues).toHaveLength(1)
    expect(issues[0]).toMatchObject({
      code: 'ATTR_UNKNOWN',
      path: 'attrs/not-an-attr',
    })
  })

  it('flags an invalid attribute value', () => {
    const issues = validateAttrs('rc-text', { color: 'not-a-color' })
    expect(issues).toHaveLength(1)
    expect(issues[0]).toMatchObject({
      code: 'ATTR_INVALID_VALUE',
      path: 'attrs/color',
    })
  })

  it('skips undefined values (they mean "omit")', () => {
    expect(validateAttrs('rc-text', { color: undefined })).toEqual([])
  })

  it('collects issues across multiple attrs', () => {
    // Note: `#bad` is a valid 3-digit hex color — use an unambiguously bad value.
    const issues = validateAttrs('rc-text', { color: 'rainbow', align: 'nope' })
    expect(issues).toHaveLength(2)
    expect(issues.map((i) => i.code).sort()).toEqual(['ATTR_INVALID_VALUE', 'ATTR_INVALID_VALUE'])
  })
})

describe('normalizeAttrs', () => {
  it('returns undefined for empty / undefined input', () => {
    expect(normalizeAttrs(undefined)).toBeUndefined()
    expect(normalizeAttrs({})).toBeUndefined()
  })

  it('returns undefined when every value is undefined', () => {
    expect(normalizeAttrs({ a: undefined, b: undefined })).toBeUndefined()
  })

  it('strips undefined entries, keeps defined ones', () => {
    expect(normalizeAttrs({ a: 'x', b: undefined, c: 1 })).toEqual({ a: 'x', c: 1 })
  })
})
