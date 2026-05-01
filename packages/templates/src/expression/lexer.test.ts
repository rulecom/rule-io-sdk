/**
 * Unit tests for the expression tokeniser.
 *
 * The expression lexer runs on the body of a `{{…}}` interpolation
 * and on the condition text between the parentheses of an `@if` or
 * `@for` header. These tests assert the full token set (operators,
 * identifiers, literals, punctuation) and that each token carries a
 * location relative to the supplied `baseLoc`.
 */

import { describe, expect, it } from 'vitest'

import { TemplateCompileError } from '../errors.js'
import { tokeniseExpression } from './lexer.js'

const baseLoc = { offset: 0, line: 1, column: 1 } as const

const types = (src: string): string[] =>
  tokeniseExpression(src, { source: src, sourcePath: 'test.xml', baseLoc }).map(
    (t) => t.type,
  )

const values = (src: string): string[] =>
  tokeniseExpression(src, { source: src, sourcePath: 'test.xml', baseLoc }).map(
    (t) => t.value,
  )

describe('tokeniseExpression — identifiers + literals', () => {
  it('emits an `ident` token for a plain word', () => {
    expect(types('foo')).toEqual(['ident', 'eof'])
    expect(values('foo')).toEqual(['foo', ''])
  })

  it('emits a `dollarIdent` for `$name`', () => {
    expect(types('$index')).toEqual(['dollarIdent', 'eof'])
    expect(values('$index')).toEqual(['$index', ''])
  })

  it('rejects a bare `$` without an identifier after', () => {
    expect(() =>
      tokeniseExpression('$', { source: '$', sourcePath: 'test.xml', baseLoc }),
    ).toThrow(TemplateCompileError)
  })

  it('emits a `number` token for an integer', () => {
    expect(types('42')).toEqual(['number', 'eof'])
    expect(values('42')).toEqual(['42', ''])
  })

  it('emits a `number` token for a decimal', () => {
    expect(values('3.14')).toEqual(['3.14', ''])
  })

  it('emits a `string` token for a double-quoted literal with the quotes stripped', () => {
    expect(values('"hi"')).toEqual(['hi', ''])
  })

  it('emits a `string` token for a single-quoted literal', () => {
    expect(values("'hi'")).toEqual(['hi', ''])
  })

  it('decodes basic backslash escapes inside strings', () => {
    expect(values('"line\\n"')).toEqual(['line\n', ''])
    expect(values('"tab\\t"')).toEqual(['tab\t', ''])
    expect(values('"quote\\""')).toEqual(['quote"', ''])
  })

  it('rejects an unterminated string literal', () => {
    expect(() =>
      tokeniseExpression('"nope', { source: '"nope', sourcePath: 'test.xml', baseLoc }),
    ).toThrow(/Unterminated string literal/)
  })
})

describe('tokeniseExpression — operators + punctuation', () => {
  it('emits the two-char operators with the right types', () => {
    expect(types('a && b')).toEqual(['ident', 'and', 'ident', 'eof'])
    expect(types('a || b')).toEqual(['ident', 'or', 'ident', 'eof'])
    expect(types('a == b')).toEqual(['ident', 'eq', 'ident', 'eof'])
    expect(types('a != b')).toEqual(['ident', 'neq', 'ident', 'eof'])
    expect(types('a <= b')).toEqual(['ident', 'lte', 'ident', 'eof'])
    expect(types('a >= b')).toEqual(['ident', 'gte', 'ident', 'eof'])
  })

  it('emits the single-char operators with the right types', () => {
    expect(types('a < b')).toEqual(['ident', 'lt', 'ident', 'eof'])
    expect(types('a > b')).toEqual(['ident', 'gt', 'ident', 'eof'])
    expect(types('!a')).toEqual(['bang', 'ident', 'eof'])
  })

  it('emits punctuation tokens for dotted paths and groupings', () => {
    expect(types('data:a.b')).toEqual(['ident', 'colon', 'ident', 'dot', 'ident', 'eof'])
    expect(types('(a)')).toEqual(['lparen', 'ident', 'rparen', 'eof'])
  })

  it('emits `comma` and `equals` tokens for message-param bindings', () => {
    expect(types('a=1, b=2')).toEqual([
      'ident', 'equals', 'number', 'comma', 'ident', 'equals', 'number', 'eof',
    ])
  })
})

describe('tokeniseExpression — whitespace + location tracking', () => {
  it('discards leading and trailing whitespace', () => {
    expect(types('   foo   ')).toEqual(['ident', 'eof'])
  })

  it('tracks column offsets past whitespace', () => {
    const toks = tokeniseExpression('   foo', {
      source: '   foo',
      sourcePath: 'test.xml',
      baseLoc,
    })

    expect(toks[0]!.loc.column).toBe(4)
  })

  it('advances line count on `\\n`', () => {
    const src = 'a\nb'
    const toks = tokeniseExpression(src, {
      source: src,
      sourcePath: 'test.xml',
      baseLoc,
    })
    const bTok = toks[1]!

    expect(bTok.value).toBe('b')
    expect(bTok.loc.line).toBe(2)
    expect(bTok.loc.column).toBe(1)
  })

  it('honours baseLoc when reporting positions', () => {
    const src = 'foo'
    const toks = tokeniseExpression(src, {
      source: `xxxx ${src}`,
      sourcePath: 'test.xml',
      baseLoc: { offset: 5, line: 1, column: 6 },
    })

    expect(toks[0]!.loc).toEqual({ offset: 5, line: 1, column: 6 })
  })
})

describe('tokeniseExpression — errors', () => {
  it('rejects an unknown character', () => {
    expect(() =>
      tokeniseExpression('~', { source: '~', sourcePath: 'test.xml', baseLoc }),
    ).toThrow(/Unexpected character/)
  })
})
