import { describe, it, expect } from 'vitest'
import {
  validateJson,
  safeParseJson,
  JsonParseError,
  validateJsonSemantics,
  assertJsonSemantics,
  normalizeJson,
  type Json,
} from './validate-rcml-json.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyJson = Record<string, any>

// ─── validateJson ─────────────────────────────────────────────────────────────

describe('validateJson()', () => {
  const VALID_DOC: Json = {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }],
  }

  it('returns the input as Json when valid', () => {
    expect(validateJson(VALID_DOC)).toEqual(VALID_DOC)
  })

  it('throws JsonParseError when input is not a doc object', () => {
    expect(() => validateJson({ type: 'paragraph' })).toThrow(JsonParseError)
  })

  it('thrown JsonParseError has a non-empty .errors array', () => {
    try {
      validateJson(null)
    } catch (err) {
      expect(err).toBeInstanceOf(JsonParseError)

      if (err instanceof JsonParseError) {
        expect(err.errors.length).toBeGreaterThan(0)
        expect(err.errors[0]).toHaveProperty('path')
        expect(err.errors[0]).toHaveProperty('message')
      }
    }
  })
})

// ─── safeParseJson ────────────────────────────────────────────────────────────

describe('safeParseJson()', () => {
  const VALID_DOC: Json = {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }],
  }

  it('returns { success: true, data } for a valid doc', () => {
    const result = safeParseJson(VALID_DOC)

    expect(result.success).toBe(true)

    if (result.success) {
      expect(result.data).toEqual(VALID_DOC)
    }
  })

  it('returns { success: false, errors } for an invalid input', () => {
    const result = safeParseJson({ type: 'unknown' })

    expect(result.success).toBe(false)

    if (!result.success) {
      expect(result.errors.length).toBeGreaterThan(0)
    }
  })

  it('never throws', () => {
    expect(() => safeParseJson(null)).not.toThrow()
    expect(() => safeParseJson(undefined)).not.toThrow()
    expect(() => safeParseJson(42)).not.toThrow()
  })
})

// ─── validateJsonSemantics ────────────────────────────────────────────────────

describe('validateJsonSemantics()', () => {
  it('returns { success: true } for a canonical document', () => {
    const doc: Json = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }],
    }

    expect(validateJsonSemantics(doc)).toEqual({ success: true })
  })

  it('returns { success: false, issues } when a text node is empty', () => {
    const doc: Json = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }],
    }
    const result = validateJsonSemantics(doc)

    expect(result.success).toBe(false)

    if (!result.success) {
      expect(result.issues.some((i) => i.code === 'TEXT_EMPTY')).toBe(true)
    }
  })

  it('returns { success: false, issues } for marks: [] warning', () => {
    const doc: Json = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hi', marks: [] }] }],
    }
    const result = validateJsonSemantics(doc)

    expect(result.success).toBe(false)

    if (!result.success) {
      expect(result.issues.some((i) => i.code === 'ARRAY_EMPTY_MARKS')).toBe(true)
    }
  })
})

// ─── assertJsonSemantics ──────────────────────────────────────────────────────

describe('assertJsonSemantics()', () => {
  it('does not throw for a valid canonical document', () => {
    const doc: Json = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }],
    }

    expect(() => assertJsonSemantics(doc)).not.toThrow()
  })

  it('throws for a document with an empty text node (error severity)', () => {
    const doc: Json = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }],
    }

    expect(() => assertJsonSemantics(doc)).toThrow()
  })

  it('does not throw for a warning-only document (marks: [])', () => {
    const doc: Json = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hi', marks: [] }] }],
    }

    expect(() => assertJsonSemantics(doc)).not.toThrow()
  })

  it('includes "...and N more" in the message when there are more than 5 errors', () => {
    const doc: Json = {
      type: 'doc',
      content: Array.from({ length: 6 }, () => ({
        type: 'paragraph' as const,
        content: [{ type: 'text' as const, text: '' }],
      })),
    }

    expect(() => assertJsonSemantics(doc)).toThrow(/and 1 more/)
  })
})

// ─── normalizeJson ────────────────────────────────────────────────────────────

describe('normalizeJson()', () => {
  it('removes empty marks arrays from text nodes', () => {
    const doc: Json = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hi', marks: [] }] }],
    }
    const result = normalizeJson(doc)
    const textNode = (result.content[0] as AnyJson).content[0]

    expect(textNode).not.toHaveProperty('marks')
  })

  it('removes empty text nodes', () => {
    const doc: Json = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: '' },
            { type: 'text', text: 'hello' },
          ],
        },
      ],
    }
    const result = normalizeJson(doc)
    const content = (result.content[0] as AnyJson).content

    expect(content).toHaveLength(1)
    expect(content[0].text).toBe('hello')
  })

  it('merges adjacent text nodes with identical mark sets', () => {
    const doc: Json = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'foo' },
            { type: 'text', text: 'bar' },
          ],
        },
      ],
    }
    const result = normalizeJson(doc)
    const content = (result.content[0] as AnyJson).content

    expect(content).toHaveLength(1)
    expect(content[0].text).toBe('foobar')
  })
})
