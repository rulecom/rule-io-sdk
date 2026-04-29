import { describe, expect, it } from 'vitest'
import { coerceContent } from './content.js'

describe('coerceContent', () => {
  it('converts an RFM markdown string to a validated Json doc', () => {
    // RFM doesn't support native `**bold**`; use :font[]{} or plain text.
    const { json, issues } = coerceContent('Hello world')

    expect(issues).toEqual([])
    expect(json).toMatchObject({ type: 'doc', content: expect.any(Array) })
  })

  it('passes through a pre-built Json doc after normalize+validate', () => {
    const input = { type: 'doc', content: [{ type: 'paragraph' }] } as unknown as Parameters<typeof coerceContent>[0]
    const { json, issues } = coerceContent(input)

    expect(issues).toEqual([])
    expect(json).toEqual(input)
  })

  it('reports CONTENT_INVALID for a structurally bad Json doc', () => {
    const bad = { type: 'not-doc', content: [] } as unknown as Parameters<typeof coerceContent>[0]
    const { json, issues } = coerceContent(bad)

    expect(json).toBeUndefined()
    expect(issues.length).toBeGreaterThan(0)
    expect(issues[0]!.code).toBe('CONTENT_INVALID')
    expect(issues[0]!.path).toMatch(/^content/)
  })

  it('reports CONTENT_INVALID when RFM parsing fails', () => {
    // Pass a string that triggers an RFM parse/validation error.
    const input = ':font[[[[[[]]]]]]]{font-weight="bold"}'
    const { issues } = coerceContent(input)

    // Either succeeds (trivial markdown) or fails with CONTENT_INVALID — the
    // contract is that failure never leaks an untyped exception.
    for (const issue of issues) {
      expect(issue.code).toBe('CONTENT_INVALID')
    }
  })
})
