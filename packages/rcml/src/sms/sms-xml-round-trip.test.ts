import { describe, expect, it } from 'vitest'
import type { SmsDocument } from './sms-types.js'
import { smsToXml } from './sms-to-xml.js'
import { xmlToSms } from './xml-to-sms.js'
import { smsRfmToJson } from './sms-rfm-to-json.js'

/**
 * Docs that exercise the full range of SMS document shapes.
 */
const ROUND_TRIP_DOCS: ReadonlyArray<{ name: string; doc: SmsDocument }> = [
  {
    name: 'minimal empty document',
    doc: {
      tagName: 'rc-sms',
      attributes: {},
      content: smsRfmToJson(''),
    },
  },
  {
    name: 'plain text content',
    doc: {
      tagName: 'rc-sms',
      attributes: {},
      content: smsRfmToJson('Your order has shipped!'),
    },
  },
  {
    name: 'subscriber placeholder',
    doc: {
      tagName: 'rc-sms',
      attributes: {},
      content: smsRfmToJson('Hi [Subscriber:FirstName], your order is ready.'),
    },
  },
  {
    name: 'multiple placeholder types',
    doc: {
      tagName: 'rc-sms',
      attributes: {},
      content: smsRfmToJson('Hello [Subscriber:FirstName], total: [CustomField:Order.Total]. [Link:Unsubscribe]'),
    },
  },
  {
    name: 'hardbreak within paragraph',
    doc: {
      tagName: 'rc-sms',
      attributes: {},
      content: smsRfmToJson('Line one\nLine two\nLine three'),
    },
  },
  {
    name: 'multi-paragraph document',
    doc: {
      tagName: 'rc-sms',
      attributes: {},
      content: smsRfmToJson('Para one\n\nPara two\n\nPara three'),
    },
  },
  {
    name: 'preserves id attribute',
    doc: {
      id: 'abc-123',
      tagName: 'rc-sms',
      attributes: {},
      content: smsRfmToJson('Hello [Subscriber:FirstName]'),
    },
  },
]

// Documents with link marks are exercised separately under
// `describe('XML round-trip — link marks', …)` below — not because the
// round-trip is lossy (it isn't; the SMS RFM serializer emits a `:link`
// directive that the parser reads back into the same mark) but to keep
// the link-mark assertion focused on its own table.

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
    const original = smsRfmToJson('Hi [Subscriber:FirstName]!\nYour total: [CustomField:Order.Total].')
    const doc: SmsDocument = { tagName: 'rc-sms', attributes: {}, content: original }
    const xml1 = smsToXml(doc)
    const doc2 = xmlToSms(xml1)
    const xml2 = smsToXml(doc2)

    expect(xml2).toBe(xml1)
    expect(doc2).toEqual(doc)
  })
})

describe('XML round-trip — link marks', () => {
  it('link marks survive the XML round-trip via :link directive syntax', () => {
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

    // Link marks are preserved via :link[...]{...} directive serialization.
    expect(restored.content).toEqual(docWithLink.content)
  })
})
