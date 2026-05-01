/**
 * Expression parser behavior — asserts that the v1.1 grammar rejects
 * all the syntactic features it deliberately doesn't support:
 * function calls, arithmetic, ternary, optional chaining, nullish
 * coalescing, bracket indexing, and strict equality.
 *
 * Each rejection surfaces as a {@link TemplateCompileError} with a
 * line/col/frame pointing at the offending character.
 */

import { describe, expect, it } from 'vitest'

import { TemplateCompileError, compileTemplate } from '../index.js'

describe('expression language — unsupported syntax raises', () => {
  const mustReject = (expr: string): void => {
    expect(() =>
      compileTemplate({
        templateSrc: `@if (${expr}) {x}`,
        locale: 'en',
        messages: {},
        data: {},
      }),
    ).toThrow(TemplateCompileError)
  }

  it('rejects function calls', () => {
    mustReject('foo()')
  })

  it('rejects arithmetic', () => {
    mustReject('1 + 2')
  })

  it('rejects ternary', () => {
    mustReject('true ? 1 : 2')
  })

  it('rejects optional chaining', () => {
    mustReject('data:a?.b')
  })

  it('rejects nullish coalescing', () => {
    mustReject('data:a ?? data:b')
  })

  it('rejects bracket index access', () => {
    mustReject('data:a[0]')
  })

  it('rejects strict equality ===', () => {
    mustReject("'a' === 'a'")
  })

  it('rejects an unknown loop-meta name used as an expression term', () => {
    expect(() =>
      compileTemplate({
        templateSrc: '@if ($nope) {x}',
        locale: 'en',
        messages: {},
        data: {},
      }),
    ).toThrow(/Unknown loop-meta variable '\$nope'/)
  })

  it('rejects an unclosed grouping paren', () => {
    // Exercises the `consume('rparen', …)` throw path in the
    // expression parser's primary rule.
    expect(() =>
      compileTemplate({
        templateSrc: '@if ((true) {x}',
        locale: 'en',
        messages: {},
        data: {},
      }),
    ).toThrow(TemplateCompileError)
  })
})
