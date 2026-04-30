import { describe, it, expect } from 'vitest'
import type { FontMark, LinkMark, Mark } from '../json-validator/types.js'
import { renderMark, renderWithMarks, marksEqual } from './mark.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** All-null font attrs — spread and override individual attrs in tests. */
const nullFontAttrs = {
  'font-family': null,
  'font-size': null,
  'line-height': null,
  'letter-spacing': null,
  'font-style': null,
  'font-weight': null,
  'text-decoration': null,
  color: null,
} as const

// ─── renderMark — :font ───────────────────────────────────────────────────────

describe('renderMark — :font', () => {
  it('wraps inner text in a :font[...]{...} directive', () => {
    const mark: FontMark = { type: 'font', attrs: { ...nullFontAttrs, 'font-weight': 'bold' } }

    expect(renderMark('text', mark)).toBe(':font[text]{font-weight="bold"}')
  })

  it('includes all non-null font attrs', () => {
    const mark: FontMark = { type: 'font', attrs: { ...nullFontAttrs, 'font-weight': 'bold', color: '#ff0000' } }

    expect(renderMark('x', mark)).toContain('font-weight="bold"')
    expect(renderMark('x', mark)).toContain('color="#ff0000"')
  })

  it('omits null font attrs from the output', () => {
    const mark: FontMark = { type: 'font', attrs: { ...nullFontAttrs, 'font-weight': 'bold' } }

    expect(renderMark('x', mark)).not.toContain('null')
    expect(renderMark('x', mark)).not.toContain('font-family=')
  })

  it('produces correct output for font-style italic', () => {
    const mark: FontMark = { type: 'font', attrs: { ...nullFontAttrs, 'font-style': 'italic' } }

    expect(renderMark('text', mark)).toBe(':font[text]{font-style="italic"}')
  })

  it('produces correct output for text-decoration underline', () => {
    const mark: FontMark = { type: 'font', attrs: { ...nullFontAttrs, 'text-decoration': 'underline' } }

    expect(renderMark('text', mark)).toBe(':font[text]{text-decoration="underline"}')
  })
})

// ─── renderMark — :link ───────────────────────────────────────────────────────

describe('renderMark — :link', () => {
  it('wraps inner text in a :link[...]{href="..."} directive', () => {
    const mark: LinkMark = { type: 'link', attrs: { href: 'https://example.com', target: null, 'no-tracked': 'false' } }

    expect(renderMark('click here', mark)).toBe(':link[click here]{href="https://example.com"}')
  })

  it('includes target when set', () => {
    const mark: LinkMark = { type: 'link', attrs: { href: 'https://x.com', target: '_blank', 'no-tracked': 'false' } }

    expect(renderMark('text', mark)).toContain('target="_blank"')
  })

  it('omits target from output when null', () => {
    const mark: LinkMark = { type: 'link', attrs: { href: 'https://x.com', target: null, 'no-tracked': 'false' } }

    expect(renderMark('text', mark)).not.toContain('target=')
  })

  it('includes no-tracked="true" when tracking is disabled', () => {
    const mark: LinkMark = { type: 'link', attrs: { href: 'https://x.com', target: null, 'no-tracked': 'true' } }

    expect(renderMark('text', mark)).toContain('no-tracked="true"')
  })

  it('omits no-tracked from output when "false"', () => {
    const mark: LinkMark = { type: 'link', attrs: { href: 'https://x.com', target: null, 'no-tracked': 'false' } }

    expect(renderMark('text', mark)).not.toContain('no-tracked=')
  })
})

// ─── renderMark — error ───────────────────────────────────────────────────────

describe('renderMark — error', () => {
  it('throws for an unknown mark type', () => {
    expect(() => renderMark('text', { type: 'unknown' } as unknown as Mark)).toThrow(
      'Unexpected mark type "unknown"',
    )
  })
})

// ─── renderWithMarks ──────────────────────────────────────────────────────────

describe('renderWithMarks', () => {
  it('returns text unchanged when marks array is empty', () => {
    expect(renderWithMarks('hello', [])).toBe('hello')
  })

  it('wraps text with a single font mark', () => {
    const mark: FontMark = { type: 'font', attrs: { ...nullFontAttrs, 'font-weight': 'bold' } }

    expect(renderWithMarks('text', [mark])).toBe(':font[text]{font-weight="bold"}')
  })

  it('wraps text with a single link mark', () => {
    const mark: LinkMark = { type: 'link', attrs: { href: 'https://x.com', target: null, 'no-tracked': 'false' } }

    expect(renderWithMarks('text', [mark])).toBe(':link[text]{href="https://x.com"}')
  })

  it('nests marks outermost-first: marks[0] is the outer wrapper', () => {
    const link: LinkMark = { type: 'link', attrs: { href: 'https://x.com', target: null, 'no-tracked': 'false' } }
    const font: FontMark = { type: 'font', attrs: { ...nullFontAttrs, 'font-weight': 'bold' } }

    // marks[0] = link (outer), marks[1] = font (inner)
    expect(renderWithMarks('text', [link, font])).toBe(
      ':link[:font[text]{font-weight="bold"}]{href="https://x.com"}',
    )
  })
})

// ─── marksEqual ───────────────────────────────────────────────────────────────

describe('marksEqual', () => {
  it('returns false when mark types differ', () => {
    const font: FontMark = { type: 'font', attrs: { ...nullFontAttrs } }
    const link: LinkMark = { type: 'link', attrs: { href: 'https://x.com', target: null, 'no-tracked': 'false' } }

    expect(marksEqual(font, link)).toBe(false)
  })

  it('returns true when type and all attrs match', () => {
    const a: FontMark = { type: 'font', attrs: { ...nullFontAttrs, 'font-weight': 'bold' } }
    const b: FontMark = { type: 'font', attrs: { ...nullFontAttrs, 'font-weight': 'bold' } }

    expect(marksEqual(a, b)).toBe(true)
  })

  it('returns false when same type but attrs differ', () => {
    const a: FontMark = { type: 'font', attrs: { ...nullFontAttrs, 'font-weight': 'bold' } }
    const b: FontMark = { type: 'font', attrs: { ...nullFontAttrs, color: 'red' } }

    expect(marksEqual(a, b)).toBe(false)
  })
})
