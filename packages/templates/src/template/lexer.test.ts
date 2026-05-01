/**
 * Unit tests for the template tokeniser.
 *
 * The tokeniser is the most load-bearing piece of the compile
 * pipeline — every XML construct, every interpolation, every
 * directive keyword flows through it. These tests assert the shape
 * of the token stream (types + values) rather than the AST, so a
 * regression shows up here before it cascades into the parser or
 * evaluator.
 */

import { describe, expect, it } from 'vitest'

import { TemplateCompileError } from '../errors.js'
import { tokeniseTemplate } from './lexer.js'

const types = (src: string): string[] =>
  tokeniseTemplate({ source: src, sourcePath: 'test.xml' }).map((t) => t.type)

const values = (src: string): string[] =>
  tokeniseTemplate({ source: src, sourcePath: 'test.xml' }).map((t) => t.value)

describe('tokeniseTemplate — XML structural', () => {
  it('emits open + close for a plain element', () => {
    expect(types('<a></a>')).toEqual([
      'tag-open-start',
      'tag-open-end',
      'tag-close',
      'eof',
    ])
  })

  it('emits self-close for `<a/>`', () => {
    expect(types('<a/>')).toEqual([
      'tag-open-start',
      'tag-self-close',
      'eof',
    ])
  })

  it('emits attr-name + attr-equals + quoted value tokens', () => {
    const seq = types('<a x="1"/>')

    expect(seq).toEqual([
      'tag-open-start',
      'attr-name',
      'attr-equals',
      'attr-quote-open',
      'attr-text',
      'attr-quote-close',
      'tag-self-close',
      'eof',
    ])
  })

  it('emits only attr-name for HTML-style boolean attributes', () => {
    // `<a disabled>` — no equals, no value tokens.
    expect(types('<a disabled/>')).toEqual([
      'tag-open-start',
      'attr-name',
      'tag-self-close',
      'eof',
    ])
  })

  it('carries the tag name as the value of tag-open-start', () => {
    const toks = tokeniseTemplate({ source: '<rc-text/>', sourcePath: 'test.xml' })

    expect(toks[0]!.type).toBe('tag-open-start')
    expect(toks[0]!.value).toBe('rc-text')
  })

  it('carries the closing tag name as the value of tag-close', () => {
    const toks = tokeniseTemplate({ source: '<a></a>', sourcePath: 'test.xml' })
    const close = toks.find((t) => t.type === 'tag-close')!

    expect(close.value).toBe('a')
  })
})

describe('tokeniseTemplate — text + interpolation', () => {
  it('emits a text token for static content', () => {
    expect(types('<a>hi</a>')).toEqual([
      'tag-open-start',
      'tag-open-end',
      'text',
      'tag-close',
      'eof',
    ])
  })

  it('emits an interp token for a `{{…}}` in text position', () => {
    expect(types('<a>{{x}}</a>')).toEqual([
      'tag-open-start',
      'tag-open-end',
      'interp',
      'tag-close',
      'eof',
    ])
  })

  it('strips XML comments from the token stream', () => {
    const seq = types('<a><!-- x -->hi</a>')

    expect(seq.filter((t) => t !== 'eof')).toEqual([
      'tag-open-start',
      'tag-open-end',
      'text',
      'tag-close',
    ])
  })

  it('emits alternating attr-text and attr-interp inside attribute values', () => {
    expect(types('<a href="x/{{id}}/y"/>')).toEqual([
      'tag-open-start',
      'attr-name',
      'attr-equals',
      'attr-quote-open',
      'attr-text',
      'attr-interp',
      'attr-text',
      'attr-quote-close',
      'tag-self-close',
      'eof',
    ])
  })

  it('carries the interpolation body verbatim (no `{{` / `}}`)', () => {
    const toks = tokeniseTemplate({ source: '<a>{{data:x}}</a>', sourcePath: 'test.xml' })
    const interp = toks.find((t) => t.type === 'interp')!

    expect(interp.value).toBe('data:x')
  })
})

describe('tokeniseTemplate — directives', () => {
  it('emits @if / lparen / rparen / lbrace / rbrace around a condition', () => {
    expect(types('@if (data:x) {<a/>}')).toEqual([
      'if',
      'lparen',
      'text',
      'rparen',
      'lbrace',
      'tag-open-start',
      'tag-self-close',
      'rbrace',
      'eof',
    ])
  })

  it('emits `else-if` as a single token for `@else if`', () => {
    const seq = types('@if (true) {<a/>} @else if (false) {<b/>}')

    expect(seq).toContain('else-if')
  })

  it('emits `else` for `@else`', () => {
    const seq = types('@if (true) {<a/>} @else {<b/>}')

    expect(seq).toContain('else')
  })

  it('emits `for` for `@for`', () => {
    const seq = types('@for (let x of data:xs) {<i/>}')

    expect(seq).toContain('for')
  })
})

describe('tokeniseTemplate — location tracking', () => {
  it('assigns 1-based (line, column) to every token', () => {
    const toks = tokeniseTemplate({ source: '<a>hi</a>', sourcePath: 'test.xml' })

    expect(toks[0]!.loc.line).toBe(1)
    expect(toks[0]!.loc.column).toBe(1)
  })

  it('advances line count on `\\n`', () => {
    const toks = tokeniseTemplate({ source: '<a>\n</a>', sourcePath: 'test.xml' })
    const close = toks.find((t) => t.type === 'tag-close')!

    expect(close.loc.line).toBe(2)
  })
})

describe('tokeniseTemplate — errors', () => {
  it('rejects an unterminated opening tag', () => {
    expect(() =>
      tokeniseTemplate({ source: '<a', sourcePath: 'test.xml' }),
    ).toThrow(TemplateCompileError)
  })

  it('rejects an unterminated `{{`', () => {
    expect(() =>
      tokeniseTemplate({ source: '<a>{{ broken</a>', sourcePath: 'test.xml' }),
    ).toThrow(TemplateCompileError)
  })

  it('rejects a directive block that never closes', () => {
    expect(() =>
      tokeniseTemplate({ source: '@if (true) { <a/>', sourcePath: 'test.xml' }),
    ).toThrow(/Unterminated/)
  })

  it('rejects an element whose open is never matched by a close', () => {
    expect(() =>
      tokeniseTemplate({ source: '<a>hello', sourcePath: 'test.xml' }),
    ).toThrow(/Expected closing tag|Unterminated/)
  })

  it('rejects a missing tag name after `<`', () => {
    expect(() =>
      tokeniseTemplate({ source: '< >', sourcePath: 'test.xml' }),
    ).toThrow(/Expected tag name/)
  })

  it('rejects a close tag with a different name', () => {
    expect(() =>
      tokeniseTemplate({ source: '<a></b>', sourcePath: 'test.xml' }),
    ).toThrow(/Mismatched closing tag/)
  })

  it('rejects a close tag missing its `>`', () => {
    expect(() =>
      tokeniseTemplate({ source: '<a></a', sourcePath: 'test.xml' }),
    ).toThrow(/Expected '>' to close/)
  })

  it('rejects an unterminated XML comment', () => {
    expect(() =>
      tokeniseTemplate({ source: '<a><!-- oops </a>', sourcePath: 'test.xml' }),
    ).toThrow(/Unterminated XML comment/)
  })

  it('rejects an attribute with `=` but no quote', () => {
    expect(() =>
      tokeniseTemplate({ source: '<a x=1/>', sourcePath: 'test.xml' }),
    ).toThrow(/Expected .*to open attribute value/)
  })

  it('rejects an attribute with an unterminated value', () => {
    expect(() =>
      tokeniseTemplate({ source: '<a x="oops', sourcePath: 'test.xml' }),
    ).toThrow(/Unterminated attribute value/)
  })

  it('rejects `@if` without a `(` after', () => {
    expect(() =>
      tokeniseTemplate({ source: '@if <a/>', sourcePath: 'test.xml' }),
    ).toThrow(/Expected '\(' after directive keyword/)
  })

  it('rejects an unclosed directive expression paren', () => {
    expect(() =>
      tokeniseTemplate({ source: '@if (foo', sourcePath: 'test.xml' }),
    ).toThrow(/Unterminated directive expression/)
  })

  it('rejects a directive without its `{` block', () => {
    expect(() =>
      tokeniseTemplate({ source: '@if (true) <a/>', sourcePath: 'test.xml' }),
    ).toThrow(/Expected '\{' to open directive block/)
  })

  it('rejects an unterminated string literal inside an interpolation', () => {
    expect(() =>
      tokeniseTemplate({ source: '<a>{{ "oops }}</a>', sourcePath: 'test.xml' }),
    ).toThrow(/Unterminated string inside interpolation/)
  })
})

describe('tokeniseTemplate — edge cases that pass through as text', () => {
  it('treats a bare `@` followed by non-directive chars as text content', () => {
    const toks = tokeniseTemplate({
      source: '<a>contact@example.com</a>',
      sourcePath: 'test.xml',
    })

    expect(toks.find((t) => t.type === 'text')!.value).toContain('@example.com')
  })

  it('preserves escape sequences inside interpolation string literals', () => {
    // The lexer carries the body through verbatim (including the
    // backslash) for the expression sub-parser to decode.
    const toks = tokeniseTemplate({
      source: `<a>{{ t:k(x="a\\"b") }}</a>`,
      sourcePath: 'test.xml',
    })
    const interp = toks.find((t) => t.type === 'interp')!

    expect(interp.value).toContain('a\\"b')
  })
})

// `values` stays used so ESLint doesn't flag it as dead code even if
// the test file evolves.
void values
