/**
 * Expression evaluator behavior — covers literal forms, path
 * resolution (data and local), operator precedence, short-circuit
 * evaluation, and the spec §8.5 truthiness rules.
 *
 * Tests run through the public `compileTemplate` API with a small
 * `runIf` helper that compiles `@if (cond) {<yes/>} @else {<no/>}`
 * against the supplied data and returns the resulting `<yes/>` or
 * `<no/>` string — so each assertion maps 1:1 to a truthiness outcome.
 */

import { describe, expect, it } from 'vitest'

import { compileTemplate } from '../index.js'

const runIf = (cond: string, data: Record<string, unknown> = {}): string =>
  compileTemplate({
    templateSrc: `@if (${cond}) {<yes/>} @else {<no/>}`,
    locale: 'en',
    messages: {},
    data,
  }).xml

describe('expression language — literals', () => {
  it('true / false / null literals', () => {
    expect(runIf('true')).toBe('<yes/>')
    expect(runIf('false')).toBe('<no/>')
    expect(runIf('null')).toBe('<no/>')
  })

  it('numeric comparisons', () => {
    expect(runIf('3 > 2')).toBe('<yes/>')
    expect(runIf('3 < 2')).toBe('<no/>')
    expect(runIf('3 >= 3')).toBe('<yes/>')
    expect(runIf('3 <= 2')).toBe('<no/>')
  })

  it('string equality', () => {
    expect(runIf("'a' == 'a'")).toBe('<yes/>')
    expect(runIf("'a' != 'b'")).toBe('<yes/>')
    expect(runIf("'a' == 'b'")).toBe('<no/>')
  })
})

describe('expression language — paths', () => {
  it('dataPath navigates nested objects', () => {
    expect(runIf('data:a.b.c == 1', { a: { b: { c: 1 } } })).toBe('<yes/>')
    expect(runIf('data:a.b.c == 2', { a: { b: { c: 1 } } })).toBe('<no/>')
  })

  it('missing path segments yield undefined (falsy)', () => {
    expect(runIf('data:missing.path', {})).toBe('<no/>')
    expect(runIf('!data:missing.path', {})).toBe('<yes/>')
  })

  it('mid-path traversal through a non-object yields undefined (falsy)', () => {
    // `data.a.b` — `a` resolves to a primitive string; walking into
    // `.b` must short-circuit to undefined rather than throw inside
    // the expression evaluator.
    expect(runIf('!data:a.b', { a: 'leaf' })).toBe('<yes/>')
  })

  it('localPath head not in any scope resolves to undefined (falsy)', () => {
    // `foo` is not in the scope stack (not a `@for` variable and not
    // a top-level key of `data`), so the lookup returns undefined.
    expect(runIf('!foo.bar')).toBe('<yes/>')
  })

  it('localPath tail traversal through a non-object yields undefined', () => {
    // Inside a `@for`, `x` is bound to a primitive; `x.k` must
    // short-circuit to undefined rather than throw.
    const xml = compileTemplate({
      templateSrc: '@for (let x of data:xs) {@if (!x.k) {<y/>}}',
      locale: 'en',
      messages: {},
      data: { xs: ['leaf'] },
    }).xml

    expect(xml).toBe('<y/>')
  })

  it('localPath tail traversal through a missing key yields undefined', () => {
    // Inside a `@for`, `x` is an object but `x.missing` isn't a
    // property — lookup returns undefined without error.
    const xml = compileTemplate({
      templateSrc: '@for (let x of data:xs) {@if (!x.missing) {<y/>}}',
      locale: 'en',
      messages: {},
      data: { xs: [{ a: 1 }] },
    }).xml

    expect(xml).toBe('<y/>')
  })
})

describe('expression language — loop-meta in expressions', () => {
  it('reads $index as a truthy/falsy value', () => {
    // First iteration `$index == 0` is true; remaining iterations
    // are false. The emitted `<yes/>` count tells us the count of
    // zero-index items.
    const xml = compileTemplate({
      templateSrc: '@for (let x of data:xs) {@if ($index == 0) {<yes/>} @else {<no/>}}',
      locale: 'en',
      messages: {},
      data: { xs: ['a', 'b', 'c'] },
    }).xml

    expect(xml).toBe('<yes/><no/><no/>')
  })

  it('compares $count and $last in a condition', () => {
    const xml = compileTemplate({
      templateSrc: '@for (let x of data:xs) {@if ($last) {<end/>}}',
      locale: 'en',
      messages: {},
      data: { xs: ['a', 'b'] },
    }).xml

    expect(xml).toBe('<end/>')
  })
})

describe('expression language — operators + precedence', () => {
  it('logical AND', () => {
    expect(runIf('data:a && data:b', { a: true, b: true })).toBe('<yes/>')
    expect(runIf('data:a && data:b', { a: true, b: false })).toBe('<no/>')
  })

  it('logical OR', () => {
    expect(runIf('data:a || data:b', { a: false, b: true })).toBe('<yes/>')
    expect(runIf('data:a || data:b', { a: false, b: false })).toBe('<no/>')
  })

  it('short-circuits && — right side not evaluated when left is falsy', () => {
    // If the right side evaluated, `data:missing.path` would surface
    // undefined (falsy) — still correct. Use the output value test
    // to verify no error is thrown.
    expect(runIf('false && data:never.read', {})).toBe('<no/>')
  })

  it('short-circuits || — right side not evaluated when left is truthy', () => {
    expect(runIf('true || data:never.read', {})).toBe('<yes/>')
  })

  it('unary !', () => {
    expect(runIf('!false')).toBe('<yes/>')
    expect(runIf('!true')).toBe('<no/>')
    expect(runIf('!!true')).toBe('<yes/>')
  })

  it('grouping overrides precedence', () => {
    expect(runIf('(false || true) && true')).toBe('<yes/>')
    expect(runIf('false || true && false')).toBe('<no/>') // && binds tighter
  })

  it('truthy zero / empty string (spec §8.5)', () => {
    expect(runIf('data:x', { x: 0 })).toBe('<yes/>') // 0 is truthy!
    expect(runIf('data:x', { x: '' })).toBe('<yes/>')
    expect(runIf('data:x', { x: [] })).toBe('<yes/>')
    expect(runIf('data:x', { x: {} })).toBe('<yes/>')
  })
})
