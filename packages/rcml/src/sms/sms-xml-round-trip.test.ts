import { describe, expect, it } from 'vitest'
import type { SmsDocument } from './sms-types.js'
import { smsToXml } from './sms-to-xml.js'
import { xmlToSms } from './xml-to-sms.js'
import { sfmToJson } from './sfm-to-json.js'

/**
 * Docs that exercise the full range of SMS document shapes.
 */
const ROUND_TRIP_DOCS: ReadonlyArray<{ name: string; doc: SmsDocument }> = [
  {
    name: 'minimal empty document',
    doc: {
      tagName: 'rc-sms',
      attributes: {},
      content: sfmToJson(''),
    },
  },
  {
    name: 'plain text content',
    doc: {
      tagName: 'rc-sms',
      attributes: {},
      content: sfmToJson('Your order has shipped!'),
    },
  },
  {
    name: 'subscriber placeholder',
    doc: {
      tagName: 'rc-sms',
      attributes: {},
      content: sfmToJson('Hi [Subscriber:FirstName], your order is ready.'),
    },
  },
  {
    name: 'multiple placeholder types',
    doc: {
      tagName: 'rc-sms',
      attributes: {},
      content: sfmToJson('Hello [Subscriber:FirstName], total: [CustomField:Order.Total]. [Link:Unsubscribe]'),
    },
  },
  {
    name: 'hardbreak within paragraph',
    doc: {
      tagName: 'rc-sms',
      attributes: {},
      content: sfmToJson('Line one\nLine two\nLine three'),
    },
  },
  {
    name: 'multi-paragraph document',
    doc: {
      tagName: 'rc-sms',
      attributes: {},
      content: sfmToJson('Para one\n\nPara two\n\nPara three'),
    },
  },
  {
    name: 'preserves id attribute',
    doc: {
      id: 'abc-123',
      tagName: 'rc-sms',
      attributes: {},
      content: sfmToJson('Hello [Subscriber:FirstName]'),
    },
  },
]

// Documents with link marks are intentionally excluded from ROUND_TRIP_DOCS:
// the XML format serializes content as SFM, which cannot represent link marks.
// Link mark lossiness is tested explicitly below.

describe('smsToXml → xmlToSms round-trip', () => {
  for (const { name, doc } of ROUND_TRIP_DOCS) {
    it(name, () => {
      const xml = smsToXml(doc)
      const restored = xmlToSms(xml)

      expect(restored).toEqual(doc)
    })
  }
})

describe('xmlToSms → smsToXml (string → JSON → string) idempotence', () => {
  it('stable for a pretty-printed canonical XML', () => {
    const xml = '<rc-sms>Hello [Subscriber:FirstName]</rc-sms>'
    const json = xmlToSms(xml)
    const xml2 = smsToXml(json, { pretty: false })
    const json2 = xmlToSms(xml2)

    expect(json2).toEqual(json)
  })

  it('stable over multiple round-trips', () => {
    const original = sfmToJson('Hi [Subscriber:FirstName]!\nYour total: [CustomField:Order.Total].')
    const doc: SmsDocument = { tagName: 'rc-sms', attributes: {}, content: original }
    const xml1 = smsToXml(doc)
    const doc2 = xmlToSms(xml1)
    const xml2 = smsToXml(doc2)

    expect(xml2).toBe(xml1)
    expect(doc2).toEqual(doc)
  })
})

describe('XML round-trip — known lossiness', () => {
  it('link marks are dropped because SFM cannot represent them', () => {
    const docWithLink: SmsDocument = {
      tagName: 'rc-sms',
      attributes: {},
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Hello ' },
              {
                type: 'text',
                text: 'click here',
                marks: [{ type: 'link', attrs: { href: 'https://example.com', track: true, shorten: false } }],
              },
            ],
          },
        ],
      },
    }

    const xml = smsToXml(docWithLink)
    const restored = xmlToSms(xml)

    // Link marks are stripped — the text is preserved but marks are gone.
    expect(restored.content).toEqual({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello click here' }],
        },
      ],
    })
  })
})
