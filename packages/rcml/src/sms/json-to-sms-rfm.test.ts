import { describe, it, expect } from 'vitest'
import { smsRfmToJson } from './sms-rfm-to-json.js'
import { jsonToSmsRfm } from './json-to-sms-rfm.js'
import type { SmsContentJson } from './content/json-validator/types.js'

describe('jsonToSmsRfm()', () => {
  it('round-trips plain text', () => {
    expect(jsonToSmsRfm(smsRfmToJson('Hello world'))).toBe('Hello world')
  })

  it('round-trips a placeholder', () => {
    expect(jsonToSmsRfm(smsRfmToJson('[Subscriber:FirstName]'))).toBe('[Subscriber:FirstName]')
  })

  it('round-trips text + placeholder + text', () => {
    const input = 'Hi [Subscriber:FirstName]!'

    expect(jsonToSmsRfm(smsRfmToJson(input))).toBe(input)
  })

  it('round-trips single newline as hardbreak', () => {
    expect(jsonToSmsRfm(smsRfmToJson('Line one\nLine two'))).toBe('Line one\nLine two')
  })

  it('round-trips double newline as paragraph boundary', () => {
    expect(jsonToSmsRfm(smsRfmToJson('Para one\n\nPara two'))).toBe('Para one\n\nPara two')
  })

  it('renders linked text — preserves link mark as :link directive', () => {
    const json: SmsContentJson = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Click here',
              marks: [{ type: 'link', attrs: { href: 'https://example.com', track: true, shorten: false } }],
            },
          ],
        },
      ],
    }

    expect(jsonToSmsRfm(json)).toBe(':link[Click here]{href="https://example.com" track="true" shorten="false"}')
  })

  it('empty paragraph round-trips to empty string', () => {
    expect(jsonToSmsRfm(smsRfmToJson(''))).toBe('')
  })
})

describe('jsonToSmsRfm() — link mark serialization', () => {
  it('emits :link with track="false" and shorten="false"', () => {
    const json: SmsContentJson = {
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [{
          type: 'text',
          text: 'Visit',
          marks: [{ type: 'link', attrs: { href: 'https://example.com', track: false, shorten: false } }],
        }],
      }],
    }

    expect(jsonToSmsRfm(json)).toBe(':link[Visit]{href="https://example.com" track="false" shorten="false"}')
  })

  it('groups adjacent text nodes sharing the same link mark under a single :link wrapper', () => {
    const linkMark = { type: 'link' as const, attrs: { href: 'https://example.com', track: true, shorten: true } }
    const json: SmsContentJson = {
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Hello ', marks: [linkMark] },
          { type: 'text', text: 'World', marks: [linkMark] },
        ],
      }],
    }

    expect(jsonToSmsRfm(json)).toBe(':link[Hello World]{href="https://example.com" track="true" shorten="true"}')
  })

  it('emits ::placeholder when value is non-null', () => {
    const json: SmsContentJson = {
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [{
          type: 'placeholder',
          attrs: {
            type: 'CustomField',
            original: '[CustomField:Address.Firstname]',
            name: 'Address.Firstname',
            value: '77856',
            'max-length': null,
          },
        }],
      }],
    }

    expect(jsonToSmsRfm(json)).toBe('::placeholder{type="CustomField" original="[CustomField:Address.Firstname]" name="Address.Firstname" value="77856"}')
  })

  it('emits [Type:Name] shorthand when value and max-length are both null', () => {
    const json: SmsContentJson = {
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [{
          type: 'placeholder',
          attrs: {
            type: 'Subscriber',
            original: '[Subscriber:FirstName]',
            name: 'FirstName',
            value: null,
            'max-length': null,
          },
        }],
      }],
    }

    expect(jsonToSmsRfm(json)).toBe('[Subscriber:FirstName]')
  })

  it('emits ::placeholder when max-length is non-null', () => {
    const json: SmsContentJson = {
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [{
          type: 'placeholder',
          attrs: {
            type: 'Subscriber',
            original: '[Subscriber:FirstName]',
            name: 'FirstName',
            value: null,
            'max-length': '20',
          },
        }],
      }],
    }

    expect(jsonToSmsRfm(json)).toBe('::placeholder{type="Subscriber" original="[Subscriber:FirstName]" name="FirstName" max-length="20"}')
  })
})
