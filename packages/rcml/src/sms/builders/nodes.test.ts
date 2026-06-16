import { describe, it, expect } from 'vitest'
import {
  createContent,
  createHardbreakNode,
  createParagraphNode,
  createTextNode,
} from './nodes.js'
import { createLinkMark } from './marks.js'
import type {
  SmsContentJson,
  SmsHardbreakNode,
  SmsParagraphNode,
  SmsTextNode,
} from '../content/json-validator/types.js'

describe('createTextNode', () => {
  it('produces a plain text node with no marks field when none provided', () => {
    expect(createTextNode({ text: 'Hello' })).toEqual<SmsTextNode>({
      type: 'text',
      text: 'Hello',
    })
  })

  it('produces a plain text node with no marks field when an empty array is passed', () => {
    expect(createTextNode({ text: 'Hello', marks: [] })).toEqual<SmsTextNode>({
      type: 'text',
      text: 'Hello',
    })
  })

  it('attaches a link mark when supplied', () => {
    const mark = createLinkMark({ href: 'https://example.com', track: true, shorten: false })

    expect(createTextNode({ text: 'click', marks: [mark] })).toEqual<SmsTextNode>({
      type: 'text',
      text: 'click',
      marks: [mark],
    })
  })
})

describe('createHardbreakNode', () => {
  it('produces the canonical hardbreak shape', () => {
    expect(createHardbreakNode()).toEqual<SmsHardbreakNode>({
      type: 'hardbreak',
      attrs: { isInline: false },
    })
  })
})

describe('createParagraphNode', () => {
  it('produces an empty paragraph with no content field when no options are passed', () => {
    expect(createParagraphNode()).toEqual<SmsParagraphNode>({ type: 'paragraph' })
  })

  it('produces an empty paragraph with no content field when content is an empty array', () => {
    expect(createParagraphNode({ content: [] })).toEqual<SmsParagraphNode>({
      type: 'paragraph',
    })
  })

  it('wraps inline children verbatim', () => {
    const para = createParagraphNode({
      content: [
        createTextNode({ text: 'Hi ' }),
        createTextNode({ text: 'there' }),
      ],
    })

    expect(para).toEqual<SmsParagraphNode>({
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Hi ' },
        { type: 'text', text: 'there' },
      ],
    })
  })
})

describe('createContent', () => {
  it('wraps paragraphs in a doc node', () => {
    const content = createContent({
      paragraphs: [
        createParagraphNode({ content: [createTextNode({ text: 'Hello' })] }),
      ],
    })

    expect(content).toEqual<SmsContentJson>({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello' }],
        },
      ],
    })
  })

  it('preserves multi-paragraph order', () => {
    const content = createContent({
      paragraphs: [
        createParagraphNode({ content: [createTextNode({ text: 'First' })] }),
        createParagraphNode({ content: [createTextNode({ text: 'Second' })] }),
      ],
    })

    expect(content.content).toHaveLength(2)
    expect(content.content[0]!.content![0]).toMatchObject({ text: 'First' })
    expect(content.content[1]!.content![0]).toMatchObject({ text: 'Second' })
  })

  it('rejects an empty paragraphs array at compile time', () => {
    // The schema requires at least one paragraph (`minItems: 1`).
    // CreateSmsContentOptions.paragraphs is typed as
    // `[SmsParagraphNode, ...SmsParagraphNode[]]` so empty arrays fail
    // type-checking — this test pins that contract.
    // @ts-expect-error — paragraphs must contain at least one entry
    createContent({ paragraphs: [] })
  })
})
