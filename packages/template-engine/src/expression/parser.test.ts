/**
 * Expression parser behavior — asserts that the v3 grammar rejects
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
        template: `<?if ${expr}?><x/><?endif?>`,
        copy: {},
        context: {},
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
    mustReject('a?.b')
  })

  it('rejects nullish coalescing', () => {
    mustReject('a ?? b')
  })

  it('rejects bracket index access', () => {
    mustReject('a[0]')
  })

  it('rejects strict equality ===', () => {
    mustReject("'a' === 'a'")
  })

  it('rejects $-prefixed identifiers (loop-meta removed in v3)', () => {
    expect(() =>
      compileTemplate({
        template: '<?if $nope?><x/><?endif?>',
        copy: {},
        context: {},
      }),
    ).toThrow(TemplateCompileError)
  })

  it('rejects an unclosed grouping paren', () => {
    // Exercises the `consume('rparen', …)` throw path in the
    // expression parser's primary rule.
    expect(() =>
      compileTemplate({
        template: '<?if (true?><x/><?endif?>',
        copy: {},
        context: {},
      }),
    ).toThrow(TemplateCompileError)
  })
})
