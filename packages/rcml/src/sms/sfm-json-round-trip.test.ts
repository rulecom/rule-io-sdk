import { describe, it, expect } from 'vitest'
import { sfmToJson } from './sfm-to-json.js'
import { jsonToSfm } from './json-to-sfm.js'
import type { SmsContentJson } from './content/json-validator/types.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Round-trip helper: parse SFM → serialize back → parse again.
 * The two JSON documents must be deep-equal.
 *
 * Note: link marks are NOT round-trippable via SFM — the SFM format has no
 * syntax for them. Build SmsContentJson directly when you need link marks.
 */
function rt(input: string): { original: SmsContentJson; roundTripped: SmsContentJson } {
  const original = sfmToJson(input)
  const sfm = jsonToSfm(original)
  const roundTripped = sfmToJson(sfm)

  return { original, roundTripped }
}

// ─── Plain text ───────────────────────────────────────────────────────────────

describe('jsonToSfm — plain text', () => {
  it('round-trips a plain text paragraph', () => {
    const { original, roundTripped } = rt('Hello world')

    expect(roundTripped).toEqual(original)
  })

  it('produces the original text verbatim', () => {
    expect(jsonToSfm(sfmToJson('Hello world'))).toBe('Hello world')
  })

  it('round-trips multiple paragraphs', () => {
    const { original, roundTripped } = rt('First\n\nSecond\n\nThird')

    expect(roundTripped).toEqual(original)
  })

  it('separates paragraphs with double newline', () => {
    expect(jsonToSfm(sfmToJson('First\n\nSecond'))).toBe('First\n\nSecond')
  })

  it('round-trips an empty string', () => {
    const { original, roundTripped } = rt('')

    expect(roundTripped).toEqual(original)
  })
})

// ─── Placeholders ─────────────────────────────────────────────────────────────

describe('jsonToSfm — placeholders', () => {
  it('round-trips a Subscriber placeholder', () => {
    const { original, roundTripped } = rt('[Subscriber:FirstName]')

    expect(roundTripped).toEqual(original)
  })

  it('round-trips a CustomField placeholder', () => {
    const { original, roundTripped } = rt('[CustomField:Order.Total]')

    expect(roundTripped).toEqual(original)
  })

  it('round-trips a User placeholder', () => {
    const { original, roundTripped } = rt('[User:CompanyName]')

    expect(roundTripped).toEqual(original)
  })

  it('round-trips a RemoteContent placeholder', () => {
    const { original, roundTripped } = rt('[RemoteContent:https://api.example.com/banner]')

    expect(roundTripped).toEqual(original)
  })

  it('round-trips a Date placeholder', () => {
    const { original, roundTripped } = rt('[Date:now::Y-m-d]')

    expect(roundTripped).toEqual(original)
  })

  it('round-trips a Link placeholder', () => {
    const { original, roundTripped } = rt('[Link:Unsubscribe]')

    expect(roundTripped).toEqual(original)
  })

  it('round-trips all placeholder types in one message', () => {
    const input = '[Subscriber:FirstName] [CustomField:Order.Total] [User:CompanyName] [Link:WebBrowser]'
    const { original, roundTripped } = rt(input)

    expect(roundTripped).toEqual(original)
  })

  it('round-trips placeholder surrounded by text', () => {
    const input = 'Hi [Subscriber:FirstName], your total is [CustomField:Order.Total].'
    const { original, roundTripped } = rt(input)

    expect(roundTripped).toEqual(original)
  })

  it('produces the original token verbatim', () => {
    expect(jsonToSfm(sfmToJson('[Subscriber:FirstName]'))).toBe('[Subscriber:FirstName]')
  })
})

// ─── Line breaks ──────────────────────────────────────────────────────────────

describe('jsonToSfm — line breaks', () => {
  it('round-trips a single newline as hardbreak', () => {
    const { original, roundTripped } = rt('Line one\nLine two')

    expect(roundTripped).toEqual(original)
  })

  it('emits \\n for hardbreak', () => {
    expect(jsonToSfm(sfmToJson('Line one\nLine two'))).toBe('Line one\nLine two')
  })

  it('round-trips a double newline as paragraph boundary', () => {
    const { original, roundTripped } = rt('Para one\n\nPara two')

    expect(roundTripped).toEqual(original)
  })

  it('emits \\n\\n between paragraphs', () => {
    expect(jsonToSfm(sfmToJson('Para one\n\nPara two'))).toBe('Para one\n\nPara two')
  })
})

// ─── Combined ─────────────────────────────────────────────────────────────────

describe('jsonToSfm — combined constructs', () => {
  it('round-trips placeholder + hardbreak + text', () => {
    const { original, roundTripped } = rt('Hi [Subscriber:FirstName]!\nYour order has shipped.')

    expect(roundTripped).toEqual(original)
  })

  it('round-trips multi-paragraph with placeholders', () => {
    const input = 'Hello [Subscriber:FirstName],\n\nYour order [CustomField:Order.Id] is ready.\n\nClick [Link:WebBrowser] to view it.'
    const { original, roundTripped } = rt(input)

    expect(roundTripped).toEqual(original)
  })
})

// ─── Direct JSON input ────────────────────────────────────────────────────────

describe('jsonToSfm — direct JSON input', () => {
  it('returns a string for a valid SmsContentJson', () => {
    expect(typeof jsonToSfm(sfmToJson('Hello'))).toBe('string')
  })
})
