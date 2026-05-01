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
      template: '<a><b><c><d/></c></b></a>',
      copy: {},
      context: {},
    })

    expect(xml).toBe('<a><b><c><d/></c></b></a>')
  })

  it('handles multiple root-level siblings', () => {
    const { xml } = compileTemplate({
      template: '<a/><b/><c/>',
      copy: {},
      context: {},
    })

    expect(xml).toBe('<a/><b/><c/>')
  })

  it('handles attributes with colons and dashes', () => {
    const { xml } = compileTemplate({
      template: '<a rc-class="x" xml:lang="en"/>',
      copy: {},
      context: {},
    })

    expect(xml).toBe('<a rc-class="x" xml:lang="en"/>')
  })

  it('handles tag names with colons and dashes', () => {
    const { xml } = compileTemplate({
      template: '<rc-text tpl:id="x"/>',
      copy: {},
      context: {},
    })

    expect(xml).toBe('<rc-text tpl:id="x"/>')
  })

  it('accepts single-quoted attribute values', () => {
    const { xml } = compileTemplate({
      template: `<a title='x'/>`,
      copy: {},
      context: {},
    })

    expect(xml).toBe(`<a title='x'/>`)
  })

  it('throws on mismatched closing tag', () => {
    expect(() =>
      compileTemplate({
        template: '<a></b>',
        copy: {},
        context: {},
      }),
    ).toThrow(/Mismatched closing tag/)
  })

  it('throws on stray closing tag', () => {
    expect(() =>
      compileTemplate({
        template: '</a>',
        copy: {},
        context: {},
      }),
    ).toThrow()
  })
})

describe('template parser — @{…} bindings in attributes', () => {
  it('supports multiple bindings in one attribute', () => {
    const { xml } = compileTemplate({
      template: '<a href="@{proto}://@{host}/@{path}"/>',
      copy: {},
      context: { proto: 'https', host: 'x.com', path: 'a/b' },
    })

    expect(xml).toBe('<a href="https://x.com/a/b"/>')
  })

  it('handles empty attribute value', () => {
    const { xml } = compileTemplate({
      template: '<a x=""/>',
      copy: {},
      context: {},
    })

    expect(xml).toBe('<a x=""/>')
  })

  it('rejects an unterminated @{…} binding', () => {
    expect(() =>
      compileTemplate({
        template: '<a href="@{x"/>',
        copy: {},
        context: { x: 'v' },
      }),
    ).toThrow(/Unterminated|Unexpected/)
  })
})

describe('template parser — <?copy?> directive', () => {
  it('emits a zero-param copy into text', () => {
    const { xml } = compileTemplate({
      template: '<a><?copy greet?></a>',
      copy: { greet: 'hi' },
      context: {},
    })

    expect(xml).toBe('<a>hi</a>')
  })

  it('accepts a dotted key', () => {
    const { xml } = compileTemplate({
      template: '<a><?copy hero.title?></a>',
      copy: { hero: { title: 'Welcome' } },
      context: {},
    })

    expect(xml).toBe('<a>Welcome</a>')
  })

  it('passes multiple params through', () => {
    const { xml } = compileTemplate({
      template: '<a><?copy greeting first=user.first last=user.last?></a>',
      copy: { greeting: 'Hi {{first}} {{last}}' },
      context: { user: { first: 'Ada', last: 'L' } },
    })

    expect(xml).toBe('<a>Hi Ada L</a>')
  })

  it('supports literal and expression param values', () => {
    const { xml } = compileTemplate({
      template: `<a><?copy who truthy=!maybe count=3 label='ada'?></a>`,
      copy: { who: '{{label}}/{{count}}/{{truthy}}' },
      context: { maybe: false },
    })

    expect(xml).toBe('<a>ada/3/true</a>')
  })

  it('rejects a <?copy?> missing its key', () => {
    expect(() =>
      compileTemplate({
        template: '<a><?copy?></a>',
        copy: {},
        context: {},
      }),
    ).toThrow(/Expected message key/)
  })

  it('rejects a <?copy?> param without `=`', () => {
    expect(() =>
      compileTemplate({
        template: '<a><?copy key x y?></a>',
        copy: { key: '' },
        context: {},
      }),
    ).toThrow(/Expected '='/)
  })
})
