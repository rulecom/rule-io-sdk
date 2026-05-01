/**
 * Template parser. Consumes the {@link TemplateToken} stream from
 * {@link tokeniseTemplate} and produces a {@link TemplateNode}
 * array.
 *
 * @internal
 */

import { TemplateCompileError } from '../errors.js'
import { parseCopyPI, parseExpression } from '../expression/parser.js'
import type { SourceLoc } from '../source/loc.js'
import type {
  AttrBindingPart,
  AttrNode,
  AttrPart,
  CopyNode,
  ElementNode,
  ForBlockNode,
  IfBlockNode,
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

/** Token types that can terminate a directive branch body. */
const IF_BRANCH_TERMINATORS: ReadonlySet<TemplateTokenType> = new Set([
  'elseif-open',
  'else-open',
  'if-close',
  'eof',
])

/** Token types that can terminate a `<?for?>` body. */
const FOR_BODY_TERMINATORS: ReadonlySet<TemplateTokenType> = new Set([
  'for-close',
  'eof',
])

class TemplateParser {
  private pos = 0

  constructor(
    private readonly tokens: TemplateToken[],
    private readonly source: string,
    private readonly sourcePath: string | undefined,
  ) {}

  parseTop(): TemplateNode[] {
    const out = this.parseChildren(new Set(['eof']))

    this.expectType('eof')

    return out
  }

  // ── Child sequences ─────────────────────────────────────────────

  /**
   * Read children until the next token is in `terminators`. The
   * terminator itself is not consumed — the caller decides what to
   * do with it.
   */
  private parseChildren(terminators: ReadonlySet<TemplateTokenType>): TemplateNode[] {
    const out: TemplateNode[] = []

    while (!terminators.has(this.peek().type)) {
      const t = this.peek()

      switch (t.type) {
        case 'tag-open-start':
          out.push(this.parseElement())
          continue

        case 'text':
          this.advance()
          out.push({ kind: 'text', text: t.value, loc: t.loc })
          continue

        case 'if-open':
          out.push(this.parseIf())
          continue

        case 'for-open':
          out.push(this.parseFor())
          continue

        case 'copy-open':
          out.push(this.parseCopy())
          continue

        // Orphan directive tokens — should have been consumed by an
        // enclosing `parseIf` / `parseFor`.
        case 'elseif-open':
          throw this.error(`'<?elseif?>' without preceding '<?if?>'`, t.loc)

        case 'else-open':
          throw this.error(`'<?else?>' without preceding '<?if?>'`, t.loc)

        case 'if-close':
          throw this.error(`'<?endif?>' without preceding '<?if?>'`, t.loc)

        case 'for-close':
          throw this.error(`'<?endfor?>' without preceding '<?for?>'`, t.loc)

        case 'tag-close':
          // Handled by parseElement; should not bubble up.
          throw this.error(`Unexpected closing tag '</${t.value}>'`, t.loc)

        default:
          throw this.error(`Unexpected token '${t.value}'`, t.loc)
      }
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

    const children = this.parseChildren(new Set(['tag-close']))
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

      if (t.type === 'attr-binding') {
        this.advance()
        parts.push(this.makeAttrBinding(t.value, t.loc))
        continue
      }

      throw this.error(`Unexpected token inside attribute value: '${t.value}'`, t.loc)
    }

    return { name: name.value, value: parts, quote, loc: name.loc }
  }

  // ── @{…} attribute binding ──────────────────────────────────────

  private makeAttrBinding(body: string, loc: SourceLoc): AttrBindingPart {
    const expr = parseExpression(body, {
      source: this.source,
      sourcePath: this.sourcePath,
      baseLoc: loc,
    })

    return { kind: 'binding', expr, loc }
  }

  // ── <?copy?> directive ──────────────────────────────────────────

  private parseCopy(): CopyNode {
    const open = this.consume('copy-open', `Expected '<?copy?>'`)
    const { key, params } = parseCopyPI(
      open.value,
      open.loc,
      this.source,
      this.sourcePath,
    )

    return { kind: 'copy', key, params, loc: open.loc }
  }

  // ── <?if?> / <?elseif?> / <?else?> / <?endif?> ────────────────

  private parseIf(): IfBlockNode {
    const open = this.consume('if-open', `Expected '<?if?>'`)
    const firstCondition = parseExpression(open.value, {
      source: this.source,
      sourcePath: this.sourcePath,
      baseLoc: open.loc,
    })
    const branches: {
      condition: ReturnType<typeof parseExpression>
      children: TemplateNode[]
    }[] = [
      {
        condition: firstCondition,
        children: this.parseChildren(IF_BRANCH_TERMINATORS),
      },
    ]
    let elseBranch: readonly TemplateNode[] | undefined

    while (true) {
      const t = this.peek()

      if (t.type === 'elseif-open') {
        if (elseBranch !== undefined) {
          throw this.error(`'<?elseif?>' after '<?else?>'`, t.loc)
        }

        this.advance()
        const condition = parseExpression(t.value, {
          source: this.source,
          sourcePath: this.sourcePath,
          baseLoc: t.loc,
        })

        branches.push({
          condition,
          children: this.parseChildren(IF_BRANCH_TERMINATORS),
        })
        continue
      }

      if (t.type === 'else-open') {
        if (elseBranch !== undefined) {
          throw this.error(`Only one '<?else?>' block allowed`, t.loc)
        }

        this.advance()
        elseBranch = this.parseChildren(IF_BRANCH_TERMINATORS)
        continue
      }

      if (t.type === 'if-close') {
        this.advance()
        break
      }

      // Must be eof — ran off the end without closing.
      throw this.error(
        `Expected '<?endif?>' to close '<?if?>' block`,
        open.loc,
      )
    }

    return elseBranch !== undefined
      ? { kind: 'if', branches, elseBranch, loc: open.loc }
      : { kind: 'if', branches, loc: open.loc }
  }

  // ── <?for?> / <?endfor?> ──────────────────────────────────────

  private parseFor(): ForBlockNode {
    const open = this.consume('for-open', `Expected '<?for?>'`)
    const { itemName, iterable } = this.parseForHeader(open.value, open.loc)
    const children = this.parseChildren(FOR_BODY_TERMINATORS)
    const next = this.peek()

    if (next.type !== 'for-close') {
      throw this.error(
        `Expected '<?endfor?>' to close '<?for?>' block`,
        open.loc,
      )
    }

    this.advance()

    return { kind: 'for', itemName, iterable, children, loc: open.loc }
  }

  /** Parse `let? item of expr` from the header text between `<?for` and `?>`. */
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
        `Expected loop variable name in '<?for?>'`,
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

    if (
      !raw.slice(offset).startsWith('of ') &&
      !raw.slice(offset).startsWith('of\t') &&
      raw.slice(offset, offset + 3) !== 'of\n' &&
      raw.slice(offset) !== 'of'
    ) {
      throw new TemplateCompileError(
        `Expected 'of' in '<?for?>' header`,
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
