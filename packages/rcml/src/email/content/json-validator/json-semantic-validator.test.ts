import { describe, it, expect } from 'vitest'
import { validateJsonSemantics, assertJsonSemantics, normalizeJson } from '../../validate-rcml-json.js'
import type { Json, TextNode, Mark } from './types.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nullFontMark(overrides: Partial<Record<string, unknown>> = {}): Mark {
  return {
    type: 'font',
    attrs: {
      'font-family': null,
      'font-size': null,
      'line-height': null,
      'letter-spacing': null,
      'font-style': null,
      'font-weight': null,
      'text-decoration': null,
      color: null,
      ...overrides,
    },
  }
}

function boldMark(): Mark {
  return nullFontMark({ 'font-weight': 'bold' })
}

function linkMark(): Mark {
  return { type: 'link', attrs: { href: 'https://example.com', target: null, 'no-tracked': 'false' } }
}

function text(value: string, marks?: Mark[]): TextNode {
  return marks ? { type: 'text', text: value, marks } : { type: 'text', text: value }
}

function doc(...blocks: Json['content']): Json {
  return { type: 'doc', content: blocks }
}

function para(...inlines: TextNode[]): Json['content'][number] {
  return { type: 'paragraph', content: inlines }
}

// ─── Valid documents ───────────────────────────────────────────────────────────

describe('validateJsonSemantics — valid documents', () => {
  it('returns success: true for a minimal doc', () => {
    expect(validateJsonSemantics(doc(para(text('Hello'))))).toEqual({ success: true })
  })

  it('returns success: true for a doc with font mark', () => {
    const result = validateJsonSemantics(doc(para(text('Bold', [boldMark()]))))

    expect(result.success).toBe(true)
  })

  it('returns success: true for a doc with link and font mark', () => {
    const result = validateJsonSemantics(doc(para(text('Click', [boldMark(), linkMark()]))))

    expect(result.success).toBe(true)
  })

  it('returns success: true for multiple non-adjacent text nodes', () => {
    const result = validateJsonSemantics(
      doc(para(text('Hello '), text('world', [boldMark()]))),
    )

    expect(result.success).toBe(true)
  })

  it('returns success: true for empty paragraph (no content)', () => {
    const emptyPara = { type: 'paragraph' as const }
    const result = validateJsonSemantics(doc(emptyPara))

    expect(result.success).toBe(true)
  })

  it('returns success: true for doc with a bullet-list', () => {
    const bulletList = {
      type: 'bullet-list' as const,
      attrs: { spread: false },
      content: [
        {
          type: 'list-item' as const,
          attrs: { label: '•', 'list-type': 'bullet', spread: 'true' },
          content: [para(text('item'))],
        },
      ],
    }

    expect(validateJsonSemantics(doc(bulletList))).toEqual({ success: true })
  })

  it('returns success: true for doc with align block', () => {
    const align = {
      type: 'align' as const,
      attrs: { value: 'center' as const },
      content: [para(text('centered'))],
    }

    expect(validateJsonSemantics(doc(align))).toEqual({ success: true })
  })
})

// ─── MARK_DUPLICATE ───────────────────────────────────────────────────────────

describe('validateJsonSemantics — MARK_DUPLICATE', () => {
  it('reports error for two font marks on one text node', () => {
    const result = validateJsonSemantics(
      doc(para(text('x', [boldMark(), nullFontMark({ color: 'red' })]))),
    )

    expect(result.success).toBe(false)

    if (!result.success) {
      const codes = result.issues.map((i) => i.code)

      expect(codes).toContain('MARK_DUPLICATE')
    }
  })

  it('reports error for two link marks on one text node', () => {
    const result = validateJsonSemantics(doc(para(text('x', [linkMark(), linkMark()]))))

    expect(result.success).toBe(false)

    if (!result.success) {
      expect(result.issues[0]?.code).toBe('MARK_DUPLICATE')
      expect(result.issues[0]?.severity).toBe('error')
    }
  })

  it('MARK_DUPLICATE has error severity', () => {
    const result = validateJsonSemantics(doc(para(text('x', [boldMark(), boldMark()]))))

    if (!result.success) {
      const dup = result.issues.find((i) => i.code === 'MARK_DUPLICATE')

      expect(dup?.severity).toBe('error')
    }
  })

  it('does not report MARK_DUPLICATE for font + link (different types)', () => {
    const result = validateJsonSemantics(doc(para(text('x', [boldMark(), linkMark()]))))

    expect(result.success).toBe(true)
  })
})

// ─── MARK_ALL_NULL ────────────────────────────────────────────────────────────

describe('validateJsonSemantics — MARK_ALL_NULL', () => {
  it('reports warning for font mark with all null attrs', () => {
    const result = validateJsonSemantics(doc(para(text('x', [nullFontMark()]))))

    expect(result.success).toBe(false)

    if (!result.success) {
      const issue = result.issues.find((i) => i.code === 'MARK_ALL_NULL')

      expect(issue).toBeDefined()
      expect(issue?.severity).toBe('warning')
    }
  })

  it('does not report MARK_ALL_NULL when at least one attr is non-null', () => {
    const result = validateJsonSemantics(doc(para(text('x', [boldMark()]))))

    expect(result.success).toBe(true)
  })
})

// ─── TEXT_EMPTY ───────────────────────────────────────────────────────────────

describe('validateJsonSemantics — TEXT_EMPTY', () => {
  it('reports error for empty text node', () => {
    const result = validateJsonSemantics(doc(para(text(''))))

    expect(result.success).toBe(false)

    if (!result.success) {
      expect(result.issues[0]?.code).toBe('TEXT_EMPTY')
      expect(result.issues[0]?.severity).toBe('error')
    }
  })

  it('does not report TEXT_EMPTY for non-empty text', () => {
    const result = validateJsonSemantics(doc(para(text('hello'))))

    expect(result.success).toBe(true)
  })

  it('reports TEXT_EMPTY nested inside a list', () => {
    const bulletList = {
      type: 'bullet-list' as const,
      attrs: { spread: false },
      content: [
        {
          type: 'list-item' as const,
          attrs: { label: '•', 'list-type': 'bullet', spread: 'true' },
          content: [para(text(''))],
        },
      ],
    }
    const result = validateJsonSemantics(doc(bulletList))

    expect(result.success).toBe(false)

    if (!result.success) {
      expect(result.issues.some((i) => i.code === 'TEXT_EMPTY')).toBe(true)
    }
  })
})

// ─── TEXT_ADJACENT ────────────────────────────────────────────────────────────

describe('validateJsonSemantics — TEXT_ADJACENT', () => {
  it('reports warning for two consecutive plain text nodes', () => {
    const result = validateJsonSemantics(doc(para(text('Hello '), text('world'))))

    expect(result.success).toBe(false)

    if (!result.success) {
      expect(result.issues[0]?.code).toBe('TEXT_ADJACENT')
      expect(result.issues[0]?.severity).toBe('warning')
    }
  })

  it('does not report TEXT_ADJACENT for different mark sets', () => {
    const result = validateJsonSemantics(
      doc(para(text('Hello '), text('world', [boldMark()]))),
    )

    expect(result.success).toBe(true)
  })

  it('reports TEXT_ADJACENT for two bold text nodes', () => {
    const result = validateJsonSemantics(
      doc(para(text('Hello ', [boldMark()]), text('world', [boldMark()]))),
    )

    expect(result.success).toBe(false)

    if (!result.success) {
      expect(result.issues.some((i) => i.code === 'TEXT_ADJACENT')).toBe(true)
    }
  })

  it('does not report TEXT_ADJACENT for plain text followed by non-text', () => {
    const placeholder = {
      type: 'placeholder' as const,
      attrs: {
        type: 'Subscriber' as const,
        value: null,
        name: 'n',
        original: 'o',
        'max-length': null,
      },
    }
    const result = validateJsonSemantics(
      doc({ type: 'paragraph', content: [text('Hello '), placeholder] }),
    )

    expect(result.success).toBe(true)
  })
})

// ─── ARRAY_EMPTY_MARKS ────────────────────────────────────────────────────────

describe('validateJsonSemantics — ARRAY_EMPTY_MARKS', () => {
  it('reports warning for marks: []', () => {
    const nodeWithEmptyMarks = { type: 'text', text: 'hi', marks: [] as Mark[] }
    const result = validateJsonSemantics(
      // @ts-expect-error empty marks is semantically invalid but type-allows it
      doc(para(nodeWithEmptyMarks)),
    )

    expect(result.success).toBe(false)

    if (!result.success) {
      expect(result.issues[0]?.code).toBe('ARRAY_EMPTY_MARKS')
      expect(result.issues[0]?.severity).toBe('warning')
    }
  })

  it('does not report ARRAY_EMPTY_MARKS when marks is omitted', () => {
    const result = validateJsonSemantics(doc(para(text('hello'))))

    expect(result.success).toBe(true)
  })
})

// ─── Error paths ──────────────────────────────────────────────────────────────

describe('validateJsonSemantics — issue paths', () => {
  it('includes a non-empty path for issues', () => {
    const result = validateJsonSemantics(doc(para(text(''))))

    if (!result.success) {
      expect(result.issues[0]?.path.length).toBeGreaterThan(0)
    }
  })

  it('path points to the text node', () => {
    const result = validateJsonSemantics(doc(para(text(''))))

    if (!result.success) {
      expect(result.issues[0]?.path).toBe('/content/0/content/0')
    }
  })

  it('path points to the mark for MARK_DUPLICATE', () => {
    const result = validateJsonSemantics(doc(para(text('x', [boldMark(), boldMark()]))))

    if (!result.success) {
      const dup = result.issues.find((i) => i.code === 'MARK_DUPLICATE')

      expect(dup?.path).toBe('/content/0/content/0/marks/1')
    }
  })
})

// ─── assertJsonSemantics ──────────────────────────────────────────────────────

describe('assertJsonSemantics', () => {
  it('does not throw for a valid doc', () => {
    expect(() => assertJsonSemantics(doc(para(text('Hello'))))).not.toThrow()
  })

  it('throws on errors (TEXT_EMPTY)', () => {
    expect(() => assertJsonSemantics(doc(para(text(''))))).toThrow()
  })

  it('throws on errors (MARK_DUPLICATE)', () => {
    expect(() => assertJsonSemantics(doc(para(text('x', [boldMark(), boldMark()]))))).toThrow()
  })

  it('does NOT throw on warnings-only (MARK_ALL_NULL)', () => {
    // Only warnings, no errors → should not throw
    expect(() => assertJsonSemantics(doc(para(text('x', [nullFontMark()]))))).not.toThrow()
  })

  it('does NOT throw on warnings-only (TEXT_ADJACENT)', () => {
    expect(() => assertJsonSemantics(doc(para(text('a'), text('b'))))).not.toThrow()
  })
})

// ─── normalizeJson ────────────────────────────────────────────────────────────

describe('normalizeJson', () => {
  it('removes empty text nodes', () => {
    const input = doc(para(text(''), text('hello')))
    const result = normalizeJson(input)
    const content = (result.content[0] as { content: unknown[] }).content

    expect(content).toHaveLength(1)
    expect((content[0] as { text: string }).text).toBe('hello')
  })

  it('removes marks: [] from text nodes', () => {
    const input = doc(para({ type: 'text', text: 'hi', marks: [] as Mark[] }))
    const result = normalizeJson(input)
    const node = ((result.content[0] as { content: unknown[] }).content[0]) as TextNode

    expect(node.marks).toBeUndefined()
  })

  it('merges adjacent plain text nodes', () => {
    const input = doc(para(text('Hello '), text('world')))
    const result = normalizeJson(input)
    const content = (result.content[0] as { content: unknown[] }).content

    expect(content).toHaveLength(1)
    expect((content[0] as { text: string }).text).toBe('Hello world')
  })

  it('merges adjacent text nodes with the same marks', () => {
    const input = doc(para(text('Hello ', [boldMark()]), text('world', [boldMark()])))
    const result = normalizeJson(input)
    const content = (result.content[0] as { content: unknown[] }).content

    expect(content).toHaveLength(1)
    expect((content[0] as { text: string }).text).toBe('Hello world')
  })

  it('does not merge text nodes with different marks', () => {
    const input = doc(para(text('Hello '), text('world', [boldMark()])))
    const result = normalizeJson(input)
    const content = (result.content[0] as { content: unknown[] }).content

    expect(content).toHaveLength(2)
  })

  it('handles nested blocks (list items)', () => {
    const bulletList = {
      type: 'bullet-list' as const,
      attrs: { spread: false },
      content: [
        {
          type: 'list-item' as const,
          attrs: { label: '•', 'list-type': 'bullet', spread: 'true' },
          content: [para(text(''), text('hello'))],
        },
      ],
    }
    const result = normalizeJson(doc(bulletList))
    const item = (result.content[0] as typeof bulletList).content[0]!
    const para0 = item.content[0] as { content: unknown[] }

    expect(para0.content).toHaveLength(1)
  })

  it('handles align blocks', () => {
    const align = {
      type: 'align' as const,
      attrs: { value: 'center' as const },
      content: [para(text('a'), text('b'))],
    }
    const result = normalizeJson(doc(align))
    const inner = (result.content[0] as typeof align).content[0] as { content: unknown[] }

    expect(inner.content).toHaveLength(1)
    expect((inner.content[0] as { text: string }).text).toBe('ab')
  })

  it('produces a doc that passes semantic validation', () => {
    const messy = doc(para(text(''), text('Hello '), text('world')))
    const normalized = normalizeJson(messy)

    expect(validateJsonSemantics(normalized)).toEqual({ success: true })
  })
})

// ─── normalizeJson — ordered-list and non-text inlines ────────────────────────

describe('normalizeJson — ordered-list blocks', () => {
  it('normalizes content inside ordered-list items', () => {
    const orderedList = {
      type: 'ordered-list' as const,
      attrs: { order: 1, spread: false },
      content: [
        {
          type: 'list-item' as const,
          attrs: { label: '1.', 'list-type': 'ordered', spread: 'true' },
          content: [para(text('', [boldMark()]))],
        },
      ],
    }
    const result = normalizeJson(doc(orderedList))
    const item = (result.content[0] as typeof orderedList).content[0]!
    const para0 = item.content[0] as { content: unknown[] }

    // empty text nodes inside ordered-list items are stripped
    expect(para0.content).toHaveLength(0)
  })
})

describe('normalizeJson — empty paragraph (no content)', () => {
  it('returns an empty paragraph unchanged', () => {
    const emptyPara = { type: 'paragraph' as const }
    const result = normalizeJson(doc(emptyPara))

    expect(result.content[0]).toEqual(emptyPara)
  })
})

describe('normalizeJson — non-text inline nodes pass through unchanged', () => {
  it('placeholder inline node is preserved as-is', () => {
    const placeholder = {
      type: 'placeholder' as const,
      attrs: {
        type: 'Subscriber' as const,
        value: null,
        name: 'n',
        original: 'o',
        'max-length': null,
      },
    }
    const result = normalizeJson(doc({ type: 'paragraph', content: [placeholder] }))
    const inline = ((result.content[0] as { content: unknown[] }).content[0]) as { type: string }

    expect(inline.type).toBe('placeholder')
  })
})

// ─── Multiple issues ──────────────────────────────────────────────────────────

describe('validateJsonSemantics — multiple issues collected', () => {
  it('collects all issues in one pass', () => {
    const result = validateJsonSemantics(
      doc(
        para(text('')),               // TEXT_EMPTY
        para(text('a'), text('b')),   // TEXT_ADJACENT
      ),
    )

    if (!result.success) {
      const codes = result.issues.map((i) => i.code)

      expect(codes).toContain('TEXT_EMPTY')
      expect(codes).toContain('TEXT_ADJACENT')
    }
  })
})
