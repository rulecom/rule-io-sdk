import { describe, it, expect } from 'vitest'
import { rfmToJson, inlineRfmToJson } from './rfm-to-json.js'
import { jsonToRfm, jsonToInlineRfm } from './json-to-rfm.js'
import type { Json } from './validate-rcml-json.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Round-trip helper: parse RFM → convert back to markdown → parse again.
 * The two resulting JSON documents must be deep-equal.
 */
function rt(input: string): { original: Json; roundTripped: Json } {
  const original = rfmToJson(input)
  const md = jsonToRfm(original)
  const roundTripped = rfmToJson(md)

  return { original, roundTripped }
}

// ─── jsonToRfm — plain text ───────────────────────────────────────────────────

describe('jsonToRfm — plain text', () => {
  it('round-trips a plain text paragraph', () => {
    const { original, roundTripped } = rt('Hello world')

    expect(roundTripped).toEqual(original)
  })

  it('produces the original text verbatim', () => {
    expect(jsonToRfm(rfmToJson('Hello world'))).toBe('Hello world')
  })

  it('round-trips multiple paragraphs', () => {
    const { original, roundTripped } = rt('First\n\nSecond\n\nThird')

    expect(roundTripped).toEqual(original)
  })

  it('separates paragraphs with double newline', () => {
    expect(jsonToRfm(rfmToJson('First\n\nSecond'))).toBe('First\n\nSecond')
  })
})

// ─── jsonToRfm — :font ────────────────────────────────────────────────────────

describe('jsonToRfm — :font', () => {
  it('round-trips font-weight', () => {
    const { original, roundTripped } = rt(':font[bold text]{font-weight="bold"}')

    expect(roundTripped).toEqual(original)
  })

  it('round-trips multiple font attrs', () => {
    const { original, roundTripped } = rt(':font[text]{font-weight="bold" font-size="16px" color="#ff0000"}')

    expect(roundTripped).toEqual(original)
  })

  it('round-trips font-style italic', () => {
    const { original, roundTripped } = rt(':font[text]{font-style="italic"}')

    expect(roundTripped).toEqual(original)
  })

  it('round-trips text-decoration underline', () => {
    const { original, roundTripped } = rt(':font[text]{text-decoration="underline"}')

    expect(roundTripped).toEqual(original)
  })

  it('round-trips mixed font+text in a paragraph', () => {
    const { original, roundTripped } = rt('Hello :font[world]{font-weight="bold"} again')

    expect(roundTripped).toEqual(original)
  })
})

// ─── jsonToRfm — :link ────────────────────────────────────────────────────────

describe('jsonToRfm — :link', () => {
  it('round-trips a basic link', () => {
    const { original, roundTripped } = rt(':link[click here]{href="https://example.com"}')

    expect(roundTripped).toEqual(original)
  })

  it('round-trips link with target="_blank"', () => {
    const { original, roundTripped } = rt(':link[text]{href="https://x.com" target="_blank"}')

    expect(roundTripped).toEqual(original)
  })

  it('round-trips link with no-tracked="true"', () => {
    const { original, roundTripped } = rt(':link[text]{href="https://x.com" no-tracked="true"}')

    expect(roundTripped).toEqual(original)
  })

  it('round-trips link with all options', () => {
    const { original, roundTripped } = rt(':link[go]{href="https://x.com" target="_blank" no-tracked="true"}')

    expect(roundTripped).toEqual(original)
  })
})

// ─── jsonToRfm — nested marks ─────────────────────────────────────────────────

describe('jsonToRfm — nested marks', () => {
  it('round-trips font inside link', () => {
    const { original, roundTripped } = rt(':link[:font[bold]{font-weight="bold"}]{href="https://x.com"}')

    expect(roundTripped).toEqual(original)
  })

  it('round-trips adjacent text with shared link mark', () => {
    // "Hello " (link only) + "World" (link + font) — both share link as outermost
    const { original, roundTripped } = rt(':link[Hello :font[World]{font-weight="bold"}]{href="https://x.com"}')

    expect(roundTripped).toEqual(original)
  })

  it('round-trips font wrapping link', () => {
    const { original, roundTripped } = rt(':font[:link[text]{href="https://x.com"}]{font-weight="bold"}')

    expect(roundTripped).toEqual(original)
  })
})

// ─── jsonToRfm — bullet list ──────────────────────────────────────────────────

describe('jsonToRfm — bullet list', () => {
  it('round-trips a simple bullet list', () => {
    const { original, roundTripped } = rt('- item one\n- item two\n- item three')

    expect(roundTripped).toEqual(original)
  })

  it('round-trips nested bullet list', () => {
    const { original, roundTripped } = rt('- parent\n  - child')

    expect(roundTripped).toEqual(original)
  })

  it('round-trips list item with :font inside', () => {
    const { original, roundTripped } = rt('- :font[bold item]{font-weight="bold"}')

    expect(roundTripped).toEqual(original)
  })
})

// ─── jsonToRfm — ordered list ─────────────────────────────────────────────────

describe('jsonToRfm — ordered list', () => {
  it('round-trips a simple ordered list', () => {
    const { original, roundTripped } = rt('1. first\n2. second\n3. third')

    expect(roundTripped).toEqual(original)
  })
})

// ─── jsonToRfm — :::align ─────────────────────────────────────────────────────

describe('jsonToRfm — :::align', () => {
  it('round-trips align center', () => {
    const { original, roundTripped } = rt(':::align{value="center"}\nHello\n:::')

    expect(roundTripped).toEqual(original)
  })

  it('round-trips align right', () => {
    const { original, roundTripped } = rt(':::align{value="right"}\nHello\n:::')

    expect(roundTripped).toEqual(original)
  })

  it('round-trips align with multiple inner blocks', () => {
    const { original, roundTripped } = rt(':::align{value="right"}\nPara one\n\nPara two\n:::')

    expect(roundTripped).toEqual(original)
  })
})

// ─── jsonToRfm — ::placeholder ────────────────────────────────────────────────

describe('jsonToRfm — ::placeholder', () => {
  it('round-trips placeholder with all attrs', () => {
    const { original, roundTripped } = rt('::placeholder{type="CustomField" value="val" name="myField" original="orig"}')

    expect(roundTripped).toEqual(original)
  })

  it('round-trips placeholder without value (null)', () => {
    const { original, roundTripped } = rt('::placeholder{type="Subscriber" name="n" original="o"}')

    expect(roundTripped).toEqual(original)
  })

  it('round-trips placeholder with max-length', () => {
    const { original, roundTripped } = rt('::placeholder{type="CustomField" value="v" name="n" original="o" max-length="255"}')

    expect(roundTripped).toEqual(original)
  })

  it('round-trips all placeholder types', () => {
    const types = ['CustomField', 'Subscriber', 'User', 'RemoteContent', 'Date'] as const

    for (const type of types) {
      const { original, roundTripped } = rt(`::placeholder{type="${type}" value="v" name="n" original="o"}`)

      expect(roundTripped).toEqual(original)
    }
  })
})

// ─── jsonToRfm — ::loop-value ─────────────────────────────────────────────────

describe('jsonToRfm — ::loop-value', () => {
  it('round-trips loop-value', () => {
    const { original, roundTripped } = rt('::loop-value{original="orig" value="val" index="0"}')

    expect(roundTripped).toEqual(original)
  })
})

// ─── jsonToRfm — ::placeholder-value-fragment ────────────────────────────────

describe('jsonToRfm — ::placeholder-value-fragment', () => {
  it('round-trips placeholder-value-fragment with text', () => {
    const { original, roundTripped } = rt('::placeholder-value-fragment{text="hello"}')

    expect(roundTripped).toEqual(original)
  })

  it('round-trips placeholder-value-fragment with empty text', () => {
    const { original, roundTripped } = rt('::placeholder-value-fragment{}')

    expect(roundTripped).toEqual(original)
  })
})

// ─── jsonToRfm — hard break ───────────────────────────────────────────────────

describe('jsonToRfm — hard break', () => {
  it('round-trips a paragraph with a hard break', () => {
    const { original, roundTripped } = rt('line one\\\nline two')

    expect(roundTripped).toEqual(original)
  })
})

// ─── jsonToRfm — complex documents ───────────────────────────────────────────

describe('jsonToRfm — complex documents', () => {
  it('round-trips a document with align, font, link, and placeholder', () => {
    const input = [
      ':::align{value="center"}',
      'Hello :font[world]{font-weight="bold"}',
      ':::',
      '',
      ':link[click here]{href="https://example.com" target="_blank"}',
      '',
      '::placeholder{type="Subscriber" name="First name" original="[sub:fn]"}',
    ].join('\n')

    const { original, roundTripped } = rt(input)

    expect(roundTripped).toEqual(original)
  })

  it('round-trips a document with bullet and ordered lists', () => {
    const { original, roundTripped } = rt('- one\n- two\n\n1. first\n2. second')

    expect(roundTripped).toEqual(original)
  })
})

// ─── jsonToRfm — direct JSON input ───────────────────────────────────────────

describe('jsonToRfm — direct JSON input', () => {
  it('returns a string for a doc with a single paragraph', () => {
    expect(typeof jsonToRfm(rfmToJson('Hello'))).toBe('string')
  })
})

// ─── jsonToInlineRfm ──────────────────────────────────────────────────────────

describe('jsonToInlineRfm', () => {
  it('round-trips plain text', () => {
    const json = inlineRfmToJson('Hello world')

    expect(inlineRfmToJson(jsonToInlineRfm(json))).toEqual(json)
  })

  it('round-trips :font', () => {
    const json = inlineRfmToJson(':font[bold]{font-weight="bold"}')

    expect(inlineRfmToJson(jsonToInlineRfm(json))).toEqual(json)
  })

  it('round-trips :link', () => {
    const json = inlineRfmToJson(':link[click]{href="https://example.com"}')

    expect(inlineRfmToJson(jsonToInlineRfm(json))).toEqual(json)
  })

  it('round-trips ::placeholder', () => {
    const json = inlineRfmToJson('::placeholder{type="Subscriber" name="n" original="o"}')

    expect(inlineRfmToJson(jsonToInlineRfm(json))).toEqual(json)
  })

  it('round-trips ::loop-value', () => {
    const json = inlineRfmToJson('::loop-value{original="orig" value="val" index="0"}')

    expect(inlineRfmToJson(jsonToInlineRfm(json))).toEqual(json)
  })

  it('produces the same result as jsonToRfm for Inline RFM content', () => {
    const json = inlineRfmToJson(':font[hello]{font-weight="bold"}')

    expect(jsonToInlineRfm(json)).toBe(jsonToRfm(json))
  })
})
