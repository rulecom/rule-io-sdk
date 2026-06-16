import { describe, it, expect } from 'vitest'
import { sms } from './sms-namespace.js'
import {
  createContent,
  createHardbreakNode,
  createParagraphNode,
  createTextNode,
} from './nodes.js'
import { createLinkMark } from './marks.js'
import {
  createCustomFieldPlaceholder,
  createDatePlaceholder,
  createLinkPlaceholder,
  createPlaceholderNode,
  createRemoteContentPlaceholder,
  createSubscriberPlaceholder,
  createUserPlaceholder,
} from './placeholders.js'
import { createSmsDocument } from '../create-sms-document.js'
import { jsonToSmsRfm } from '../json-to-sms-rfm.js'

describe('sms namespace identity', () => {
  it('exposes every builder as a property pointing at the underlying function', () => {
    // Nodes
    expect(sms.createContent).toBe(createContent)
    expect(sms.createParagraphNode).toBe(createParagraphNode)
    expect(sms.createTextNode).toBe(createTextNode)
    expect(sms.createHardbreakNode).toBe(createHardbreakNode)

    // Marks
    expect(sms.createLinkMark).toBe(createLinkMark)

    // Placeholders
    expect(sms.createPlaceholderNode).toBe(createPlaceholderNode)
    expect(sms.createSubscriberPlaceholder).toBe(createSubscriberPlaceholder)
    expect(sms.createUserPlaceholder).toBe(createUserPlaceholder)
    expect(sms.createCustomFieldPlaceholder).toBe(createCustomFieldPlaceholder)
    expect(sms.createDatePlaceholder).toBe(createDatePlaceholder)
    expect(sms.createRemoteContentPlaceholder).toBe(createRemoteContentPlaceholder)
    expect(sms.createLinkPlaceholder).toBe(createLinkPlaceholder)
  })

  it('exposes exactly the documented set of keys (no orphan exports)', () => {
    expect(Object.keys(sms).sort()).toEqual([
      'createContent',
      'createCustomFieldPlaceholder',
      'createDatePlaceholder',
      'createHardbreakNode',
      'createLinkMark',
      'createLinkPlaceholder',
      'createParagraphNode',
      'createPlaceholderNode',
      'createRemoteContentPlaceholder',
      'createSubscriberPlaceholder',
      'createTextNode',
      'createUserPlaceholder',
    ])
  })
})

describe('sms namespace through createSmsDocument', () => {
  it('builds a complete document and round-trips cleanly', () => {
    const content = sms.createContent({
      paragraphs: [
        sms.createParagraphNode({
          content: [
            sms.createTextNode({ text: 'Hi ' }),
            sms.createSubscriberPlaceholder({ field: 'FirstName' }),
            sms.createTextNode({ text: ', your order ' }),
            sms.createCustomFieldPlaceholder({ group: 'Order', name: 'Id' }),
            sms.createTextNode({ text: ' has shipped.' }),
          ],
        }),
        sms.createParagraphNode({
          content: [
            sms.createTextNode({ text: 'Track it: ' }),
            sms.createTextNode({
              text: 'click here',
              marks: [
                sms.createLinkMark({
                  href: 'https://example.com/orders/[CustomField:Order.Id]',
                  track: true,
                  shorten: true,
                }),
              ],
            }),
          ],
        }),
        sms.createParagraphNode({
          content: [
            sms.createTextNode({ text: 'Reply STOP: ' }),
            sms.createLinkPlaceholder({ link: 'Unsubscribe' }),
          ],
        }),
      ],
    })

    // Document factory accepts the builder output without throwing.
    const doc = createSmsDocument({ content })

    expect(doc.tagName).toBe('rc-sms')
    expect(doc.content).toBe(content)

    // Serializing the result back to SMS RFM produces a well-formed string
    // exercising every node + mark kind we built.
    const rfm = jsonToSmsRfm(content)

    expect(rfm).toContain('[Subscriber:FirstName]')
    expect(rfm).toContain('[CustomField:Order.Id]')
    expect(rfm).toContain('[Link:Unsubscribe]')
    expect(rfm).toContain(':link[click here]{href="https://example.com/orders/[CustomField:Order.Id]" track="true" shorten="true"}')
  })
})
