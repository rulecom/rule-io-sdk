import { describe, it, expect } from 'vitest'
import type { BlockNode, BulletListNode, OrderedListNode, AlignNode } from '../json-validator/types.js'
import { serializeBlock } from './block.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function para(text: string): BlockNode {
  return { type: 'paragraph', content: [{ type: 'text', text }] }
}

// ─── serializeBlock — paragraph ───────────────────────────────────────────────

describe('serializeBlock — paragraph', () => {
  it('serializes a plain text paragraph', () => {
    expect(serializeBlock(para('Hello world'))).toBe('Hello world')
  })

  it('serializes an empty paragraph (no content) as empty string', () => {
    expect(serializeBlock({ type: 'paragraph' })).toBe('')
  })
})

// ─── serializeBlock — bullet-list ─────────────────────────────────────────────

describe('serializeBlock — bullet-list', () => {
  it('uses "- " prefix for each item', () => {
    const node: BulletListNode = {
      type: 'bullet-list',
      attrs: { spread: false },
      content: [
        { type: 'list-item', attrs: { label: '-', 'list-type': 'bullet', spread: 'false' }, content: [para('one')] },
        { type: 'list-item', attrs: { label: '-', 'list-type': 'bullet', spread: 'false' }, content: [para('two')] },
      ],
    }

    expect(serializeBlock(node)).toMatch(/^- one\n- two$/)
  })

  it('serializes an empty list item as a bare bullet', () => {
    const node: BulletListNode = {
      type: 'bullet-list',
      attrs: { spread: false },
      content: [
        { type: 'list-item', attrs: { label: '-', 'list-type': 'bullet', spread: 'false' }, content: [] },
      ],
    }

    expect(serializeBlock(node)).toBe('-')
  })
})

// ─── serializeBlock — ordered-list ────────────────────────────────────────────

describe('serializeBlock — ordered-list', () => {
  it('uses "N. " prefix starting from attrs.order', () => {
    const node: OrderedListNode = {
      type: 'ordered-list',
      attrs: { order: 1, spread: false },
      content: [
        {
          type: 'list-item',
          attrs: { label: '1', 'list-type': 'ordered', spread: 'false' },
          content: [para('first')],
        },
        {
          type: 'list-item',
          attrs: { label: '2', 'list-type': 'ordered', spread: 'false' },
          content: [para('second')],
        },
      ],
    }

    expect(serializeBlock(node)).toMatch(/^1\. first\n2\. second$/)
  })
})

// ─── serializeBlock — align ───────────────────────────────────────────────────

describe('serializeBlock — align', () => {
  it('wraps inner blocks in :::align{value="..."} ... :::', () => {
    const node: AlignNode = {
      type: 'align',
      attrs: { value: 'center' },
      content: [para('Hello')],
    }

    expect(serializeBlock(node)).toBe(':::align{value="center"}\nHello\n:::')
  })

  it('separates multiple inner blocks with a blank line', () => {
    const node: AlignNode = {
      type: 'align',
      attrs: { value: 'right' },
      content: [para('Para one'), para('Para two')],
    }

    expect(serializeBlock(node)).toBe(':::align{value="right"}\nPara one\n\nPara two\n:::')
  })
})

// ─── serializeBlock — error ───────────────────────────────────────────────────

describe('serializeBlock — error', () => {
  it('throws for an unknown block node type', () => {
    expect(() => serializeBlock({ type: 'unknown' } as unknown as BlockNode)).toThrow(
      'Unexpected block node type "unknown"',
    )
  })
})
