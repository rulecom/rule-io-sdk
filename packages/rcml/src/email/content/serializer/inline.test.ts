import { describe, it, expect } from 'vitest'
import type {
  InlineNode,
  FontMark,
  LinkMark,
  PlaceholderNode,
  LoopValueNode,
  PlaceholderValueFragmentNode,
} from '../json-validator/types.js'
import { serializeInlineNode, serializeInlineNodes } from './inline.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── serializeInlineNode ──────────────────────────────────────────────────────

describe('serializeInlineNode — text', () => {
  it('serializes plain text verbatim', () => {
    expect(serializeInlineNode({ type: 'text', text: 'hello' })).toBe('hello')
  })

  it('serializes text with a font mark', () => {
    const mark: FontMark = { type: 'font', attrs: { ...nullFontAttrs, 'font-weight': 'bold' } }

    expect(serializeInlineNode({ type: 'text', text: 'bold', marks: [mark] })).toBe(
      ':font[bold]{font-weight="bold"}',
    )
  })
})

describe('serializeInlineNode — hardbreak', () => {
  it('serializes a hardbreak node as backslash+newline', () => {
    expect(serializeInlineNode({ type: 'hardbreak', attrs: { isInline: false } })).toBe('\\\n')
  })
})

describe('serializeInlineNode — placeholder', () => {
  it('includes value when set', () => {
    const node: PlaceholderNode = {
      type: 'placeholder',
      attrs: { type: 'Subscriber', value: 'John', name: 'First name', original: '[sub:fn]', 'max-length': null },
    }

    expect(serializeInlineNode(node)).toContain('value="John"')
  })

  it('omits value from output when null', () => {
    const node: PlaceholderNode = {
      type: 'placeholder',
      attrs: { type: 'Subscriber', value: null, name: 'n', original: 'o', 'max-length': null },
    }

    expect(serializeInlineNode(node)).not.toContain('value=')
  })

  it('includes max-length when set', () => {
    const node: PlaceholderNode = {
      type: 'placeholder',
      attrs: { type: 'CustomField', value: 'v', name: 'n', original: 'o', 'max-length': '255' },
    }

    expect(serializeInlineNode(node)).toContain('max-length="255"')
  })

  it('omits max-length from output when null', () => {
    const node: PlaceholderNode = {
      type: 'placeholder',
      attrs: { type: 'Subscriber', value: 'v', name: 'n', original: 'o', 'max-length': null },
    }

    expect(serializeInlineNode(node)).not.toContain('max-length=')
  })

  it('serializes to a ::placeholder{...} leaf directive', () => {
    const node: PlaceholderNode = {
      type: 'placeholder',
      attrs: { type: 'Date', value: null, name: 'today', original: '[date]', 'max-length': null },
    }

    expect(serializeInlineNode(node)).toMatch(/^::placeholder\{/)
  })
})

describe('serializeInlineNode — loop-value', () => {
  it('serializes to a ::loop-value{...} leaf directive', () => {
    const node: LoopValueNode = {
      type: 'loop-value',
      attrs: { original: 'orig', value: 'val', index: '0' },
    }
    const result = serializeInlineNode(node)

    expect(result).toContain('::loop-value{')
    expect(result).toContain('original="orig"')
    expect(result).toContain('value="val"')
    expect(result).toContain('index="0"')
  })
})

describe('serializeInlineNode — placeholder-value-fragment', () => {
  it('serializes with text attr', () => {
    const node: PlaceholderValueFragmentNode = { type: 'placeholder-value-fragment', attrs: { text: 'hello' } }

    expect(serializeInlineNode(node)).toBe('::placeholder-value-fragment{text="hello"}')
  })

  it('serializes with empty text attr', () => {
    const node: PlaceholderValueFragmentNode = { type: 'placeholder-value-fragment', attrs: { text: '' } }

    expect(serializeInlineNode(node)).toBe('::placeholder-value-fragment{text=""}')
  })
})

describe('serializeInlineNode — error', () => {
  it('throws for an unknown inline node type', () => {
    expect(() => serializeInlineNode({ type: 'unknown' } as unknown as InlineNode)).toThrow(
      'Unexpected inline node type "unknown"',
    )
  })
})

// ─── serializeInlineNodes ─────────────────────────────────────────────────────

describe('serializeInlineNodes', () => {
  it('returns empty string for an empty array', () => {
    expect(serializeInlineNodes([])).toBe('')
  })

  it('serializes a single plain text node', () => {
    expect(serializeInlineNodes([{ type: 'text', text: 'hello' }])).toBe('hello')
  })

  it('concatenates mixed inline nodes', () => {
    const nodes: InlineNode[] = [
      { type: 'text', text: 'Hello ' },
      {
        type: 'placeholder',
        attrs: { type: 'Subscriber', value: null, name: 'n', original: '[sub:fn]', 'max-length': null },
      },
      { type: 'text', text: '!' },
    ]

    const result = serializeInlineNodes(nodes)

    expect(result).toContain('Hello ')
    expect(result).toContain('::placeholder{')
    expect(result).toContain('!')
  })

  it('groups adjacent text nodes sharing the same outermost mark under one directive', () => {
    const link: LinkMark = { type: 'link', attrs: { href: 'https://x.com', target: null, 'no-tracked': 'false' } }
    const font: FontMark = { type: 'font', attrs: { ...nullFontAttrs, 'font-weight': 'bold' } }

    // "Hello " has [link]; "World" has [link, font] — both share link as outermost.
    const nodes: InlineNode[] = [
      { type: 'text', text: 'Hello ', marks: [link] },
      { type: 'text', text: 'World', marks: [link, font] },
    ]

    expect(serializeInlineNodes(nodes)).toBe(
      ':link[Hello :font[World]{font-weight="bold"}]{href="https://x.com"}',
    )
  })

  it('serializes adjacent same-type marks with different attrs independently', () => {
    // Both nodes have font as outermost mark but different attrs → no grouping.
    const nodes: InlineNode[] = [
      { type: 'text', text: 'A', marks: [{ type: 'font', attrs: { ...nullFontAttrs, 'font-weight': 'bold' } }] },
      { type: 'text', text: 'B', marks: [{ type: 'font', attrs: { ...nullFontAttrs, color: 'red' } }] },
    ]

    expect(serializeInlineNodes(nodes)).toBe(':font[A]{font-weight="bold"}:font[B]{color="red"}')
  })

  it('serializes a node with no marks as plain text', () => {
    const nodes: InlineNode[] = [
      { type: 'text', text: 'Hello ' },
      { type: 'text', text: 'world', marks: [{ type: 'font', attrs: { ...nullFontAttrs, 'font-weight': 'bold' } }] },
    ]

    // first node has no mark → allShare = false → falls through to per-node serialization
    expect(serializeInlineNodes(nodes)).toBe('Hello :font[world]{font-weight="bold"}')
  })
})
