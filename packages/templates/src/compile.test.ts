import { describe, expect, it } from 'vitest'

import { compileTemplate } from './index.js'

describe('compileTemplate — end-to-end', () => {
  it('compiles a trivial static template', () => {
    const { xml } = compileTemplate({
      templateSrc: '<a>hello</a>',
      locale: 'en',
      messages: {},
      data: {},
    })

    expect(xml).toBe('<a>hello</a>')
  })

  it('interpolates a data path into text', () => {
    const { xml } = compileTemplate({
      templateSrc: '<a>{{data:user.name}}</a>',
      locale: 'en',
      messages: {},
      data: { user: { name: 'Ada' } },
    })

    expect(xml).toBe('<a>Ada</a>')
  })

  it('interpolates a data path into an attribute', () => {
    const { xml } = compileTemplate({
      templateSrc: '<a href="{{data:user.url}}">x</a>',
      locale: 'en',
      messages: {},
      data: { user: { url: 'https://example.com' } },
    })

    expect(xml).toBe('<a href="https://example.com">x</a>')
  })

  it('looks up a message by key', () => {
    const { xml } = compileTemplate({
      templateSrc: '<h>{{t:hero.title}}</h>',
      locale: 'en',
      messages: { hero: { title: 'Welcome' } },
      data: {},
    })

    expect(xml).toBe('<h>Welcome</h>')
  })

  it('compiles the canonical spec §14 example', () => {
    const templateSrc = `<title>{{t:hero.title}}</title>
@if (data:user.premium) {<premium-banner color="{{data:theme.primary}}"/>}
@else {<regular-banner/>}`
    const { xml } = compileTemplate({
      templateSrc,
      locale: 'en',
      messages: { hero: { title: 'Welcome' } },
      data: { user: { premium: true }, theme: { primary: '#4F46E5' } },
    })

    expect(xml).toContain('<title>Welcome</title>')
    expect(xml).toContain('<premium-banner color="#4F46E5"/>')
    expect(xml).not.toContain('<regular-banner')
  })

  it('renders `{ xml }` shape — object return', () => {
    const result = compileTemplate({
      templateSrc: '<a>x</a>',
      locale: 'en',
      messages: {},
      data: {},
    })

    expect(Object.keys(result)).toEqual(['xml'])
    expect(typeof result.xml).toBe('string')
  })

  it('handles nested elements + attributes', () => {
    const { xml } = compileTemplate({
      templateSrc: '<wrap><a id="{{data:x}}"><b>{{data:y}}</b></a></wrap>',
      locale: 'en',
      messages: {},
      data: { x: '1', y: '2' },
    })

    expect(xml).toBe('<wrap><a id="1"><b>2</b></a></wrap>')
  })

  it('passes through self-closing tags', () => {
    const { xml } = compileTemplate({
      templateSrc: '<a><br/><c/></a>',
      locale: 'en',
      messages: {},
      data: {},
    })

    expect(xml).toBe('<a><br/><c/></a>')
  })

  it('preserves comments-less static text verbatim', () => {
    const { xml } = compileTemplate({
      templateSrc: '<a>Hello, "world" — & ::placeholder{name="x"}</a>',
      locale: 'en',
      messages: {},
      data: {},
    })

    expect(xml).toBe('<a>Hello, "world" — & ::placeholder{name="x"}</a>')
  })

  it('strips XML comments from output', () => {
    const { xml } = compileTemplate({
      templateSrc: '<a><!-- a note -->hi</a>',
      locale: 'en',
      messages: {},
      data: {},
    })

    expect(xml).toBe('<a>hi</a>')
  })

  it('emits attribute with empty value when value is omitted', () => {
    const { xml } = compileTemplate({
      templateSrc: '<a disabled>x</a>',
      locale: 'en',
      messages: {},
      data: {},
    })

    expect(xml).toBe('<a disabled="">x</a>')
  })
})

/**
 * RFM-atom-strategy scenarios — spec §14.
 *
 * The canonical shopify use case: a translation message carries the
 * full RFM `::placeholder{…}` atom with `{paramName}` placeholders
 * for the field path + value. The template hands in the dynamic
 * pieces via message params. The compiler's context-aware escape
 * rules (text-node context: escape `& < >`, preserve `" '`) ensure
 * the RFM atom's `"` delimiters survive intact.
 */
describe('RFM atom strategy (spec §14)', () => {
  it('produces a literal `::placeholder{…}` atom with dynamic name + value', () => {
    const { xml } = compileTemplate({
      templateSrc:
        '<rc-text>{{t:welcome(name=data:fieldNames.firstName, value=data:customFieldsById.firstName)}}</rc-text>',
      locale: 'en',
      messages: {
        welcome:
          'Hello, ::placeholder{name="{name}" value="{value}" type="CustomField"}',
      },
      data: {
        fieldNames: { firstName: 'Subscriber.FirstName' },
        customFieldsById: { firstName: 169233 },
      },
    })

    expect(xml).toBe(
      '<rc-text>Hello, ::placeholder{name="Subscriber.FirstName" value="169233" type="CustomField"}</rc-text>',
    )
  })

  it('preserves RFM atom when nested inside `@if`', () => {
    const { xml } = compileTemplate({
      templateSrc: `@if (data:show) {<rc-text>{{t:hi(name=data:fieldNames.firstName, value=data:customFieldsById.firstName)}}</rc-text>}`,
      locale: 'en',
      messages: { hi: '::placeholder{name="{name}" value="{value}"}' },
      data: {
        show: true,
        fieldNames: { firstName: 'Subscriber.FirstName' },
        customFieldsById: { firstName: 42 },
      },
    })

    expect(xml).toContain('::placeholder{name="Subscriber.FirstName" value="42"}')
  })

  it('emits a loop-value atom per iteration', () => {
    const { xml } = compileTemplate({
      templateSrc:
        '@for (let item of data:items) {<rc-text>{{t:line(key=item.key)}}</rc-text>}',
      locale: 'en',
      messages: { line: '::loop-value{original="[LoopValue:{key}]" value="{key}" index="{key}"}' },
      data: {
        items: [{ key: 'name' }, { key: 'quantity' }],
      },
    })

    expect(xml).toContain(
      '::loop-value{original="[LoopValue:name]" value="name" index="name"}',
    )
    expect(xml).toContain(
      '::loop-value{original="[LoopValue:quantity]" value="quantity" index="quantity"}',
    )
  })
})
