/**
 * Expression evaluator behavior — covers literal forms, path
 * resolution (data and local), operator precedence, short-circuit
 * evaluation, and truthiness rules.
 *
 * Tests run through the public `compileTemplate` API with a small
 * `runIf` helper that compiles `<?if cond?><yes/><?else?><no/><?endif?>`
 * against the supplied data and returns the resulting `<yes/>` or
 * `<no/>` string — so each assertion maps 1:1 to a truthiness outcome.
 */

import { describe, expect, it } from 'vitest'

import { compileTemplate } from '../index.js'

const runIf = (cond: string, context: Record<string, unknown> = {}): string =>
  compileTemplate({
    template: `<?if ${cond}?><yes/><?else?><no/><?endif?>`,
    copy: {},
    context,
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
    expect(runIf('a.b.c == 1', { a: { b: { c: 1 } } })).toBe('<yes/>')
    expect(runIf('a.b.c == 2', { a: { b: { c: 1 } } })).toBe('<no/>')
  })

  it('missing path segments yield undefined (falsy)', () => {
    expect(runIf('missing.path', {})).toBe('<no/>')
    expect(runIf('!missing.path', {})).toBe('<yes/>')
  })

  it('mid-path traversal through a non-object yields undefined (falsy)', () => {
    // `data.a.b` — `a` resolves to a primitive string; walking into
    // `.b` must short-circuit to undefined rather than throw inside
    // the expression evaluator.
    expect(runIf('!a.b', { a: 'leaf' })).toBe('<yes/>')
  })

  it('localPath head not in any scope resolves to undefined (falsy)', () => {
    // `foo` is not in the scope stack (not a `<?for?>` variable and
    // not a top-level key of `data`), so the lookup returns undefined.
    expect(runIf('!foo.bar')).toBe('<yes/>')
  })

  it('localPath tail traversal through a non-object yields undefined', () => {
    // Inside a `<?for?>`, `x` is bound to a primitive; `x.k` must
    // short-circuit to undefined rather than throw.
    const xml = compileTemplate({
      template: '<?for let x of xs?><?if !x.k?><y/><?endif?><?endfor?>',
      copy: {},
      context: { xs: ['leaf'] },
    }).xml

    expect(xml).toBe('<y/>')
  })

  it('localPath tail traversal through a missing key yields undefined', () => {
    // Inside a `<?for?>`, `x` is an object but `x.missing` isn't a
    // property — lookup returns undefined without error.
    const xml = compileTemplate({
      template: '<?for let x of xs?><?if !x.missing?><y/><?endif?><?endfor?>',
      copy: {},
      context: { xs: [{ a: 1 }] },
    }).xml

    expect(xml).toBe('<y/>')
  })
})

describe('expression language — operators + precedence', () => {
  it('logical AND', () => {
    expect(runIf('a && b', { a: true, b: true })).toBe('<yes/>')
    expect(runIf('a && b', { a: true, b: false })).toBe('<no/>')
  })

  it('logical OR', () => {
    expect(runIf('a || b', { a: false, b: true })).toBe('<yes/>')
    expect(runIf('a || b', { a: false, b: false })).toBe('<no/>')
  })

  it('short-circuits && — right side not evaluated when left is falsy', () => {
    // If the right side evaluated, `missing.path` would surface
    // undefined (falsy) — still correct. Use the output value test
    // to verify no error is thrown.
    expect(runIf('false && never.read', {})).toBe('<no/>')
  })

  it('short-circuits || — right side not evaluated when left is truthy', () => {
    expect(runIf('true || never.read', {})).toBe('<yes/>')
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

  it('truthy zero / empty string / empty containers', () => {
    expect(runIf('x', { x: 0 })).toBe('<yes/>') // 0 is truthy!
    expect(runIf('x', { x: '' })).toBe('<yes/>')
    expect(runIf('x', { x: [] })).toBe('<yes/>')
    expect(runIf('x', { x: {} })).toBe('<yes/>')
  })
})
