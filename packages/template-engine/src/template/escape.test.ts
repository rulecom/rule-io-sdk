/**
 * Unit tests for the XML context-aware escape helpers.
 *
 * These functions are the sole point of defense against unsafe
 * interpolation values breaking out of a text or attribute context.
 * The RFM-atom-in-message strategy (spec §14) depends on the
 * precise escape set — specifically, `"` and `'` must survive in
 * text-node context and only the matching delimiter gets escaped
 * in attribute context.
 */

import { describe, expect, it } from 'vitest'

import { escapeXmlAttr, escapeXmlText } from './escape.js'

describe('escapeXmlText', () => {
  it('escapes `&` to `&amp;`', () => {
    expect(escapeXmlText('a & b')).toBe('a &amp; b')
  })

  it('escapes `<` and `>` to entity refs', () => {
    expect(escapeXmlText('1 < 2 > 0')).toBe('1 &lt; 2 &gt; 0')
  })

  it('leaves `"` verbatim (so RFM atoms survive)', () => {
    expect(escapeXmlText('::placeholder{name="foo"}')).toBe(
      '::placeholder{name="foo"}',
    )
  })

  it('leaves `\'` verbatim', () => {
    expect(escapeXmlText("it's fine")).toBe("it's fine")
  })

  it('escapes `&` before other entities are considered (no double-escape of `&lt;`)', () => {
    // Feeding the output of escapeXmlText back through is a no-op
    // hazard: the first `&` would become `&amp;` and re-escaping
    // would turn `&amp;` into `&amp;amp;`. These tests only assert
    // single-pass behavior; double-escaping is a caller bug.
    expect(escapeXmlText('&lt;')).toBe('&amp;lt;')
  })

  it('returns empty string unchanged', () => {
    expect(escapeXmlText('')).toBe('')
  })

  it('leaves regular text unchanged', () => {
    expect(escapeXmlText('hello world 42')).toBe('hello world 42')
  })
})

describe('escapeXmlAttr', () => {
  it('escapes the matching double-quote delimiter', () => {
    expect(escapeXmlAttr('say "hi"', '"')).toBe('say &quot;hi&quot;')
  })

  it('escapes the matching single-quote delimiter', () => {
    expect(escapeXmlAttr("it's fine", "'")).toBe('it&apos;s fine')
  })

  it('leaves the non-matching quote verbatim', () => {
    expect(escapeXmlAttr(`she said "hi"`, "'")).toBe(`she said "hi"`)
    expect(escapeXmlAttr(`it's fine`, '"')).toBe(`it's fine`)
  })

  it('also escapes `&`, `<`, `>` regardless of quote', () => {
    expect(escapeXmlAttr('a & b < c', '"')).toBe('a &amp; b &lt; c')
    expect(escapeXmlAttr('a & b < c', "'")).toBe('a &amp; b &lt; c')
  })

  it('combines delimiter + text escapes in one pass', () => {
    expect(escapeXmlAttr('a "b" & <c>', '"')).toBe(
      'a &quot;b&quot; &amp; &lt;c&gt;',
    )
  })

  it('returns empty string unchanged', () => {
    expect(escapeXmlAttr('', '"')).toBe('')
    expect(escapeXmlAttr('', "'")).toBe('')
  })
})
