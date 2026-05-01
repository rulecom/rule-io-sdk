/**
 * Template parser. Consumes the {@link TemplateToken} stream from
 * {@link tokeniseTemplate} and produces a {@link TemplateNode}
 * array.
 *
 * @internal
 */

import { TemplateCompileError } from '../errors.js'
import { parseExpression } from '../expression/parser.js'
import { parseInterpolation } from './interpolation.js'
import type { SourceLoc } from '../source/loc.js'
import type {
  AttrNode,
  AttrPart,
  ElementNode,
  ForBlockNode,
  IfBlockNode,
  InterpolationNode,
  TemplateNode,
} from './ast.js'
import type { TemplateToken, TemplateTokenType } from './lexer.js'

/**
 * Inputs for {@link parseTemplate}. The parser refers back to the
 * raw `source` when it needs to decorate an error with a code
 * frame.
 */
export interface ParseTemplateOptions {
  /** Full outer template source — used for error frames. */
  readonly source: string
  /** Optional file path for error prefixes. */
  readonly sourcePath?: string
}

/**
 * Parse a {@link TemplateToken} stream into a {@link TemplateNode}
 * array.
 *
 * @param tokens - The tokens from {@link tokeniseTemplate}.
 * @param opts - Outer-source context for error locations.
 * @returns The root-level template AST — an array of nodes at top
 *   level (since templates may contain multiple siblings).
 */
export function parseTemplate(
  tokens: TemplateToken[],
  opts: ParseTemplateOptions,
): TemplateNode[] {
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  return new TemplateParser(tokens, opts.source, opts.sourcePath).parseTop()
}

class TemplateParser {
  private pos = 0

  constructor(
    private readonly tokens: TemplateToken[],
    private readonly source: string,
    private readonly sourcePath: string | undefined,
  ) {}

  parseTop(): TemplateNode[] {
    const out = this.parseNodesUntil('eof')

    this.expectType('eof')

    return out
  }

  // ── Child sequences ─────────────────────────────────────────────

  private parseNodesUntil(end: TemplateTokenType): TemplateNode[] {
    const out: TemplateNode[] = []

    while (this.peek().type !== end) {
      const t = this.peek()

      if (t.type === 'tag-close') {
        // Handled by parseElement; should not bubble up.
        throw this.error(`Unexpected closing tag '</${t.value}>'`, t.loc)
      }

      if (t.type === 'tag-open-start') {
        out.push(this.parseElement())
        continue
      }

      if (t.type === 'text') {
        this.advance()
        out.push({ kind: 'text', text: t.value, loc: t.loc })
        continue
      }

      if (t.type === 'interp') {
        this.advance()
        out.push(this.makeInterpolationNode(t.value, t.loc))
        continue
      }

      if (t.type === 'if') {
        out.push(this.parseIf())
        continue
      }

      if (t.type === 'for') {
        out.push(this.parseFor())
        continue
      }

      if (t.type === 'else-if' || t.type === 'else') {
        throw this.error(`'${t.value}' without preceding '@if'`, t.loc)
      }

      throw this.error(`Unexpected token '${t.value}'`, t.loc)
    }

    return out
  }

  // ── Element ─────────────────────────────────────────────────────

  private parseElement(): ElementNode {
    const open = this.consume('tag-open-start', 'Expected tag open')
    const attrs = this.parseAttrs()

    // The lexer guarantees a `tag-open-end` or `tag-self-close` at the
    // end of the attribute list.
    const term = this.advance()

    if (term.type === 'tag-self-close') {
      return {
        kind: 'element',
        tag: open.value,
        attrs,
        children: [],
        selfClose: true,
        loc: open.loc,
      }
    }

    if (term.type !== 'tag-open-end') {
      throw this.error(`Expected '>' or '/>' to close opening tag`, term.loc)
    }

    const children = this.parseNodesUntil('tag-close')
    const close = this.consume('tag-close', `Expected closing tag`)

    if (close.value !== open.value) {
      throw this.error(
        `Mismatched closing tag: expected '</${open.value}>' but found '</${close.value}>'`,
        close.loc,
      )
    }

    return {
      kind: 'element',
      tag: open.value,
      attrs,
      children,
      selfClose: false,
      loc: open.loc,
    }
  }

  private parseAttrs(): AttrNode[] {
    const out: AttrNode[] = []

    while (this.peek().type === 'attr-name') {
      out.push(this.parseAttr())
    }

    return out
  }

  private parseAttr(): AttrNode {
    const name = this.consume('attr-name', 'Expected attribute name')

    // Value is optional in XML (for HTML-style boolean attrs). If there's
    // no '=' next, the attribute has an empty value.
    if (this.peek().type !== 'attr-equals') {
      return { name: name.value, value: [], quote: '"', loc: name.loc }
    }

    this.advance() // 'attr-equals'
    const openQuote = this.consume('attr-quote-open', `Expected attribute value`)
    const quote = (openQuote.value === "'" ? "'" : '"') as '"' | "'"
    const parts: AttrPart[] = []

    while (true) {
      const t = this.peek()

      if (t.type === 'attr-quote-close') {
        this.advance()
        break
      }

      if (t.type === 'attr-text') {
        this.advance()
        parts.push({ kind: 'text', text: t.value, loc: t.loc })
        continue
      }

      if (t.type === 'attr-interp') {
        this.advance()
        parts.push(this.makeInterpolationNode(t.value, t.loc))
        continue
      }

      throw this.error(`Unexpected token inside attribute value: '${t.value}'`, t.loc)
    }

    return { name: name.value, value: parts, quote, loc: name.loc }
  }

  // ── Interpolation node ──────────────────────────────────────────

  private makeInterpolationNode(body: string, loc: SourceLoc): InterpolationNode {
    const expr = parseInterpolation({
      body,
      baseLoc: loc,
      source: this.source,
      sourcePath: this.sourcePath,
    })

    return { kind: 'interpolation', expr, loc }
  }

  // ── @if / @else if / @else ──────────────────────────────────────

  private parseIf(): IfBlockNode {
    const keyword = this.consume('if', `Expected '@if'`)
    const branches: { condition: ReturnType<typeof parseExpression>; children: TemplateNode[] }[] = [
      this.readBranchBody(),
    ]
    let elseBranch: readonly TemplateNode[] | undefined

    // Spec §12: whitespace between `}` and the next `@else if` /
    // `@else` is structural formatting, not text content — consume
    // it when it precedes a continuation branch.
    while (true) {
      const savedPos = this.pos

      this.skipStructuralWhitespace()
      const t = this.peek()

      if (t.type === 'else-if') {
        if (elseBranch !== undefined) {
          throw this.error(`'@else if' after '@else'`, t.loc)
        }

        this.advance()
        branches.push(this.readBranchBody())
        continue
      }

      if (t.type === 'else') {
        if (elseBranch !== undefined) {
          throw this.error(`Only one '@else' block allowed`, t.loc)
        }

        this.advance()
        this.consume('lbrace', `Expected '{' after '@else'`)
        elseBranch = this.parseNodesUntil('rbrace')
        this.consume('rbrace', `Expected '}' to close '@else'`)
        continue
      }

      // Not a continuation — rewind past the structural whitespace
      // so the parent parser gets to keep it if it wants to.
      this.pos = savedPos
      break
    }

    return elseBranch !== undefined
      ? { kind: 'if', branches, elseBranch, loc: keyword.loc }
      : { kind: 'if', branches, loc: keyword.loc }
  }

  /**
   * Consume any immediately-following `text` tokens whose content is
   * purely whitespace. Used around `@else if` / `@else` detection
   * (spec §12).
   */
  private skipStructuralWhitespace(): void {
    while (true) {
      const t = this.peek()

      if (t.type === 'text' && /^\s*$/.test(t.value)) {
        this.advance()
        continue
      }

      break
    }
  }

  private readBranchBody(): { condition: ReturnType<typeof parseExpression>; children: TemplateNode[] } {
    this.consume('lparen', `Expected '(' for directive condition`)
    const exprTok = this.consume('text', `Expected condition expression`)
    const condition = parseExpression(exprTok.value, {
      source: this.source,
      sourcePath: this.sourcePath,
      baseLoc: exprTok.loc,
    })

    this.consume('rparen', `Expected ')' to close condition`)
    this.consume('lbrace', `Expected '{' to open branch body`)
    const children = this.parseNodesUntil('rbrace')

    this.consume('rbrace', `Expected '}' to close branch body`)

    return { condition, children }
  }

  // ── @for ────────────────────────────────────────────────────────

  private parseFor(): ForBlockNode {
    const keyword = this.consume('for', `Expected '@for'`)

    this.consume('lparen', `Expected '('`)
    const header = this.consume('text', `Expected '@for' header`)
    const { itemName, iterable } = this.parseForHeader(header.value, header.loc)

    this.consume('rparen', `Expected ')' to close '@for' header`)
    this.consume('lbrace', `Expected '{' to open '@for' body`)
    const children = this.parseNodesUntil('rbrace')

    this.consume('rbrace', `Expected '}' to close '@for' body`)

    return { kind: 'for', itemName, iterable, children, loc: keyword.loc }
  }

  /** Parse `let? item of expr` from the header text between `(` and `)`. */
  private parseForHeader(
    raw: string,
    baseLoc: SourceLoc,
  ): { itemName: string; iterable: ReturnType<typeof parseExpression> } {
    // Strip leading whitespace and track the updated baseLoc for
    // accurate error reporting.
    let offset = 0
    let line = baseLoc.line
    let column = baseLoc.column

    while (offset < raw.length && /\s/.test(raw[offset]!)) {
      if (raw[offset] === '\n') {
        line++
        column = 1
      } else {
        column++
      }

      offset++
    }

    // Optional `let ` prefix.
    if (raw.slice(offset).startsWith('let ')) {
      offset += 4
      column += 4
    }

    // Skip whitespace after `let`.
    while (offset < raw.length && /\s/.test(raw[offset]!)) {
      if (raw[offset] === '\n') {
        line++
        column = 1
      } else {
        column++
      }

      offset++
    }

    // Identifier.
    const nameStart = offset

    while (offset < raw.length && /[A-Za-z0-9_]/.test(raw[offset]!)) {
      offset++
      column++
    }

    const itemName = raw.slice(nameStart, offset)

    if (itemName.length === 0) {
      throw new TemplateCompileError(
        `Expected loop variable name in '@for'`,
        { offset: baseLoc.offset + nameStart, line, column },
        this.source,
        this.sourcePath,
      )
    }

    // `of` keyword.
    while (offset < raw.length && /\s/.test(raw[offset]!)) {
      if (raw[offset] === '\n') {
        line++
        column = 1
      } else {
        column++
      }

      offset++
    }

    if (!raw.slice(offset).startsWith('of ') && !raw.slice(offset).startsWith('of\t') && raw.slice(offset, offset + 3) !== 'of\n') {
      throw new TemplateCompileError(
        `Expected 'of' in '@for' header`,
        { offset: baseLoc.offset + offset, line, column },
        this.source,
        this.sourcePath,
      )
    }

    offset += 2
    column += 2

    while (offset < raw.length && /\s/.test(raw[offset]!)) {
      if (raw[offset] === '\n') {
        line++
        column = 1
      } else {
        column++
      }

      offset++
    }

    // Remainder is the iterable expression.
    const exprLoc: SourceLoc = { offset: baseLoc.offset + offset, line, column }
    const iterable = parseExpression(raw.slice(offset), {
      source: this.source,
      sourcePath: this.sourcePath,
      baseLoc: exprLoc,
    })

    return { itemName, iterable }
  }

  // ── Token helpers ───────────────────────────────────────────────

  private peek(): TemplateToken {
    return this.tokens[this.pos]!
  }

  private advance(): TemplateToken {
    const t = this.tokens[this.pos]!

    this.pos++

    return t
  }

  private consume(type: TemplateTokenType, message: string): TemplateToken {
    const t = this.peek()

    if (t.type !== type) {
      throw this.error(`${message} (got '${t.value}')`, t.loc)
    }

    this.advance()

    return t
  }

  private expectType(type: TemplateTokenType): TemplateToken {
    const t = this.peek()

    if (t.type !== type) {
      throw this.error(`Expected ${type} but got '${t.value}'`, t.loc)
    }

    return t
  }

  private error(message: string, loc: SourceLoc): TemplateCompileError {
    return new TemplateCompileError(message, loc, this.source, this.sourcePath)
  }
}
