/**
 * Unit tests for the template tokeniser.
 *
 * The tokeniser is the most load-bearing piece of the compile
 * pipeline — every XML construct, every `@{…}` attribute binding,
 * every directive PI flows through it. These tests assert the shape
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

describe('tokeniseTemplate — text content', () => {
  it('emits a text token for static content', () => {
    expect(types('<a>hi</a>')).toEqual([
      'tag-open-start',
      'tag-open-end',
      'text',
      'tag-close',
      'eof',
    ])
  })

  it('treats a literal `{` / `}` in text as plain characters', () => {
    const toks = tokeniseTemplate({
      source: '<a>{name="x"}</a>',
      sourcePath: 'test.xml',
    })

    expect(toks.find((t) => t.type === 'text')!.value).toBe('{name="x"}')
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
})

describe('tokeniseTemplate — @{…} attribute bindings', () => {
  it('emits alternating attr-text and attr-binding inside attribute values', () => {
    expect(types('<a href="x/@{id}/y"/>')).toEqual([
      'tag-open-start',
      'attr-name',
      'attr-equals',
      'attr-quote-open',
      'attr-text',
      'attr-binding',
      'attr-text',
      'attr-quote-close',
      'tag-self-close',
      'eof',
    ])
  })

  it('carries the binding body verbatim (no `@{` / `}`)', () => {
    const toks = tokeniseTemplate({ source: '<a href="@{x}"/>', sourcePath: 'test.xml' })
    const binding = toks.find((t) => t.type === 'attr-binding')!

    expect(binding.value).toBe('x')
  })
})

describe('tokeniseTemplate — directive Processing Instructions', () => {
  it('emits `if-open` for `<?if expr?>` with the expression as value', () => {
    const toks = tokeniseTemplate({ source: '<?if x?>', sourcePath: 'test.xml' })
    const tok = toks[0]!

    expect(tok.type).toBe('if-open')
    expect(tok.value).toBe('x')
  })

  it('emits `if-open` then children then `if-close`', () => {
    expect(types('<?if x?><a/><?endif?>')).toEqual([
      'if-open',
      'tag-open-start',
      'tag-self-close',
      'if-close',
      'eof',
    ])
  })

  it('emits `elseif-open` for `<?elseif expr?>` with the expression as value', () => {
    const toks = tokeniseTemplate({
      source: '<?if a?><x/><?elseif b?><y/><?endif?>',
      sourcePath: 'test.xml',
    })
    const tok = toks.find((t) => t.type === 'elseif-open')!

    expect(tok.value).toBe('b')
  })

  it('emits `else-open` for `<?else?>` with empty value', () => {
    const toks = tokeniseTemplate({
      source: '<?if a?><x/><?else?><y/><?endif?>',
      sourcePath: 'test.xml',
    })
    const tok = toks.find((t) => t.type === 'else-open')!

    expect(tok.value).toBe('')
  })

  it('emits `for-open` for `<?for let x of xs?>` with the header as value', () => {
    const toks = tokeniseTemplate({
      source: '<?for let x of xs?><i/><?endfor?>',
      sourcePath: 'test.xml',
    })
    const tok = toks.find((t) => t.type === 'for-open')!

    expect(tok.value).toBe('let x of xs')
  })

  it('emits `for-close` for `<?endfor?>`', () => {
    expect(types('<?for let x of xs?><i/><?endfor?>')).toEqual([
      'for-open',
      'tag-open-start',
      'tag-self-close',
      'for-close',
      'eof',
    ])
  })

  it('emits `copy-open` for `<?copy key?>` with the data as value', () => {
    const toks = tokeniseTemplate({
      source: '<?copy hero.title?>',
      sourcePath: 'test.xml',
    })
    const tok = toks[0]!

    expect(tok.type).toBe('copy-open')
    expect(tok.value).toBe('hero.title')
  })

  it('emits `copy-open` carrying key + params verbatim', () => {
    const toks = tokeniseTemplate({
      source: '<?copy greet first=user.first?>',
      sourcePath: 'test.xml',
    })
    const tok = toks[0]!

    expect(tok.value).toBe('greet first=user.first')
  })

  it('preserves PI data spanning multiple lines', () => {
    const toks = tokeniseTemplate({
      source: '<?if\n  a\n  &&\n  b\n?><x/><?endif?>',
      sourcePath: 'test.xml',
    })
    const tok = toks[0]!

    expect(tok.type).toBe('if-open')
    expect(tok.value).toContain('a')
    expect(tok.value).toContain('b')
  })

  it('carries the data start location so expression errors point inside the PI', () => {
    const toks = tokeniseTemplate({ source: '<?if x?>', sourcePath: 'test.xml' })
    const tok = toks[0]!

    // `<?if ` is 5 characters, so data starts at column 6 (1-based).
    expect(tok.loc.line).toBe(1)
    expect(tok.loc.column).toBe(6)
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

  it('rejects `@{` in text content (spec §5.1)', () => {
    expect(() =>
      tokeniseTemplate({ source: '<a>@{broken}</a>', sourcePath: 'test.xml' }),
    ).toThrow(/not valid in text content/)
  })

  it('rejects an unterminated `@{…}` binding', () => {
    expect(() =>
      tokeniseTemplate({ source: '<a href="@{broken"/>', sourcePath: 'test.xml' }),
    ).toThrow(TemplateCompileError)
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

  it('rejects an unterminated Processing Instruction', () => {
    expect(() =>
      tokeniseTemplate({ source: '<?if x', sourcePath: 'test.xml' }),
    ).toThrow(/Unterminated Processing Instruction/)
  })

  it('rejects a PI with an unknown target', () => {
    expect(() =>
      tokeniseTemplate({ source: '<?while x?>', sourcePath: 'test.xml' }),
    ).toThrow(/Unknown PI target 'while'/)
  })

  it('rejects a PI missing its target', () => {
    expect(() =>
      tokeniseTemplate({ source: '<? x?>', sourcePath: 'test.xml' }),
    ).toThrow(/Expected PI target/)
  })

  it('rejects the XML prolog `<?xml?>` (unknown target)', () => {
    expect(() =>
      tokeniseTemplate({ source: '<?xml version="1.0"?><a/>', sourcePath: 'test.xml' }),
    ).toThrow(/Unknown PI target 'xml'/)
  })

  it('rejects an unterminated string literal inside an `@{…}` binding', () => {
    // Single-quoted string inside the binding never terminates — the
    // binding's string-literal reader runs to EOF rather than
    // bailing out at the outer attr's closing `"`.
    expect(() =>
      tokeniseTemplate({ source: "<a href=\"@{ 'nope\"/>", sourcePath: 'test.xml' }),
    ).toThrow(/Unterminated string inside '@\{…\}' binding/)
  })
})

describe('tokeniseTemplate — edge cases that pass through as text', () => {
  it('treats a bare `@` in text content as literal text', () => {
    const toks = tokeniseTemplate({
      source: '<a>contact@example.com</a>',
      sourcePath: 'test.xml',
    })

    expect(toks.find((t) => t.type === 'text')!.value).toContain('@example.com')
  })

  it('preserves string literals inside @{…} bindings verbatim', () => {
    // Single-quoted string inside an `@{…}` binding lives under a
    // double-quoted attr — the binding's string reader passes the
    // inner `'…'` through unchanged.
    const toks = tokeniseTemplate({
      source: "<a t=\"@{ x == 'hi' }\"/>",
      sourcePath: 'test.xml',
    })
    const binding = toks.find((t) => t.type === 'attr-binding')!

    expect(binding.value).toContain("'hi'")
  })
})

// `values` stays used so ESLint doesn't flag it as dead code even if
// the test file evolves.
void values
