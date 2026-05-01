import { describe, expect, it } from 'vitest'

import { compileTemplate } from '../index.js'

/**
 * The parser is tested indirectly through the compile pipeline.
 * These cases exercise shapes the compile/control-flow suites don't
 * cover directly.
 */

describe('template parser — element shapes', () => {
  it('handles deeply nested elements', () => {
    const { xml } = compileTemplate({
      templateSrc: '<a><b><c><d/></c></b></a>',
      locale: 'en',
      messages: {},
      data: {},
    })

    expect(xml).toBe('<a><b><c><d/></c></b></a>')
  })

  it('handles multiple root-level siblings', () => {
    const { xml } = compileTemplate({
      templateSrc: '<a/><b/><c/>',
      locale: 'en',
      messages: {},
      data: {},
    })

    expect(xml).toBe('<a/><b/><c/>')
  })

  it('handles attributes with colons and dashes', () => {
    const { xml } = compileTemplate({
      templateSrc: '<a rc-class="x" xml:lang="en"/>',
      locale: 'en',
      messages: {},
      data: {},
    })

    expect(xml).toBe('<a rc-class="x" xml:lang="en"/>')
  })

  it('handles tag names with colons and dashes', () => {
    const { xml } = compileTemplate({
      templateSrc: '<rc-text tpl:id="x"/>',
      locale: 'en',
      messages: {},
      data: {},
    })

    expect(xml).toBe('<rc-text tpl:id="x"/>')
  })

  it('accepts single-quoted attribute values', () => {
    const { xml } = compileTemplate({
      templateSrc: `<a title='x'/>`,
      locale: 'en',
      messages: {},
      data: {},
    })

    expect(xml).toBe(`<a title='x'/>`)
  })

  it('throws on mismatched closing tag', () => {
    expect(() =>
      compileTemplate({
        templateSrc: '<a></b>',
        locale: 'en',
        messages: {},
        data: {},
      }),
    ).toThrow(/Mismatched closing tag/)
  })

  it('throws on stray closing tag', () => {
    expect(() =>
      compileTemplate({
        templateSrc: '</a>',
        locale: 'en',
        messages: {},
        data: {},
      }),
    ).toThrow()
  })
})

describe('template parser — interpolation in attributes', () => {
  it('supports multiple interpolations in one attribute', () => {
    const { xml } = compileTemplate({
      templateSrc: '<a href="{{data:proto}}://{{data:host}}/{{data:path}}"/>',
      locale: 'en',
      messages: {},
      data: { proto: 'https', host: 'x.com', path: 'a/b' },
    })

    expect(xml).toBe('<a href="https://x.com/a/b"/>')
  })

  it('handles empty attribute value', () => {
    const { xml } = compileTemplate({
      templateSrc: '<a x=""/>',
      locale: 'en',
      messages: {},
      data: {},
    })

    expect(xml).toBe('<a x=""/>')
  })
})

describe('template parser — interpolation edge cases', () => {
  it('allows spaces inside `{{ expr }}`', () => {
    const { xml } = compileTemplate({
      templateSrc: '<a>{{ data:x }}</a>',
      locale: 'en',
      messages: {},
      data: { x: 'ok' },
    })

    expect(xml).toBe('<a>ok</a>')
  })

  it('rejects an empty `{{ }}` interpolation', () => {
    expect(() =>
      compileTemplate({
        templateSrc: '<a>{{}}</a>',
        locale: 'en',
        messages: {},
        data: {},
      }),
    ).toThrow(/Empty interpolation/)
  })

  it('rejects an unterminated interpolation', () => {
    expect(() =>
      compileTemplate({
        templateSrc: '<a>{{ data:x </a>',
        locale: 'en',
        messages: {},
        data: {},
      }),
    ).toThrow(/Unterminated interpolation|Unexpected/)
  })
})
