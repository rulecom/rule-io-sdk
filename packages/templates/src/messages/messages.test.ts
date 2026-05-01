import { describe, expect, it } from 'vitest'

import { compileTemplate } from '../index.js'

describe('messages — basic lookup', () => {
  it('resolves a single-segment key', () => {
    const { xml } = compileTemplate({
      template: '<a><?copy hello?></a>',
      copy: { hello: 'Hello' },
      context: {},
    })

    expect(xml).toBe('<a>Hello</a>')
  })

  it('resolves a nested path', () => {
    const { xml } = compileTemplate({
      template: '<a><?copy a.b.c?></a>',
      copy: { a: { b: { c: 'found' } } },
      context: {},
    })

    expect(xml).toBe('<a>found</a>')
  })

  it('throws on missing key', () => {
    expect(() =>
      compileTemplate({
        template: '<a><?copy missing.key?></a>',
        copy: { a: { b: { c: 'x' } } },
        context: {},
      }),
    ).toThrow(/Message key not found: missing\.key/)
  })

  it('throws when traversing through a non-object mid-path', () => {
    expect(() =>
      compileTemplate({
        template: '<a><?copy a.b?></a>',
        copy: { a: 'leaf' },
        context: {},
      }),
    ).toThrow(/Message key not found: a\.b/)
  })

  it('coerces a numeric leaf to its string form', () => {
    const { xml } = compileTemplate({
      template: '<a><?copy count?></a>',
      copy: { count: 42 },
      context: {},
    })

    expect(xml).toBe('<a>42</a>')
  })

  it('coerces a boolean leaf to its string form', () => {
    const { xml } = compileTemplate({
      template: '<a><?copy flag?></a>',
      copy: { flag: true },
      context: {},
    })

    expect(xml).toBe('<a>true</a>')
  })

  it('throws when the leaf is not a string/number/boolean', () => {
    expect(() =>
      compileTemplate({
        template: '<a><?copy a?></a>',
        copy: { a: [1, 2, 3] },
        context: {},
      }),
    ).toThrow(/Message leaf must be a string: a/)
  })
})

describe('messages — parameterized', () => {
  it('substitutes a single param', () => {
    const { xml } = compileTemplate({
      template: '<a><?copy greeting name=user?></a>',
      copy: { greeting: 'Hello, {{name}}' },
      context: { user: 'Ada' },
    })

    expect(xml).toBe('<a>Hello, Ada</a>')
  })

  it('substitutes multiple params', () => {
    const { xml } = compileTemplate({
      template: '<a><?copy welcome first=first last=last?></a>',
      copy: { welcome: '{{first}} {{last}}' },
      context: { first: 'Grace', last: 'Hopper' },
    })

    expect(xml).toBe('<a>Grace Hopper</a>')
  })

  it('throws when a required param is missing', () => {
    expect(() =>
      compileTemplate({
        template: '<a><?copy greet?></a>',
        copy: { greet: 'Hello, {{name}}!' },
        context: {},
      }),
    ).toThrow(/Message parameter missing: name/)
  })

  it('resolves data paths as param values', () => {
    const { xml } = compileTemplate({
      template: '<a><?copy hello who=user.profile.name?></a>',
      copy: { hello: 'Hi {{who}}' },
      context: { user: { profile: { name: 'Turing' } } },
    })

    expect(xml).toBe('<a>Hi Turing</a>')
  })

  it('accepts literal string values', () => {
    const { xml } = compileTemplate({
      template: `<a><?copy hello who='World'?></a>`,
      copy: { hello: 'Hi {{who}}' },
      context: {},
    })

    expect(xml).toBe('<a>Hi World</a>')
  })
})

describe('messages — RFM atom preservation', () => {
  it('carries double-quoted RFM syntax through a <?copy?> substitution', () => {
    const { xml } = compileTemplate({
      template:
        '<rc-text><?copy welcome name=fieldNames.firstName value=customFieldsById.firstName?></rc-text>',
      copy: {
        welcome: 'Hi ::placeholder{name="{{name}}" value="{{value}}"}',
      },
      context: {
        fieldNames: { firstName: 'Subscriber.FirstName' },
        customFieldsById: { firstName: 200001 },
      },
    })

    expect(xml).toBe(
      '<rc-text>Hi ::placeholder{name="Subscriber.FirstName" value="200001"}</rc-text>',
    )
  })
})
