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
 * Path        := Identifier ('.' Identifier)*             // scope-stack lookup
 * Group       := '(' Expression ')'
 * Literal     := String | Number | 'true' | 'false' | 'null'
 * ```
 *
 * No arithmetic, no ternary, no function calls, no `===`/`!==`, no
 * `?.`, no `??`, no `[]`. Spec §6.5.
 *
 * @internal
 */

import { TemplateCompileError } from '../errors.js'
import type { SourceLoc } from '../source/loc.js'
import type { ExprToken, ExprTokenType } from './lexer.js'
import { tokeniseExpression } from './lexer.js'
import type { BinaryOp, ExpressionNode } from './ast.js'

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
 * Used by the template parser for `<?if?>` / `<?elseif?>` conditions,
 * `<?for?>` iterables, `<?copy?>` param values, and `@{…}`
 * attribute-binding bodies. The grammar is the minimal v3 expression
 * language (spec §6): no function calls, no arithmetic, no ternary,
 * no optional chaining.
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
 * Result of parsing a `<?copy key p1=expr p2=expr …?>` PI body.
 * `key` is the dotted message path split on `.`; `params` is the
 * ordered list of `name=expression` bindings (may be empty).
 */
export interface ParsedCopy {
  readonly key: readonly string[]
  readonly params: readonly { readonly name: string; readonly value: ExpressionNode }[]
}

/**
 * Parse the full body of a `<?copy key p1=expr p2=expr …?>` PI.
 *
 * The PI data (`key …` — target `copy` and the leading whitespace
 * already stripped by the template lexer) is tokenised via the
 * expression lexer, so param values are arbitrary expressions from
 * the v3 grammar (paths, literals, logical / comparison ops).
 *
 * Param rules:
 * - Each param is `identifier = expression`, whitespace-separated.
 * - Expressions consume greedily up to the next `ident equals` or
 *   end-of-input — the expression grammar has no `=` token of its
 *   own, so the parser naturally stops there.
 *
 * @param piData - PI data portion (starts with the key identifier).
 * @param baseLoc - Source location of the first character of `piData`.
 * @param source - Full outer template source for error frames.
 * @param sourcePath - Optional file path for error prefixes.
 * @returns The parsed key path + ordered param list.
 */
export function parseCopyPI(
  piData: string,
  baseLoc: SourceLoc,
  source: string,
  sourcePath: string | undefined,
): ParsedCopy {
  const tokens = tokeniseExpression(piData, { source, sourcePath, baseLoc })
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  const parser = new Parser(tokens, source, sourcePath)

  // Key: dotted identifier path.
  const first = parser.consume('ident', 'Expected message key in <?copy?>')
  const key: string[] = [first.value]

  while (parser.match('dot')) {
    const seg = parser.consume('ident', "Expected identifier after '.' in <?copy?> key")

    key.push(seg.value)
  }

  // Params: zero or more `ident = <expression>`.
  const params: { name: string; value: ExpressionNode }[] = []

  while (!parser.check('eof')) {
    const nameTok = parser.consume(
      'ident',
      'Expected parameter name or end of <?copy?>',
    )

    parser.consume('equals', `Expected '=' after parameter name '${nameTok.value}'`)
    const value = parser.parseTopLevel()

    params.push({ name: nameTok.value, value })
  }

  return { key, params }
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

    // Identifier-led: keyword literal OR local path
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
