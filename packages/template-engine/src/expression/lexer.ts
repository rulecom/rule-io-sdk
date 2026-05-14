/**
 * Expression tokeniser. Runs on the body of an `@{…}` attribute
 * binding, an `<?if?>` / `<?elseif?>` condition, a `<?for?>`
 * header's iterable, or a `<?copy?>` PI's param value.
 *
 * Produces a flat token stream; each token carries a 1-based line+col
 * relative to the outer template source so error messages can point
 * at the right character.
 *
 * @internal
 */

import { TemplateCompileError } from '../errors.js'
import type { SourceLoc } from '../source/loc.js'

/**
 * Discriminator tag for every token produced by the expression
 * tokeniser. Values are chosen to be easy to pattern-match on in
 * {@link parseExpression}.
 *
 * - `ident` — identifier or keyword (`true`, `false`, `null`).
 * - `number` — numeric literal; value is the raw digit string.
 * - `string` — string literal; value has the quotes stripped and
 *   escape sequences decoded.
 * - `dot` / `lparen` / `rparen` / `equals` — punctuation used by the
 *   expression and `<?copy?>` grammars.
 * - `bang` / `and` / `or` / `eq` / `neq` / `lt` / `lte` / `gt` /
 *   `gte` — operators.
 * - `eof` — terminating sentinel emitted by the tokeniser so the
 *   parser can check for end-of-input uniformly.
 */
export type ExprTokenType =
  | 'ident'
  | 'number'
  | 'string'
  | 'dot'
  | 'lparen'
  | 'rparen'
  | 'bang'
  | 'and'
  | 'or'
  | 'eq'
  | 'neq'
  | 'lt'
  | 'lte'
  | 'gt'
  | 'gte'
  | 'equals'
  | 'eof'

/**
 * One atomic token emitted by {@link tokeniseExpression}.
 *
 * Carries the minimum metadata the parser needs to build the AST
 * and attach source locations to every node.
 */
export interface ExprToken {
  /** Grammatical category the token belongs to. */
  readonly type: ExprTokenType
  /**
   * The raw text of the token (identifier name, number digits,
   * decoded string contents, literal punctuation). Empty string for
   * `eof`.
   */
  readonly value: string
  /** Location of the token's first character in the outer source. */
  readonly loc: SourceLoc
}

/**
 * Inputs for {@link tokeniseExpression}. The tokeniser runs on
 * `input` but reports error locations relative to the outer source
 * via `baseLoc` so diagnostics point at the right character in the
 * original template.
 */
export interface TokeniseOptions {
  /** Full outer template source — used for error frames. */
  readonly source: string
  /** Optional file path for error prefixes. */
  readonly sourcePath?: string
  /** Source-location of the first character of `input`. */
  readonly baseLoc: SourceLoc
}

/**
 * Tokenise an expression source string into a flat {@link ExprToken}
 * stream terminated with an `eof` token.
 *
 * The tokeniser is a single-pass state machine; it does not
 * allocate per-character objects and operates in O(n) over `input`.
 *
 * @param input - The expression source to tokenise.
 * @param opts - Outer-source context for error locations.
 * @returns The token stream. Always ends with an `eof` token, even
 *   if `input` is empty or entirely whitespace.
 */
export function tokeniseExpression(input: string, opts: TokeniseOptions): ExprToken[] {
  const tokens: ExprToken[] = []
  let i = 0
  let line = opts.baseLoc.line
  let col = opts.baseLoc.column

  const locAt = (offset: number, l: number, c: number): SourceLoc => ({
    offset: opts.baseLoc.offset + offset,
    line: l,
    column: c,
  })

  const advance = (n = 1): void => {
    for (let k = 0; k < n; k++) {
      if (input[i] === '\n') {
        line++
        col = 1
      } else {
        col++
      }

      i++
    }
  }

  while (i < input.length) {
    const ch = input[i]!

    // Whitespace
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      advance()
      continue
    }

    const startLoc = locAt(i, line, col)

    // Identifiers + keywords
    if (isIdentStart(ch)) {
      const start = i

      while (i < input.length && isIdentPart(input[i]!)) advance()

      tokens.push({ type: 'ident', value: input.slice(start, i), loc: startLoc })
      continue
    }

    // Numeric literal
    if (ch >= '0' && ch <= '9') {
      const start = i

      while (i < input.length && input[i]! >= '0' && input[i]! <= '9') advance()

      if (input[i] === '.') {
        advance()

        while (i < input.length && input[i]! >= '0' && input[i]! <= '9') advance()
      }

      tokens.push({ type: 'number', value: input.slice(start, i), loc: startLoc })
      continue
    }

    // String literal — single or double quoted
    if (ch === '"' || ch === "'") {
      const quote = ch

      advance()
      let out = ''

      while (i < input.length && input[i] !== quote) {
        if (input[i] === '\\' && i + 1 < input.length) {
          const next = input[i + 1]!

          out += next === 'n' ? '\n' : next === 't' ? '\t' : next
          advance(2)
          continue
        }

        out += input[i]
        advance()
      }

      if (input[i] !== quote) {
        throw new TemplateCompileError(
          `Unterminated string literal`,
          startLoc,
          opts.source,
          opts.sourcePath,
        )
      }

      advance() // closing quote
      tokens.push({ type: 'string', value: out, loc: startLoc })
      continue
    }

    // Multi-char punctuation
    const two = input.slice(i, i + 2)

    if (two === '&&' || two === '||' || two === '==' || two === '!=' || two === '<=' || two === '>=') {
      advance(2)
      tokens.push({
        type:
          two === '&&'
            ? 'and'
            : two === '||'
              ? 'or'
              : two === '=='
                ? 'eq'
                : two === '!='
                  ? 'neq'
                  : two === '<='
                    ? 'lte'
                    : 'gte',
        value: two,
        loc: startLoc,
      })
      continue
    }

    // Single-char punctuation
    const single = ({
      '.': 'dot',
      '(': 'lparen',
      ')': 'rparen',
      '!': 'bang',
      '<': 'lt',
      '>': 'gt',
      '=': 'equals',
    } as const)[ch]

    if (single !== undefined) {
      advance()
      tokens.push({ type: single, value: ch, loc: startLoc })
      continue
    }

    throw new TemplateCompileError(
      `Unexpected character '${ch}'`,
      startLoc,
      opts.source,
      opts.sourcePath,
    )
  }

  tokens.push({
    type: 'eof',
    value: '',
    loc: locAt(i, line, col),
  })

  return tokens
}

function isIdentStart(ch: string): boolean {
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_'
}

function isIdentPart(ch: string): boolean {
  return isIdentStart(ch) || (ch >= '0' && ch <= '9')
}
