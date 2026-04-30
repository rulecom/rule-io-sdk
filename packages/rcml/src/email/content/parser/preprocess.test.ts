import { describe, it, expect } from 'vitest'
import {
  preprocessMarkdown,
  ATOM_TOKEN_DELIMITER as D,
  ATOM_TOKEN_SEPARATOR as S,
  COLON_ESCAPE as C,
} from './preprocess.js'

// Helpers for building expected token strings
const token = (name: string, attrs: string) => `${D}${name}${S}${attrs}${D}`

describe('exported PUA constants', () => {
  it('ATOM_TOKEN_DELIMITER is U+E000', () => {
    expect(D).toBe('\uE000')
  })

  it('ATOM_TOKEN_SEPARATOR is U+E001', () => {
    expect(S).toBe('\uE001')
  })

  it('COLON_ESCAPE is U+E002', () => {
    expect(C).toBe('\uE002')
  })
})

describe('preprocessMarkdown()', () => {
  describe('passthrough — input returned unchanged', () => {
    it('returns empty string unchanged', () => {
      expect(preprocessMarkdown('')).toBe('')
    })

    it('leaves plain text unchanged', () => {
      expect(preprocessMarkdown('Hello world.')).toBe('Hello world.')
    })

    it('leaves a standalone block-level ::placeholder unchanged', () => {
      const input = '::placeholder{type="Subscriber" value="first_name" name="First name" original="[subscriber:first_name]"}'

      expect(preprocessMarkdown(input)).toBe(input)
    })

    it('leaves a standalone block-level ::loop-value unchanged', () => {
      const input = '::loop-value{original="orders.name" value="orders" index="name"}'

      expect(preprocessMarkdown(input)).toBe(input)
    })

    it('leaves a standalone block-level ::placeholder-value-fragment unchanged', () => {
      const input = '::placeholder-value-fragment{}'

      expect(preprocessMarkdown(input)).toBe(input)
    })

    it('leaves a :::align container directive unchanged', () => {
      const input = ':::align{value="center"}'

      expect(preprocessMarkdown(input)).toBe(input)
    })

    it('leaves an unknown directive name unchanged', () => {
      const input = 'text ::unknown-directive{foo="bar"}'

      expect(preprocessMarkdown(input)).toBe(input)
    })
  })

  describe('mid-line atoms — pass 1 (preceded by non-newline, non-colon character)', () => {
    it('encodes ::placeholder preceded by a space', () => {
      const input = 'Hello ::placeholder{value="x" name="X" type="T" original="[x]"}'
      const expected = `Hello ${token('placeholder', 'value="x" name="X" type="T" original="[x]"')}`

      expect(preprocessMarkdown(input)).toBe(expected)
    })

    it('encodes ::loop-value preceded by a word character', () => {
      const input = 'word::loop-value{original="a.b" value="a" index="b"}'
      const expected = `word${token('loop-value', 'original="a.b" value="a" index="b"')}`

      expect(preprocessMarkdown(input)).toBe(expected)
    })

    it('encodes ::placeholder-value-fragment preceded by a space', () => {
      const input = 'text ::placeholder-value-fragment{}'
      const expected = `text ${token('placeholder-value-fragment', '')}`

      expect(preprocessMarkdown(input)).toBe(expected)
    })

    it('escapes colons in attrs', () => {
      const input = 'text ::placeholder{original="[subscriber:first_name]"}'
      const expected = `text ${token('placeholder', `original="[subscriber${C}first_name]"`)}`

      expect(preprocessMarkdown(input)).toBe(expected)
    })

    it('does NOT encode :::placeholder (container directive, triple colon)', () => {
      const input = 'text :::placeholder{type="T" value="x" name="X" original="[x]"}'

      expect(preprocessMarkdown(input)).toBe(input)
    })
  })

  describe('line-start consecutive atoms — pass 2', () => {
    it('encodes first atom at string start when immediately followed by another atom', () => {
      const input = '::placeholder{value="a" name="A" type="T" original="[a]"}::loop-value{original="b.c" value="b" index="c"}'
      const result = preprocessMarkdown(input)

      expect(result).toContain(token('placeholder', 'value="a" name="A" type="T" original="[a]"'))
      expect(result).toContain(token('loop-value', 'original="b.c" value="b" index="c"'))
    })

    it('encodes three consecutive atoms at string start', () => {
      const a = '::placeholder{value="a" name="A" type="T" original="[a]"}'
      const b = '::loop-value{original="b.c" value="b" index="c"}'
      const c = '::placeholder-value-fragment{}'
      const result = preprocessMarkdown(`${a}${b}${c}`)

      expect(result).toContain(token('placeholder', 'value="a" name="A" type="T" original="[a]"'))
      expect(result).toContain(token('loop-value', 'original="b.c" value="b" index="c"'))
      expect(result).toContain(token('placeholder-value-fragment', ''))
    })

    it('does NOT encode a lone atom at line start (block-level — no following non-whitespace)', () => {
      const input = '::placeholder{value="x" name="X" type="T" original="[x]"}\n'

      expect(preprocessMarkdown(input)).toBe(input)
    })

    it('encodes atom at line start mid-document when followed by non-whitespace', () => {
      const input = 'intro\n::placeholder{value="a" name="A" type="T" original="[a]"}::loop-value{original="b.c" value="b" index="c"}'
      const result = preprocessMarkdown(input)

      expect(result).toContain(token('placeholder', 'value="a" name="A" type="T" original="[a]"'))
      expect(result).toContain(token('loop-value', 'original="b.c" value="b" index="c"'))
    })
  })

  describe('token format', () => {
    it('wraps encoded atom with delimiter on both sides', () => {
      const result = preprocessMarkdown('text ::placeholder{value="x" name="X" type="T" original="[x]"}')

      expect(result.includes(D)).toBe(true)
      const firstD = result.indexOf(D)
      const lastD = result.lastIndexOf(D)

      expect(firstD).not.toBe(lastD) // two delimiters
    })

    it('encoded token contains separator between name and attrs', () => {
      const result = preprocessMarkdown('text ::placeholder{value="x" name="X" type="T" original="[x]"}')

      expect(result).toContain(`${D}placeholder${S}`)
    })
  })
})
