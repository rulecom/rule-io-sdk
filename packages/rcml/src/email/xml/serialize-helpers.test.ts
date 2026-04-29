import { describe, expect, it } from 'vitest'
import type { RCMLDocument } from '../../types.js'
import { serializeRcmlToXml } from './serialize-helpers.js'

/**
 * Unit tests for the JSON → XML serializer orchestrator. These focus on
 * the serializer's internal behaviour: options handling, attribute
 * coercion, `id` lifting, content fallbacks. Full public-API coverage
 * lives in `../rcml-to-xml.test.ts` and round-trip coverage lives in
 * `../rcml-xml-round-trip.test.ts`.
 */

const MIN_DOC: RCMLDocument = {
  tagName: 'rcml',
  children: [
    { tagName: 'rc-head', children: [] },
    { tagName: 'rc-body', children: [] },
  ],
}

describe('serializeRcmlToXml — options handling', () => {
  it('pretty-prints when `pretty` is omitted (default true)', () => {
    const out = serializeRcmlToXml(MIN_DOC, {})
    expect(out).toContain('\n  <rc-head')
    expect(out).toContain('\n  <rc-body')
  })

  it('pretty-prints when `pretty: true`', () => {
    const out = serializeRcmlToXml(MIN_DOC, { pretty: true })
    expect(out).toContain('\n')
  })

  it('produces a single line when `pretty: false`', () => {
    const out = serializeRcmlToXml(MIN_DOC, { pretty: false })
    expect(out).not.toContain('\n')
  })

  it('honours a custom `indent` value', () => {
    const out = serializeRcmlToXml(MIN_DOC, { indent: '\t' })
    expect(out).toContain('\n\t<rc-head')
  })

  it('trims the leading/trailing newlines fast-xml-parser adds in pretty mode', () => {
    const out = serializeRcmlToXml(MIN_DOC, { pretty: true })
    expect(out.startsWith('\n')).toBe(false)
    expect(out.endsWith('\n')).toBe(false)
  })
})

describe('serializeRcmlToXml — attribute handling', () => {
  it('emits string attributes verbatim', () => {
    const out = serializeRcmlToXml(
      {
        tagName: 'rcml',
        children: [
          { tagName: 'rc-head', children: [] },
          {
            tagName: 'rc-body',
            attributes: { 'background-color': '#ffffff', width: '600px' },
            children: [],
          },
        ],
      },
      { pretty: false },
    )
    expect(out).toContain('background-color="#ffffff"')
    expect(out).toContain('width="600px"')
  })

  it('coerces numeric attribute values to strings', () => {
    const out = serializeRcmlToXml(
      {
        tagName: 'rcml',
        children: [
          { tagName: 'rc-head', children: [] },
          {
            tagName: 'rc-body',
            // @ts-expect-error — width is typed `string`; we're exercising the coercion path on purpose.
            attributes: { width: 600 },
            children: [],
          },
        ],
      },
      { pretty: false },
    )
    expect(out).toContain('width="600"')
  })

  it('coerces boolean attribute values to strings', () => {
    const out = serializeRcmlToXml(
      {
        tagName: 'rcml',
        children: [
          { tagName: 'rc-head', children: [] },
          {
            tagName: 'rc-body',
            // @ts-expect-error — intentionally wrong runtime type
            attributes: { 'full-width': true },
            children: [],
          },
        ],
      },
      { pretty: false },
    )
    expect(out).toContain('full-width="true"')
  })

  it('lifts `id` from the top-level node into the XML attribute bag', () => {
    const out = serializeRcmlToXml(
      {
        id: 'root',
        tagName: 'rcml',
        children: [
          { id: 'h', tagName: 'rc-head', children: [] },
          { tagName: 'rc-body', children: [] },
        ],
      },
      { pretty: false },
    )
    expect(out).toContain('<rcml id="root">')
    expect(out).toContain('<rc-head id="h">')
  })
})

describe('serializeRcmlToXml — content handling', () => {
  it('embeds rc-text content as the element text body', () => {
    const out = serializeRcmlToXml(
      {
        tagName: 'rcml',
        children: [
          { tagName: 'rc-head', children: [] },
          {
            tagName: 'rc-body',
            children: [
              {
                tagName: 'rc-section',
                children: [
                  {
                    tagName: 'rc-column',
                    children: [
                      {
                        tagName: 'rc-text',
                        content: {
                          type: 'doc',
                          content: [
                            {
                              type: 'paragraph',
                              content: [{ type: 'text', text: 'Hello' }],
                            },
                          ],
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      { pretty: false },
    )
    expect(out).toContain('<rc-text>Hello</rc-text>')
  })

  it('escapes special characters in text content', () => {
    const out = serializeRcmlToXml(
      {
        tagName: 'rcml',
        children: [
          { tagName: 'rc-head', children: [] },
          {
            tagName: 'rc-body',
            children: [
              {
                tagName: 'rc-section',
                children: [
                  {
                    tagName: 'rc-column',
                    children: [
                      {
                        tagName: 'rc-text',
                        content: {
                          type: 'doc',
                          content: [
                            {
                              type: 'paragraph',
                              content: [{ type: 'text', text: 'x < y & z' }],
                            },
                          ],
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      { pretty: false },
    )
    expect(out).toContain('&amp;')
    expect(out).toContain('&lt;')
  })

  it('emits an empty rc-text element when content is missing', () => {
    const out = serializeRcmlToXml(
      {
        tagName: 'rcml',
        children: [
          { tagName: 'rc-head', children: [] },
          {
            tagName: 'rc-body',
            children: [
              {
                tagName: 'rc-section',
                children: [
                  {
                    tagName: 'rc-column',
                    children: [
                      // @ts-expect-error — exercising the missing-content fallback
                      { tagName: 'rc-text' },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      { pretty: false },
    )
    expect(out).toContain('<rc-text></rc-text>')
  })

  it('routes rc-button through the inline-RFM serializer', () => {
    const out = serializeRcmlToXml(
      {
        tagName: 'rcml',
        children: [
          { tagName: 'rc-head', children: [] },
          {
            tagName: 'rc-body',
            children: [
              {
                tagName: 'rc-section',
                children: [
                  {
                    tagName: 'rc-column',
                    children: [
                      {
                        tagName: 'rc-button',
                        content: {
                          type: 'doc',
                          content: [
                            {
                              type: 'paragraph',
                              content: [{ type: 'text', text: 'Click me' }],
                            },
                          ],
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      { pretty: false },
    )
    expect(out).toContain('<rc-button>Click me</rc-button>')
  })
})
