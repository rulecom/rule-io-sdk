import { describe, expect, it } from 'vitest'
import { rcmlToXml } from './rcml-to-xml.js'

describe('rcmlToXml output', () => {
  it('pretty-prints by default', () => {
    const xml = rcmlToXml({
      tagName: 'rcml',
      children: [
        { tagName: 'rc-head', children: [] },
        { tagName: 'rc-body', children: [] },
      ],
    })

    expect(xml).toContain('\n  <rc-head')
    expect(xml).toContain('\n  <rc-body')
  })

  it('honours `pretty: false` for compact output', () => {
    const xml = rcmlToXml(
      {
        tagName: 'rcml',
        children: [
          { tagName: 'rc-head', children: [] },
          { tagName: 'rc-body', children: [] },
        ],
      },
      { pretty: false },
    )

    expect(xml).not.toContain('\n')
  })

  it('escapes special characters in attributes and text', () => {
    const xml = rcmlToXml({
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
                      attributes: { 'css-class': 'a & b "c"' },
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
    })

    expect(xml).toContain('&amp;')
    expect(xml).toContain('&quot;')
    expect(xml).toContain('&lt;')
  })

  it('emits attributes on elements that declare them', () => {
    const xml = rcmlToXml(
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

    expect(xml).toContain('background-color="#ffffff"')
    expect(xml).toContain('width="600px"')
  })

  it('respects a custom `indent` value', () => {
    const xml = rcmlToXml(
      {
        tagName: 'rcml',
        children: [{ tagName: 'rc-head', children: [] }],
      },
      { indent: '    ' },
    )

    expect(xml).toContain('\n    <rc-head')
  })
})
