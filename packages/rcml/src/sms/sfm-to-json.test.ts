import { describe, it, expect } from 'vitest'
import { sfmToJson } from './sfm-to-json.js'
import type { SmsContentJson } from './content/json-validator/types.js'

describe('sfmToJson()', () => {
  describe('document structure', () => {
    it('empty string produces a single empty paragraph', () => {
      expect(sfmToJson('')).toEqual<SmsContentJson>({
        type: 'doc',
        content: [{ type: 'paragraph' }],
      })
    })

    it('plain text produces doc > paragraph > text', () => {
      expect(sfmToJson('Hello world')).toEqual<SmsContentJson>({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello world' }] }],
      })
    })
  })

  describe('placeholders', () => {
    it('parses a single placeholder', () => {
      expect(sfmToJson('[Subscriber:FirstName]')).toEqual<SmsContentJson>({
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
      const doc = sfmToJson('Hi [Subscriber:FirstName]!')
      const para = doc.content[0]!

      expect(para.content).toHaveLength(3)
      expect(para.content![0]).toEqual({ type: 'text', text: 'Hi ' })
      expect(para.content![1]).toMatchObject({ type: 'placeholder', attrs: { name: 'FirstName' } })
      expect(para.content![2]).toEqual({ type: 'text', text: '!' })
    })

    it('parses multiple placeholder types', () => {
      const doc = sfmToJson('[CustomField:OrderId][Link:Unsubscribe][Date:Today]')
      const para = doc.content[0]!

      expect(para.content).toHaveLength(3)
      expect(para.content![0]).toMatchObject({ attrs: { type: 'CustomField', name: 'OrderId' } })
      expect(para.content![1]).toMatchObject({ attrs: { type: 'Link', name: 'Unsubscribe' } })
      expect(para.content![2]).toMatchObject({ attrs: { type: 'Date', name: 'Today' } })
    })
  })

  describe('line breaks', () => {
    it('single newline produces a hardbreak node', () => {
      const doc = sfmToJson('Line one\nLine two')
      const para = doc.content[0]!

      expect(para.content).toEqual([
        { type: 'text', text: 'Line one' },
        { type: 'hardbreak', attrs: { isInline: false } },
        { type: 'text', text: 'Line two' },
      ])
    })

    it('double newline produces a new paragraph', () => {
      const doc = sfmToJson('Para one\n\nPara two')

      expect(doc.content).toHaveLength(2)
      expect(doc.content[0]!.content).toEqual([{ type: 'text', text: 'Para one' }])
      expect(doc.content[1]!.content).toEqual([{ type: 'text', text: 'Para two' }])
    })
  })

  describe('combined', () => {
    it('placeholder mid-line with hardbreak', () => {
      const doc = sfmToJson('Hi [Subscriber:FirstName]!\nLine two')
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
