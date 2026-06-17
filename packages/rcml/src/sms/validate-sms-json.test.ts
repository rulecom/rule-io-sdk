import { describe, it, expect } from 'vitest'
import { validateSmsJson, safeParseSmsJson, SmsContentParseError } from './validate-sms-json.js'
import { smsRfmToJson } from './sms-rfm-to-json.js'

describe('validateSmsJson()', () => {
  it('accepts a valid empty doc from smsRfmToJson', () => {
    expect(() => validateSmsJson(smsRfmToJson(''))).not.toThrow()
  })

  it('accepts a valid doc with text', () => {
    expect(() => validateSmsJson(smsRfmToJson('Hello [Subscriber:FirstName]'))).not.toThrow()
  })

  it('accepts a placeholder with Link type', () => {
    const doc = smsRfmToJson('[Link:Unsubscribe]')

    expect(() => validateSmsJson(doc)).not.toThrow()
  })

  it('accepts a text node with link mark', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'click',
              marks: [{ type: 'link', attrs: { href: 'https://example.com', track: true, shorten: false } }],
            },
          ],
        },
      ],
    }

    expect(() => validateSmsJson(doc)).not.toThrow()
  })

  it('rejects a missing type field', () => {
    expect(() => validateSmsJson({ content: [] })).toThrow(SmsContentParseError)
  })

  it('rejects an unknown inline node type', () => {
    const doc = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'align', attrs: { value: 'left' }, content: [] }] }],
    }

    expect(() => validateSmsJson(doc)).toThrow(SmsContentParseError)
  })

  it('rejects extra properties on placeholder attrs', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'placeholder',
              attrs: {
                type: 'Subscriber',
                name: 'FirstName',
                original: '[Subscriber:FirstName]',
                value: null,
                'max-length': null,
                extra: 'oops',
              },
            },
          ],
        },
      ],
    }

    expect(() => validateSmsJson(doc)).toThrow(SmsContentParseError)
  })

  it('rejects font mark (email-only)', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'bold', marks: [{ type: 'font', attrs: { 'font-weight': 'bold' } }] },
          ],
        },
      ],
    }

    expect(() => validateSmsJson(doc)).toThrow(SmsContentParseError)
  })
})

describe('safeParseSmsJson()', () => {
  it('returns success for valid input', () => {
    const result = safeParseSmsJson(smsRfmToJson('Hello'))

    expect(result.success).toBe(true)
  })

  it('returns failure with errors for invalid input', () => {
    const result = safeParseSmsJson({ type: 'wrong' })

    expect(result.success).toBe(false)

    if (!result.success) {
      expect(result.errors.length).toBeGreaterThan(0)
    }
  })
})
