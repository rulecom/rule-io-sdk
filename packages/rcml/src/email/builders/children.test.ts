import { describe, expect, it } from 'vitest'
import { validateChildren } from './children.js'

describe('validateChildren', () => {
  it('accepts a valid children list', () => {
    expect(
      validateChildren('rc-section', [{ tagName: 'rc-column' }, { tagName: 'rc-column' }]),
    ).toEqual([])
  })

  it('flags a child with a disallowed tag', () => {
    const issues = validateChildren('rc-section', [{ tagName: 'rc-text' }])

    expect(issues).toHaveLength(1)
    expect(issues[0]).toMatchObject({ code: 'CHILD_INVALID', path: 'children/0' })
    expect(issues[0]!.message).toContain('<rc-text>')
  })

  it('flags a child without a valid tagName', () => {
    const issues = validateChildren('rc-section', [{ tagName: undefined }])

    expect(issues).toHaveLength(1)
    expect(issues[0]!.code).toBe('CHILD_INVALID')
  })

  it('flags when children exceed maxChildCount', () => {
    const twenty = Array.from({ length: 21 }, () => ({ tagName: 'rc-column' as const }))
    const issues = validateChildren('rc-section', twenty)

    expect(issues.some((i) => i.code === 'CHILD_TOO_MANY')).toBe(true)
  })

  it('reports the index of the offending child', () => {
    const issues = validateChildren('rc-section', [
      { tagName: 'rc-column' },
      { tagName: 'rc-text' },
    ])

    expect(issues[0]!.path).toBe('children/1')
  })

  it('accepts an empty children list (count-check only)', () => {
    expect(validateChildren('rc-section', [])).toEqual([])
  })
})
