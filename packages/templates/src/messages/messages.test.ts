import { describe, expect, it } from 'vitest'

import { compileTemplate } from '../index.js'

describe('messages — basic lookup', () => {
  it('resolves a single-segment key', () => {
    const { xml } = compileTemplate({
      templateSrc: '<a>{{t:hello}}</a>',
      locale: 'en',
      messages: { hello: 'Hello' },
      data: {},
    })

    expect(xml).toBe('<a>Hello</a>')
  })

  it('resolves a nested path', () => {
    const { xml } = compileTemplate({
      templateSrc: '<a>{{t:a.b.c}}</a>',
      locale: 'en',
      messages: { a: { b: { c: 'found' } } },
      data: {},
    })

    expect(xml).toBe('<a>found</a>')
  })

  it('throws on missing key', () => {
    expect(() =>
      compileTemplate({
        templateSrc: '<a>{{t:missing.key}}</a>',
        locale: 'en',
        messages: { a: { b: { c: 'x' } } },
        data: {},
      }),
    ).toThrow(/Message key not found: missing\.key/)
  })

  it('throws when traversing through a non-object mid-path', () => {
    // The lookup finds `a = "leaf"` at the first step, then tries to
    // descend into `.b` — a non-object is not walkable.
    expect(() =>
      compileTemplate({
        templateSrc: '<a>{{t:a.b}}</a>',
        locale: 'en',
        messages: { a: 'leaf' },
        data: {},
      }),
    ).toThrow(/Message key not found: a\.b/)
  })

  it('coerces a numeric leaf to its string form', () => {
    const { xml } = compileTemplate({
      templateSrc: '<a>{{t:count}}</a>',
      locale: 'en',
      messages: { count: 42 },
      data: {},
    })

    expect(xml).toBe('<a>42</a>')
  })

  it('coerces a boolean leaf to its string form', () => {
    const { xml } = compileTemplate({
      templateSrc: '<a>{{t:flag}}</a>',
      locale: 'en',
      messages: { flag: true },
      data: {},
    })

    expect(xml).toBe('<a>true</a>')
  })

  it('throws when the leaf is not a string/number/boolean', () => {
    expect(() =>
      compileTemplate({
        templateSrc: '<a>{{t:a}}</a>',
        locale: 'en',
        messages: { a: [1, 2, 3] },
        data: {},
      }),
    ).toThrow(/Message leaf must be a string: a/)
  })
})

describe('messages — parameterized', () => {
  it('substitutes a single param', () => {
    const { xml } = compileTemplate({
      templateSrc: '<a>{{t:greeting(name=data:user)}}</a>',
      locale: 'en',
      messages: { greeting: 'Hello, {name}' },
      data: { user: 'Ada' },
    })

    expect(xml).toBe('<a>Hello, Ada</a>')
  })

  it('substitutes multiple params', () => {
    const { xml } = compileTemplate({
      templateSrc: '<a>{{t:welcome(first=data:first, last=data:last)}}</a>',
      locale: 'en',
      messages: { welcome: '{first} {last}' },
      data: { first: 'Grace', last: 'Hopper' },
    })

    expect(xml).toBe('<a>Grace Hopper</a>')
  })

  it('throws when a required param is missing', () => {
    expect(() =>
      compileTemplate({
        templateSrc: '<a>{{t:greet()}}</a>',
        locale: 'en',
        messages: { greet: 'Hello, {name}!' },
        data: {},
      }),
    ).toThrow(/Message parameter missing: name/)
  })

  it('interpolates data paths as param values', () => {
    const { xml } = compileTemplate({
      templateSrc: '<a>{{t:hello(who=data:user.profile.name)}}</a>',
      locale: 'en',
      messages: { hello: 'Hi {who}' },
      data: { user: { profile: { name: 'Turing' } } },
    })

    expect(xml).toBe('<a>Hi Turing</a>')
  })

  it('params accept literal string values', () => {
    const { xml } = compileTemplate({
      templateSrc: `<a>{{t:hello(who='World')}}</a>`,
      locale: 'en',
      messages: { hello: 'Hi {who}' },
      data: {},
    })

    expect(xml).toBe('<a>Hi World</a>')
  })
})

describe('messages — RFM atom preservation (§14)', () => {
  it('carries double-quoted RFM syntax through interpolation', () => {
    const { xml } = compileTemplate({
      templateSrc:
        '<rc-text>{{t:welcome(name=data:fieldNames.firstName, value=data:customFieldsById.firstName)}}</rc-text>',
      locale: 'en',
      messages: {
        welcome: 'Hi ::placeholder{name="{name}" value="{value}"}',
      },
      data: {
        fieldNames: { firstName: 'Subscriber.FirstName' },
        customFieldsById: { firstName: 200001 },
      },
    })

    expect(xml).toBe(
      '<rc-text>Hi ::placeholder{name="Subscriber.FirstName" value="200001"}</rc-text>',
    )
  })
})
