import { describe, it, expect } from 'vitest'
import { smsRfmToJson } from './sms-rfm-to-json.js'
import type { SmsContentJson } from './content/json-validator/types.js'

describe('smsRfmToJson()', () => {
  describe('document structure', () => {
    it('empty string produces a single empty paragraph', () => {
      expect(smsRfmToJson('')).toEqual<SmsContentJson>({
        type: 'doc',
        content: [{ type: 'paragraph' }],
      })
    })

    it('plain text produces doc > paragraph > text', () => {
      expect(smsRfmToJson('Hello world')).toEqual<SmsContentJson>({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello world' }] }],
      })
    })
  })

  describe('placeholders', () => {
    it('parses a single placeholder', () => {
      expect(smsRfmToJson('[Subscriber:FirstName]')).toEqual<SmsContentJson>({
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
                },
              },
            ],
          },
        ],
      })
    })

    it('parses text + placeholder + text', () => {
      const doc = smsRfmToJson('Hi [Subscriber:FirstName]!')
      const para = doc.content[0]!

      expect(para.content).toHaveLength(3)
      expect(para.content![0]).toEqual({ type: 'text', text: 'Hi ' })
      expect(para.content![1]).toMatchObject({ type: 'placeholder', attrs: { name: 'FirstName' } })
      expect(para.content![2]).toEqual({ type: 'text', text: '!' })
    })

    it('parses multiple placeholder types', () => {
      const doc = smsRfmToJson('[CustomField:OrderId][Link:Unsubscribe][Date:Today]')
      const para = doc.content[0]!

      expect(para.content).toHaveLength(3)
      expect(para.content![0]).toMatchObject({ attrs: { type: 'CustomField', name: 'OrderId' } })
      expect(para.content![1]).toMatchObject({ attrs: { type: 'Link', name: 'Unsubscribe' } })
      expect(para.content![2]).toMatchObject({ attrs: { type: 'Date', name: 'Today' } })
    })
  })

  describe('line breaks', () => {
    it('single newline produces a hardbreak node', () => {
      const doc = smsRfmToJson('Line one\nLine two')
      const para = doc.content[0]!

      expect(para.content).toEqual([
        { type: 'text', text: 'Line one' },
        { type: 'hardbreak', attrs: { isInline: false } },
        { type: 'text', text: 'Line two' },
      ])
    })

    it('double newline produces a new paragraph', () => {
      const doc = smsRfmToJson('Para one\n\nPara two')

      expect(doc.content).toHaveLength(2)
      expect(doc.content[0]!.content).toEqual([{ type: 'text', text: 'Para one' }])
      expect(doc.content[1]!.content).toEqual([{ type: 'text', text: 'Para two' }])
    })
  })

  describe('combined', () => {
    it('placeholder mid-line with hardbreak', () => {
      const doc = smsRfmToJson('Hi [Subscriber:FirstName]!\nLine two')
      const para = doc.content[0]!

      expect(para.content).toEqual([
        { type: 'text', text: 'Hi ' },
        {
          type: 'placeholder',
          attrs: {
            type: 'Subscriber',
            name: 'FirstName',
            original: '[Subscriber:FirstName]',
            value: null,
            'max-length': null,
          },
        },
        { type: 'text', text: '!' },
        { type: 'hardbreak', attrs: { isInline: false } },
        { type: 'text', text: 'Line two' },
      ])
    })
  })
})

describe('smsRfmToJson() — link directive', () => {
  it('parses a basic :link directive', () => {
    const doc = smsRfmToJson(':link[Click here]{href="https://example.com" track="true" shorten="false"}')
    const para = doc.content[0]!

    expect(para.content).toEqual([
      {
        type: 'text',
        text: 'Click here',
        marks: [{ type: 'link', attrs: { href: 'https://example.com', track: true, shorten: false } }],
      },
    ])
  })

  it('parses :link with shorten="true"', () => {
    const doc = smsRfmToJson(':link[go]{href="https://google.com" track="true" shorten="true"}')
    const para = doc.content[0]!

    expect(para.content).toHaveLength(1)
    expect(para.content![0]).toMatchObject({
      type: 'text',
      marks: [{ type: 'link', attrs: { href: 'https://google.com', track: true, shorten: true } }],
    })
  })

  it('parses a :link mixed with surrounding text', () => {
    const doc = smsRfmToJson('Your message here. :link[https://google.com]{href="https://google.com" track="true" shorten="true"} Test')
    const para = doc.content[0]!

    expect(para.content).toHaveLength(3)
    expect(para.content![0]).toEqual({ type: 'text', text: 'Your message here. ' })
    expect(para.content![1]).toMatchObject({
      type: 'text',
      text: 'https://google.com',
      marks: [{ type: 'link', attrs: { href: 'https://google.com', track: true, shorten: true } }],
    })
    expect(para.content![2]).toEqual({ type: 'text', text: ' Test' })
  })
})

describe('smsRfmToJson() — ::placeholder directive', () => {
  it('parses a ::placeholder directive with a resolved value', () => {
    const doc = smsRfmToJson('Your message here. ::placeholder{type="CustomField" original="[CustomField:Address.Firstname]" name="Address.Firstname" value="77856" max-length=""}')
    const para = doc.content[0]!

    expect(para.content).toHaveLength(2)
    expect(para.content![1]).toEqual({
      type: 'placeholder',
      attrs: {
        type: 'CustomField',
        name: 'Address.Firstname',
        original: '[CustomField:Address.Firstname]',
        value: 77856,
        'max-length': null,
      },
    })
  })

  it('parses a ::placeholder directive with null value', () => {
    const doc = smsRfmToJson('::placeholder{type="Subscriber" original="[Subscriber:FirstName]" name="FirstName" value="" max-length=""}')
    const para = doc.content[0]!

    expect(para.content).toHaveLength(1)
    expect(para.content![0]).toMatchObject({
      type: 'placeholder',
      attrs: { type: 'Subscriber', name: 'FirstName', original: '[Subscriber:FirstName]', value: null },
    })
  })

  it('::placeholder and [Type:Name] shorthand produce equivalent JSON', () => {
    const fromShorthand = smsRfmToJson('[Subscriber:FirstName]')
    const fromDirective = smsRfmToJson('::placeholder{type="Subscriber" original="[Subscriber:FirstName]" name="FirstName" value="" max-length=""}')

    expect(fromDirective.content[0]!.content![0]).toMatchObject({
      type: 'placeholder',
      attrs: {
        type: fromShorthand.content[0]!.content![0]!.attrs.type,
        name: (fromShorthand.content[0]!.content![0]! as { attrs: { name: string } }).attrs.name,
        value: null,
        'max-length': null,
      },
    })
  })
})
