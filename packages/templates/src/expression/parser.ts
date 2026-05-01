/**
 * Expression parser — consumes an `ExprToken` stream from
 * {@link tokeniseExpression} and produces an {@link ExpressionNode}
 * AST.
 *
 * Grammar (BNF-ish):
 *
 * ```
 * Expression  := Or
 * Or          := And  ('||' And)*
 * And         := Equality ('&&' Equality)*
 * Equality    := Relational (('==' | '!=') Relational)*
 * Relational  := Unary (('<' | '<=' | '>' | '>=') Unary)*
 * Unary       := '!' Unary | Primary
 * Primary     := Literal | Path | Group
 * Path        := 'data' ':' Identifier ('.' Identifier)*
 *              | '$'Identifier                           // $index, $count, ...
 *              | Identifier ('.' Identifier)*            // local scope lookup
 * Group       := '(' Expression ')'
 * Literal     := String | Number | 'true' | 'false' | 'null'
 * ```
 *
 * No arithmetic, no ternary, no function calls, no `===`/`!==`, no
 * `?.`, no `??`, no `[]`. Spec §9.
 *
 * @internal
 */

import { TemplateCompileError } from '../errors.js'
import type { LoopMetaName } from '../types.js'
import type { ExprToken, ExprTokenType } from './lexer.js'
import { tokeniseExpression } from './lexer.js'
import type { BinaryOp, ExpressionNode } from './ast.js'

const LOOP_META_NAMES: ReadonlySet<string> = new Set([
  '$index',
  '$count',
  '$first',
  '$last',
  '$even',
  '$odd',
])

/**
 * Inputs for {@link parseExpression}. The parser tokenises `input`
 * internally via the expression lexer, so the same outer-source
 * context fields are needed for error locations.
 */
export interface ParseExpressionOptions {
  /** Full outer template source — used for error frames. */
  readonly source: string
  /** Optional file path for error prefixes. */
  readonly sourcePath?: string
  /** Source location of the first character of `input`. */
  readonly baseLoc: { readonly offset: number; readonly line: number; readonly column: number }
}

/**
 * Parse an expression source string into an {@link ExpressionNode}
 * AST.
 *
 * Used by the template parser for `@if` / `@else if` conditions,
 * `@for` iterables, and message-parameter values. The grammar is
 * the minimal v1.1 expression language (spec §9): no function
 * calls, no arithmetic, no ternary, no optional chaining.
 *
 * @param input - Raw expression source.
 * @param opts - Outer-source context for error locations.
 * @returns The parsed AST. The entire input must parse — any
 *   trailing tokens after a complete expression raise
 *   `TemplateCompileError`.
 */
export function parseExpression(
  input: string,
  opts: ParseExpressionOptions,
): ExpressionNode {
  const tokens = tokeniseExpression(input, opts)
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  const parser = new Parser(tokens, opts.source, opts.sourcePath)
  const node = parser.parseTopLevel()

  parser.expectEof()

  return node
}

/**
 * Read a comma-separated list of `name=value` message params from
 * the given token stream, starting at the `(` and ending at the
 * matching `)`.
 *
 * Used by the interpolation parser when a `{{t:key(…)}}` form has
 * a param list. Each param binds an identifier (the placeholder
 * name inside the message string) to an {@link ExpressionNode}
 * value.
 *
 * @param tokens - The token stream, positioned so `tokens[0]` is
 *   the opening `(`.
 * @param source - Full outer template source for error frames.
 * @param sourcePath - Optional file path for error prefixes.
 * @returns An ordered list of `{ name, value }` pairs — zero or
 *   more.
 */
export function parseMessageParams(
  tokens: ExprToken[],
  source: string,
  sourcePath: string | undefined,
): { name: string; value: ExpressionNode }[] {
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  const parser = new Parser(tokens, source, sourcePath)

  parser.consume('lparen', `Expected '('`)
  const params: { name: string; value: ExpressionNode }[] = []

  if (!parser.check('rparen')) {
    params.push(parser.parseMessageParam())

    while (parser.match('comma')) {
      params.push(parser.parseMessageParam())
    }
  }

  parser.consume('rparen', `Expected ')' to close message params`)

  return params
}

class Parser {
  private pos = 0

  constructor(
    private readonly tokens: ExprToken[],
    private readonly source: string,
    private readonly sourcePath: string | undefined,
  ) {}

  parseTopLevel(): ExpressionNode {
    return this.parseOr()
  }

  expectEof(): void {
    const t = this.peek()

    if (t.type !== 'eof') {
      throw this.error(`Unexpected token '${t.value}'`, t.loc)
    }
  }

  parseMessageParam(): { name: string; value: ExpressionNode } {
    const nameTok = this.consume('ident', 'Expected parameter name')

    this.consume('equals', `Expected '=' after parameter name`)
    const value = this.parseOr()

    return { name: nameTok.value, value }
  }

  // ── Precedence ladder ───────────────────────────────────────────

  private parseOr(): ExpressionNode {
    let left = this.parseAnd()

    while (this.check('or')) {
      const t = this.advance()
      const right = this.parseAnd()

      left = { kind: 'binary', op: '||', left, right, loc: t.loc }
    }

    return left
  }

  private parseAnd(): ExpressionNode {
    let left = this.parseEquality()

    while (this.check('and')) {
      const t = this.advance()
      const right = this.parseEquality()

      left = { kind: 'binary', op: '&&', left, right, loc: t.loc }
    }

    return left
  }

  private parseEquality(): ExpressionNode {
    let left = this.parseRelational()

    while (this.check('eq') || this.check('neq')) {
      const t = this.advance()
      const op: BinaryOp = t.type === 'eq' ? '==' : '!='
      const right = this.parseRelational()

      left = { kind: 'binary', op, left, right, loc: t.loc }
    }

    return left
  }

  private parseRelational(): ExpressionNode {
    let left = this.parseUnary()

    while (
      this.check('lt') || this.check('lte') ||
      this.check('gt') || this.check('gte')
    ) {
      const t = this.advance()
      const op: BinaryOp =
        t.type === 'lt' ? '<' :
          t.type === 'lte' ? '<=' :
            t.type === 'gt' ? '>' : '>='
      const right = this.parseUnary()

      left = { kind: 'binary', op, left, right, loc: t.loc }
    }

    return left
  }

  private parseUnary(): ExpressionNode {
    if (this.check('bang')) {
      const t = this.advance()
      const operand = this.parseUnary()

      return { kind: 'unary', op: '!', operand, loc: t.loc }
    }

    return this.parsePrimary()
  }

  private parsePrimary(): ExpressionNode {
    const t = this.peek()

    // Numeric literal
    if (t.type === 'number') {
      this.advance()

      return { kind: 'literal', value: Number(t.value), loc: t.loc }
    }

    // String literal
    if (t.type === 'string') {
      this.advance()

      return { kind: 'literal', value: t.value, loc: t.loc }
    }

    // Grouping
    if (t.type === 'lparen') {
      this.advance()
      const inner = this.parseOr()

      this.consume('rparen', `Expected ')'`)

      return { kind: 'group', expr: inner, loc: t.loc }
    }

    // Loop metadata ($index, $first, ...)
    if (t.type === 'dollarIdent') {
      this.advance()

      if (!LOOP_META_NAMES.has(t.value)) {
        throw this.error(`Unknown loop-meta variable '${t.value}'`, t.loc)
      }

      return { kind: 'loopMeta', name: t.value as LoopMetaName, loc: t.loc }
    }

    // Identifier-led: keyword literal OR data:… OR local path
    if (t.type === 'ident') {
      // true / false / null are keyword literals
      if (t.value === 'true' || t.value === 'false' || t.value === 'null') {
        this.advance()

        return {
          kind: 'literal',
          value: t.value === 'true' ? true : t.value === 'false' ? false : null,
          loc: t.loc,
        }
      }

      // data:a.b.c
      if (t.value === 'data' && this.tokens[this.pos + 1]?.type === 'colon') {
        this.advance() // 'data'
        this.advance() // ':'
        const path = this.parseDottedPath()

        return { kind: 'dataPath', path, loc: t.loc }
      }

      // Local path: identifier(.identifier)*
      this.advance()
      const tail: string[] = []

      while (this.check('dot')) {
        this.advance()
        const seg = this.consume('ident', 'Expected identifier after \'.\'')

        tail.push(seg.value)
      }

      return { kind: 'localPath', path: [t.value, ...tail], loc: t.loc }
    }

    throw this.error(`Unexpected token '${t.value}'`, t.loc)
  }

  private parseDottedPath(): string[] {
    const first = this.consume('ident', `Expected identifier after 'data:'`)
    const path = [first.value]

    while (this.check('dot')) {
      this.advance()
      const seg = this.consume('ident', 'Expected identifier after \'.\'')

      path.push(seg.value)
    }

    return path
  }

  // ── Token helpers ────────────────────────────────────────────────

  peek(): ExprToken {
    return this.tokens[this.pos]!
  }

  advance(): ExprToken {
    const t = this.tokens[this.pos]!

    this.pos++

    return t
  }

  check(type: ExprTokenType): boolean {
    return this.peek().type === type
  }

  match(type: ExprTokenType): boolean {
    if (this.check(type)) {
      this.advance()

      return true
    }

    return false
  }

  consume(type: ExprTokenType, message: string): ExprToken {
    const t = this.peek()

    if (t.type !== type) {
      throw this.error(`${message} (got '${t.value}')`, t.loc)
    }

    this.advance()

    return t
  }

  private error(message: string, loc: ExprToken['loc']): TemplateCompileError {
    return new TemplateCompileError(message, loc, this.source, this.sourcePath)
  }
}
