/**
 * Template evaluator tests — exercises the evaluator through the
 * public `compileTemplate` API. Covers:
 *
 *  - control flow (`@if` / `@else if` / `@else` / `@for`)
 *  - context-aware interpolation escaping (text vs attribute vs
 *    matching quote delimiter)
 *  - loop-meta variables (`$index`, `$count`, `$first`, `$last`,
 *    `$even`, `$odd`)
 *  - interpolation error paths (missing data path, loop-meta outside
 *    `@for`)
 */

import { describe, expect, it } from 'vitest'

import { TemplateCompileError, compileTemplate } from '../index.js'

describe('control flow — @if / @else if / @else', () => {
  it('renders the first truthy branch', () => {
    const { xml } = compileTemplate({
      templateSrc: '@if (data:a) {<a/>} @else if (data:b) {<b/>} @else {<c/>}',
      locale: 'en',
      messages: {},
      data: { a: false, b: true },
    })

    expect(xml).toBe('<b/>')
  })

  it('renders @else when all conditions false', () => {
    const { xml } = compileTemplate({
      templateSrc: '@if (data:a) {<a/>} @else if (data:b) {<b/>} @else {<c/>}',
      locale: 'en',
      messages: {},
      data: { a: false, b: false },
    })

    expect(xml).toBe('<c/>')
  })

  it('renders first branch when it is truthy (second not evaluated)', () => {
    const { xml } = compileTemplate({
      templateSrc: '@if (data:a) {<a/>} @else if (data:b) {<b/>}',
      locale: 'en',
      messages: {},
      data: { a: true, b: true },
    })

    expect(xml).toBe('<a/>')
  })

  it('renders nothing when the only @if is falsy and no @else', () => {
    const { xml } = compileTemplate({
      templateSrc: '<wrap>@if (data:a) {<a/>}</wrap>',
      locale: 'en',
      messages: {},
      data: { a: false },
    })

    expect(xml).toBe('<wrap></wrap>')
  })

  it('supports nested @if', () => {
    const tpl = `@if (data:outer) {@if (data:inner) {<both/>} @else {<outerOnly/>}} @else {<none/>}`

    expect(
      compileTemplate({ templateSrc: tpl, locale: 'en', messages: {}, data: { outer: true, inner: true } }).xml,
    ).toContain('<both/>')
    expect(
      compileTemplate({ templateSrc: tpl, locale: 'en', messages: {}, data: { outer: true, inner: false } }).xml,
    ).toContain('<outerOnly/>')
    expect(
      compileTemplate({ templateSrc: tpl, locale: 'en', messages: {}, data: { outer: false } }).xml,
    ).toContain('<none/>')
  })

  it('rejects @else without preceding @if', () => {
    expect(() =>
      compileTemplate({
        templateSrc: '@else { <x/> }',
        locale: 'en',
        messages: {},
        data: {},
      }),
    ).toThrow(/without preceding '@if'/)
  })

  it('rejects multiple @else blocks', () => {
    expect(() =>
      compileTemplate({
        templateSrc: '@if (true) { <x/> } @else { <y/> } @else { <z/> }',
        locale: 'en',
        messages: {},
        data: {},
      }),
    ).toThrow(/Only one '@else' block allowed/)
  })

  it('rejects `@else if` after `@else`', () => {
    expect(() =>
      compileTemplate({
        templateSrc: '@if (true) { <x/> } @else { <y/> } @else if (false) { <z/> }',
        locale: 'en',
        messages: {},
        data: {},
      }),
    ).toThrow(/'@else if' after '@else'/)
  })
})

describe('control flow — @for', () => {
  it('iterates a simple array of objects', () => {
    const { xml } = compileTemplate({
      templateSrc: '<ul>@for (let item of data:items) {<li>{{item.label}}</li>}</ul>',
      locale: 'en',
      messages: {},
      data: { items: [{ label: 'a' }, { label: 'b' }, { label: 'c' }] },
    })

    expect(xml).toBe('<ul><li>a</li><li>b</li><li>c</li></ul>')
  })

  it('iterates without "let" prefix', () => {
    const { xml } = compileTemplate({
      templateSrc: '<ul>@for (item of data:items) {<li>{{item.label}}</li>}</ul>',
      locale: 'en',
      messages: {},
      data: { items: [{ label: 'x' }] },
    })

    expect(xml).toBe('<ul><li>x</li></ul>')
  })

  it('exposes $index / $count / $first / $last / $even / $odd', () => {
    const { xml } = compileTemplate({
      templateSrc:
        '@for (let x of data:xs) { <r i="{{$index}}" n="{{$count}}" f="{{$first}}" l="{{$last}}" e="{{$even}}" o="{{$odd}}">{{x}}</r> }',
      locale: 'en',
      messages: {},
      data: { xs: ['a', 'b', 'c'] },
    })

    expect(xml).toContain('<r i="0" n="3" f="true" l="false" e="true" o="false">a</r>')
    expect(xml).toContain('<r i="1" n="3" f="false" l="false" e="false" o="true">b</r>')
    expect(xml).toContain('<r i="2" n="3" f="false" l="true" e="true" o="false">c</r>')
  })

  it('renders nothing for an empty array', () => {
    const { xml } = compileTemplate({
      templateSrc: '<ul>@for (let x of data:xs) {<li>{{x}}</li>}</ul>',
      locale: 'en',
      messages: {},
      data: { xs: [] },
    })

    expect(xml).toBe('<ul></ul>')
  })

  it('nested @for — inner $index is distinct from outer', () => {
    const { xml } = compileTemplate({
      templateSrc: `@for (let r of data:rows) {<r>@for (let c of r.cells) {<c>{{$index}}={{c}}</c>}</r>}`,
      locale: 'en',
      messages: {},
      data: {
        rows: [
          { cells: ['a', 'b'] },
          { cells: ['x'] },
        ],
      },
    })

    expect(xml).toContain('<r><c>0=a</c><c>1=b</c></r>')
    expect(xml).toContain('<r><c>0=x</c></r>')
  })

  it('throws when iterable is not an array', () => {
    expect(() =>
      compileTemplate({
        templateSrc: '@for (let x of data:bogus) {<x/>}',
        locale: 'en',
        messages: {},
        data: { bogus: 'not-array' },
      }),
    ).toThrow(TemplateCompileError)
  })

  it('rejects `@for` header with missing loop-variable name', () => {
    // Header starts with a non-identifier character after the
    // optional `let ` prefix, so the identifier scan consumes
    // nothing.
    expect(() =>
      compileTemplate({
        templateSrc: '@for (. of data:xs) {<x/>}',
        locale: 'en',
        messages: {},
        data: { xs: [] },
      }),
    ).toThrow(/Expected loop variable name/)
  })

  it('rejects `@for` header with missing `of` keyword', () => {
    expect(() =>
      compileTemplate({
        templateSrc: '@for (let item data:xs) {<x/>}',
        locale: 'en',
        messages: {},
        data: { xs: [] },
      }),
    ).toThrow(/Expected 'of'/)
  })

  it('parses `@for` header spread across newlines', () => {
    const { xml } = compileTemplate({
      templateSrc: '@for (\n  let item\n  of data:xs\n) {<i>{{item}}</i>}',
      locale: 'en',
      messages: {},
      data: { xs: ['a', 'b'] },
    })

    expect(xml).toBe('<i>a</i><i>b</i>')
  })

  it('parses `@for` header with newlines directly after `let` and `of`', () => {
    // Exercises the line++/column=1 branches in the `let`-gap and
    // `of`-gap whitespace loops of parseForHeader.
    const { xml } = compileTemplate({
      templateSrc: '@for (let \nitem of\n data:xs) {<i>{{item}}</i>}',
      locale: 'en',
      messages: {},
      data: { xs: ['z'] },
    })

    expect(xml).toBe('<i>z</i>')
  })

  it('parses `@for` header with extra non-newline whitespace after `let`', () => {
    // `let <tab>item` — `startsWith('let ')` consumes exactly one
    // trailing space; the post-`let` whitespace loop then iterates
    // the remaining tab, exercising the column++/non-newline branch
    // (distinct from the newline branch the previous test covers).
    const { xml } = compileTemplate({
      templateSrc: '@for (let \titem of data:xs) {<i>{{item}}</i>}',
      locale: 'en',
      messages: {},
      data: { xs: ['w'] },
    })

    expect(xml).toBe('<i>w</i>')
  })

  it('parses `@for` header with the `of\\t` form (tab after `of`)', () => {
    const { xml } = compileTemplate({
      templateSrc: '@for (let item of\tdata:xs) {<i>{{item}}</i>}',
      locale: 'en',
      messages: {},
      data: { xs: ['a'] },
    })

    expect(xml).toBe('<i>a</i>')
  })

  it('@if inside @for filters items', () => {
    const { xml } = compileTemplate({
      templateSrc:
        '<ul>@for (let x of data:xs) {@if (x.visible) {<li>{{x.label}}</li>}}</ul>',
      locale: 'en',
      messages: {},
      data: {
        xs: [
          { visible: true, label: 'a' },
          { visible: false, label: 'b' },
          { visible: true, label: 'c' },
        ],
      },
    })

    expect(xml).toBe('<ul><li>a</li><li>c</li></ul>')
  })
})

describe('interpolation — text-node escaping', () => {
  it('escapes & in text', () => {
    const { xml } = compileTemplate({
      templateSrc: '<a>{{data:x}}</a>',
      locale: 'en',
      messages: {},
      data: { x: 'Cats & Dogs' },
    })

    expect(xml).toBe('<a>Cats &amp; Dogs</a>')
  })

  it('escapes < and > in text', () => {
    const { xml } = compileTemplate({
      templateSrc: '<a>{{data:x}}</a>',
      locale: 'en',
      messages: {},
      data: { x: '3 > 2 < 4' },
    })

    expect(xml).toBe('<a>3 &gt; 2 &lt; 4</a>')
  })

  it('preserves " and \' in text', () => {
    const { xml } = compileTemplate({
      templateSrc: '<a>{{data:x}}</a>',
      locale: 'en',
      messages: {},
      data: { x: `She said "hi" and it's nice` },
    })

    expect(xml).toBe(`<a>She said "hi" and it's nice</a>`)
  })
})

describe('interpolation — attribute escaping', () => {
  it('escapes & < > in double-quoted attrs', () => {
    const { xml } = compileTemplate({
      templateSrc: '<a title="{{data:x}}">body</a>',
      locale: 'en',
      messages: {},
      data: { x: 'A & B < C > D' },
    })

    expect(xml).toBe('<a title="A &amp; B &lt; C &gt; D">body</a>')
  })

  it('escapes the matching quote delimiter only', () => {
    const dbl = compileTemplate({
      templateSrc: `<a t="{{data:x}}">b</a>`,
      locale: 'en',
      messages: {},
      data: { x: `He said "hi"` },
    })

    expect(dbl.xml).toBe(`<a t="He said &quot;hi&quot;">b</a>`)

    const sgl = compileTemplate({
      templateSrc: `<a t='{{data:x}}'>b</a>`,
      locale: 'en',
      messages: {},
      data: { x: `It's here` },
    })

    expect(sgl.xml).toBe(`<a t='It&apos;s here'>b</a>`)
  })
})

describe('interpolation — static text verbatim (spec §10)', () => {
  it('passes through static RFM atoms unchanged', () => {
    const { xml } = compileTemplate({
      templateSrc: '<rc-text>::placeholder{name="foo" value="42"}</rc-text>',
      locale: 'en',
      messages: {},
      data: {},
    })

    expect(xml).toBe('<rc-text>::placeholder{name="foo" value="42"}</rc-text>')
  })
})

describe('interpolation — mixed static + interpolated attribute', () => {
  it('concatenates literal + interpolation parts', () => {
    const { xml } = compileTemplate({
      templateSrc: '<a href="https://example.com/users/{{data:id}}?x=y">go</a>',
      locale: 'en',
      messages: {},
      data: { id: 42 },
    })

    expect(xml).toBe('<a href="https://example.com/users/42?x=y">go</a>')
  })
})

describe('interpolation — loop-meta', () => {
  it('renders inside text nodes', () => {
    const { xml } = compileTemplate({
      templateSrc: '@for (let x of data:xs) {<i>{{$index}}-{{x}}</i>}',
      locale: 'en',
      messages: {},
      data: { xs: ['a', 'b'] },
    })

    expect(xml).toBe('<i>0-a</i><i>1-b</i>')
  })

  it('renders inside attribute values', () => {
    const { xml } = compileTemplate({
      templateSrc: '@for (let x of data:xs) {<i data-n="{{$index}}"/>}',
      locale: 'en',
      messages: {},
      data: { xs: ['a', 'b'] },
    })

    expect(xml).toBe('<i data-n="0"/><i data-n="1"/>')
  })
})

describe('interpolation — error cases', () => {
  it('throws on missing data path', () => {
    expect(() =>
      compileTemplate({
        templateSrc: '<a>{{data:user.name}}</a>',
        locale: 'en',
        messages: {},
        data: {},
      }),
    ).toThrow(/Data path not found: user\.name/)
  })

  it('throws on loop-meta outside of @for', () => {
    expect(() =>
      compileTemplate({
        templateSrc: '<a>{{$index}}</a>',
        locale: 'en',
        messages: {},
        data: {},
      }),
    ).toThrow(/outside '@for'/)
  })

  it('throws on a local path whose head is not in scope', () => {
    // `item` isn't a `@for` binding and not a top-level key on
    // `data` — nothing to resolve against.
    expect(() =>
      compileTemplate({
        templateSrc: '<a>{{item.name}}</a>',
        locale: 'en',
        messages: {},
        data: {},
      }),
    ).toThrow(/Unknown variable: item\.name/)
  })

  it('throws when a `data:` path traverses through a non-object', () => {
    // Probe data path mid-walk: first segment resolves to `"leaf"`;
    // attempting to descend into `.b` is a missing-data error.
    expect(() =>
      compileTemplate({
        templateSrc: '<a>{{data:a.b}}</a>',
        locale: 'en',
        messages: {},
        data: { a: 'leaf' },
      }),
    ).toThrow(/Data path not found: a\.b/)
  })

  it('throws when a local path tail traverses through a non-object', () => {
    expect(() =>
      compileTemplate({
        templateSrc: '@for (let x of data:xs) {<a>{{x.k}}</a>}',
        locale: 'en',
        messages: {},
        data: { xs: ['leaf'] },
      }),
    ).toThrow(/Unknown variable: x\.k/)
  })

  it('throws when a local path tail references a missing key', () => {
    expect(() =>
      compileTemplate({
        templateSrc: '@for (let x of data:xs) {<a>{{x.missing}}</a>}',
        locale: 'en',
        messages: {},
        data: { xs: [{ a: 1 }] },
      }),
    ).toThrow(/Unknown variable: x\.missing/)
  })
})

describe('interpolation — value stringification', () => {
  it('JSON-stringifies object values', () => {
    const { xml } = compileTemplate({
      templateSrc: '<a>{{data:obj}}</a>',
      locale: 'en',
      messages: {},
      data: { obj: { k: 1 } },
    })

    // Curly braces survive (static text verbatim elsewhere; here
    // they're in an escaped interpolation value but `{` and `}` are
    // not in the XML-text escape set).
    expect(xml).toBe('<a>{"k":1}</a>')
  })

  it('JSON-stringifies array values', () => {
    const { xml } = compileTemplate({
      templateSrc: '<a>{{data:arr}}</a>',
      locale: 'en',
      messages: {},
      data: { arr: [1, 2, 3] },
    })

    expect(xml).toBe('<a>[1,2,3]</a>')
  })

  it('renders null / undefined as an empty string', () => {
    const { xml } = compileTemplate({
      templateSrc: '<a>[{{data:nope}}]</a>',
      locale: 'en',
      messages: {},
      data: { nope: null },
    })

    expect(xml).toBe('<a>[]</a>')
  })

  it('coerces numbers and booleans to string', () => {
    const { xml } = compileTemplate({
      templateSrc: '<a n="{{data:n}}" b="{{data:b}}"/>',
      locale: 'en',
      messages: {},
      data: { n: 42, b: false },
    })

    expect(xml).toBe('<a n="42" b="false"/>')
  })
})
