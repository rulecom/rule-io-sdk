/**
 * Template tokeniser. Consumes a raw template source string and
 * produces a flat {@link TemplateToken} stream for the template
 * parser.
 *
 * The source is a mix of:
 * - XML elements (with attributes that may themselves contain `{{…}}`)
 * - text nodes
 * - `{{…}}` interpolation expressions
 * - `@if (…) { … }` / `@else if (…) { … }` / `@else { … }` /
 *   `@for (item of expr) { … }` block directives
 *
 * The tokeniser is a single-pass state machine; each token carries a
 * 1-based (line, column) location into the original source.
 *
 * @internal
 */

import { TemplateCompileError } from '../errors.js'
import type { SourceLoc } from '../source/loc.js'

/**
 * Discriminator tag for every token produced by the template
 * tokeniser. The values are matched directly by the parser.
 *
 * XML structural: `tag-open-start` (`<tagname`), `tag-open-end`
 * (`>`), `tag-self-close` (`/>`), `tag-close` (`</tagname>`),
 * `attr-name`, `attr-equals` (`=`), `attr-quote-open` and
 * `attr-quote-close` (`"` or `'`), `attr-text` (literal run inside
 * an attribute value), `attr-interp` (a `{{…}}` inside an
 * attribute value).
 *
 * Inline content: `text` (literal character data) and `interp`
 * (`{{…}}` at text position).
 *
 * Directives: `if`, `else-if`, `else`, `for`, plus the punctuation
 * (`lparen`, `rparen`, `lbrace`, `rbrace`) used by their
 * condition/iterator headers and block bodies.
 *
 * `eof` is the terminating sentinel emitted when the source is
 * fully consumed.
 */
export type TemplateTokenType =
  | 'tag-open-start'
  | 'tag-open-end'
  | 'tag-self-close'
  | 'tag-close'
  | 'attr-name'
  | 'attr-equals'
  | 'attr-quote-open'
  | 'attr-quote-close'
  | 'attr-text'
  | 'attr-interp'
  | 'text'
  | 'interp'
  | 'if'
  | 'else-if'
  | 'else'
  | 'for'
  | 'lparen'
  | 'rparen'
  | 'lbrace'
  | 'rbrace'
  | 'eof'

/**
 * One atomic token emitted by {@link tokeniseTemplate}.
 *
 * Carries the minimum metadata the parser needs to build the AST
 * and attach source locations to every node.
 */
export interface TemplateToken {
  /** Grammatical category the token belongs to. */
  readonly type: TemplateTokenType
  /**
   * The raw text of the token (tag name, attribute name, text run
   * content, interpolation body, literal punctuation). Empty string
   * for `eof`.
   */
  readonly value: string
  /** Location of the token's first character in the outer source. */
  readonly loc: SourceLoc
}

/**
 * Inputs for {@link tokeniseTemplate}.
 */
export interface TokeniseTemplateOptions {
  /** Raw template source to tokenise. */
  readonly source: string
  /** Optional file path for error prefixes. */
  readonly sourcePath?: string
}

/**
 * Tokenise a raw template source string into a flat
 * {@link TemplateToken} stream terminated with an `eof` token.
 *
 * The tokeniser is a single-pass state machine handling XML
 * elements, attribute values (with embedded `{{…}}`), text runs,
 * `{{…}}` interpolations, block directives (`@if` / `@else if` /
 * `@else` / `@for`), and XML comments (stripped). Diagnostics use
 * the supplied `sourcePath` in their prefix when present.
 *
 * @param opts - Source to tokenise and optional file path.
 * @returns The token stream, always terminating with an `eof` token.
 */
export function tokeniseTemplate(opts: TokeniseTemplateOptions): TemplateToken[] {
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  return new TemplateLexer(opts.source, opts.sourcePath).run()
}

class TemplateLexer {
  private readonly tokens: TemplateToken[] = []
  private i = 0
  private line = 1
  private col = 1

  constructor(
    private readonly source: string,
    private readonly sourcePath: string | undefined,
  ) {}

  run(): TemplateToken[] {
    this.lexContent('body')
    this.emit('eof', '', this.here())

    return this.tokens
  }

  // ── Content-level scanner (body + block children share this) ───

  /**
   * Walk the source in "content" position — between tags, at the
   * top level, or inside a directive block. Emits text tokens,
   * interpolation tokens, directive tokens, and dispatches into
   * `lexElement` when an XML tag begins.
   *
   * `mode` controls what terminates the loop:
   * - `'body'`: read until EOF
   * - `'block'`: read until matching `}` (which is consumed by the caller)
   * - `'element-children'`: read until `</tag>` is encountered
   */
  private lexContent(mode: 'body' | 'block' | 'element-children'): void {
    let buf = ''
    let bufStart = this.here()

    const flushText = (): void => {
      if (buf.length === 0) return

      this.emit('text', buf, bufStart)
      buf = ''
    }

    while (this.i < this.source.length) {
      const ch = this.source[this.i]!

      // Block close: `}` ends the current block
      if (mode === 'block' && ch === '}') {
        flushText()

        return
      }

      // Element-children mode ends when we see `</`
      if (mode === 'element-children' && ch === '<' && this.source[this.i + 1] === '/') {
        flushText()

        return
      }

      // XML tag open: `<tagname` starts an element. A raw `<` that
      // isn't followed by a tag name is an error.
      if (ch === '<') {
        flushText()
        this.lexElement()
        continue
      }

      // Interpolation `{{ … }}`
      if (ch === '{' && this.source[this.i + 1] === '{') {
        flushText()
        const loc = this.here()

        this.advance(2)
        const body = this.readInterpolationBody(loc)

        this.emit('interp', body, loc)
        continue
      }

      // Directive: `@if` / `@else` / `@else if` / `@for`. Allowed at
       // any child position — inside elements, inside directive blocks,
       // and at body level. Attribute values run through a separate
       // lexer that never reaches here.
      if (ch === '@' && this.matchesDirectiveKeyword()) {
        flushText()
        this.lexDirective()
        continue
      }

      // Default: accumulate into text buffer
      if (buf.length === 0) bufStart = this.here()
      buf += ch
      this.advance()
    }

    flushText()

    if (mode === 'block') {
      throw new TemplateCompileError(
        `Unterminated block — expected '}'`,
        this.here(),
        this.source,
        this.sourcePath,
      )
    }

    if (mode === 'element-children') {
      throw new TemplateCompileError(
        `Unterminated element — expected closing tag`,
        this.here(),
        this.source,
        this.sourcePath,
      )
    }
  }

  // ── XML element ─────────────────────────────────────────────────

  private lexElement(): void {
    // Consume `<`
    const tagStart = this.here()

    this.advance() // '<'

    if (this.source[this.i] === '!' && this.source.slice(this.i + 1, this.i + 3) === '--') {
      this.lexComment()

      return
    }

    // Tag name
    if (!isTagNameStart(this.source[this.i] ?? '')) {
      throw new TemplateCompileError(
        `Expected tag name after '<'`,
        this.here(),
        this.source,
        this.sourcePath,
      )
    }

    const nameStart = this.i

    while (this.i < this.source.length && isTagNamePart(this.source[this.i]!)) this.advance()
    const tagName = this.source.slice(nameStart, this.i)

    this.emit('tag-open-start', tagName, tagStart)

    // Attributes
    while (true) {
      this.skipWhitespace()

      if (this.source[this.i] === '/' && this.source[this.i + 1] === '>') {
        const loc = this.here()

        this.advance(2)
        this.emit('tag-self-close', '/>', loc)

        return
      }

      if (this.source[this.i] === '>') {
        const loc = this.here()

        this.advance()
        this.emit('tag-open-end', '>', loc)
        break
      }

      this.lexAttribute()
    }

    // Element children — recurse until we see the matching `</tagname>`
    this.lexContent('element-children')

    // Close tag
    if (this.source[this.i] !== '<' || this.source[this.i + 1] !== '/') {
      throw new TemplateCompileError(
        `Expected closing tag for '<${tagName}>'`,
        this.here(),
        this.source,
        this.sourcePath,
      )
    }

    const closeLoc = this.here()

    this.advance(2) // '</'
    const closeNameStart = this.i

    while (this.i < this.source.length && isTagNamePart(this.source[this.i]!)) this.advance()
    const closeName = this.source.slice(closeNameStart, this.i)

    if (closeName !== tagName) {
      throw new TemplateCompileError(
        `Mismatched closing tag: expected '</${tagName}>' but found '</${closeName}>'`,
        closeLoc,
        this.source,
        this.sourcePath,
      )
    }

    this.skipWhitespace()

    if (this.source[this.i] !== '>') {
      throw new TemplateCompileError(
        `Expected '>' to close '</${closeName}>'`,
        this.here(),
        this.source,
        this.sourcePath,
      )
    }

    this.advance() // '>'
    this.emit('tag-close', closeName, closeLoc)
  }

  private lexComment(): void {
    // `<!--` … `-->`. We strip comments from the stream entirely;
    // they're never emitted as tokens.
    this.advance(3) // '!--' after initial '<'

    while (this.i < this.source.length) {
      if (
        this.source[this.i] === '-' &&
        this.source[this.i + 1] === '-' &&
        this.source[this.i + 2] === '>'
      ) {
        this.advance(3)

        return
      }

      this.advance()
    }

    throw new TemplateCompileError(
      `Unterminated XML comment`,
      this.here(),
      this.source,
      this.sourcePath,
    )
  }

  private lexAttribute(): void {
    if (!isAttrNameStart(this.source[this.i] ?? '')) {
      throw new TemplateCompileError(
        `Expected attribute name`,
        this.here(),
        this.source,
        this.sourcePath,
      )
    }

    const nameLoc = this.here()
    const nameStart = this.i

    while (this.i < this.source.length && isAttrNamePart(this.source[this.i]!)) this.advance()
    const name = this.source.slice(nameStart, this.i)

    this.emit('attr-name', name, nameLoc)
    this.skipWhitespace()

    if (this.source[this.i] !== '=') {
      // Boolean / valueless attribute — allowed in XML for HTML-ish
      // use cases. No value tokens emitted; parser treats it as
      // `name=""`.
      return
    }

    const eqLoc = this.here()

    this.advance() // '='
    this.emit('attr-equals', '=', eqLoc)
    this.skipWhitespace()

    const quote = this.source[this.i]

    if (quote !== '"' && quote !== "'") {
      throw new TemplateCompileError(
        `Expected '"' or \`'\` to open attribute value`,
        this.here(),
        this.source,
        this.sourcePath,
      )
    }

    const quoteOpenLoc = this.here()

    this.advance() // quote
    this.emit('attr-quote-open', quote, quoteOpenLoc)

    let buf = ''
    let bufStart = this.here()

    const flush = (): void => {
      if (buf.length === 0) return

      this.emit('attr-text', buf, bufStart)
      buf = ''
    }

    while (this.i < this.source.length && this.source[this.i] !== quote) {
      const ch = this.source[this.i]!

      // Interpolation inside attribute value
      if (ch === '{' && this.source[this.i + 1] === '{') {
        flush()
        const loc = this.here()

        this.advance(2)
        const body = this.readInterpolationBody(loc)

        this.emit('attr-interp', body, loc)
        continue
      }

      if (buf.length === 0) bufStart = this.here()
      buf += ch
      this.advance()
    }

    flush()

    if (this.source[this.i] !== quote) {
      throw new TemplateCompileError(
        `Unterminated attribute value`,
        this.here(),
        this.source,
        this.sourcePath,
      )
    }

    const quoteCloseLoc = this.here()

    this.advance() // close quote
    this.emit('attr-quote-close', quote, quoteCloseLoc)
  }

  // ── Directives ──────────────────────────────────────────────────

  /**
   * Detect whether the next token starting at `@` is a valid
   * directive keyword (`@if`, `@else`, `@else if`, `@for`). This
   * is needed to distinguish directive use from a literal `@` in
   * text content (e.g. an email address).
   */
  private matchesDirectiveKeyword(): boolean {
    const rest = this.source.slice(this.i + 1)

    if (/^if\b/.test(rest)) return true
    if (/^else\b/.test(rest)) return true
    if (/^for\b/.test(rest)) return true

    return false
  }

  private lexDirective(): void {
    const loc = this.here()

    this.advance() // '@'

    if (this.peekIdent('if')) {
      this.consumeIdent('if')
      this.emit('if', '@if', loc)
      this.lexDirectiveParenBlock()

      return
    }

    if (this.peekIdent('for')) {
      this.consumeIdent('for')
      this.emit('for', '@for', loc)
      this.lexDirectiveParenBlock()

      return
    }

    if (this.peekIdent('else')) {
      this.consumeIdent('else')
      this.skipWhitespace()

      if (this.peekIdent('if')) {
        this.consumeIdent('if')
        this.emit('else-if', '@else if', loc)
        this.lexDirectiveParenBlock()

        return
      }

      this.emit('else', '@else', loc)
      this.lexDirectiveBlock()

      return
    }

    throw new TemplateCompileError(
      `Unknown directive after '@'`,
      loc,
      this.source,
      this.sourcePath,
    )
  }

  /** Lex `(expr) { children }` — used by `@if`, `@else if`, `@for`. */
  private lexDirectiveParenBlock(): void {
    this.skipWhitespace()

    if (this.source[this.i] !== '(') {
      throw new TemplateCompileError(
        `Expected '(' after directive keyword`,
        this.here(),
        this.source,
        this.sourcePath,
      )
    }

    const lpLoc = this.here()

    this.advance()
    this.emit('lparen', '(', lpLoc)

    // Read the paren body verbatim, balancing nested parens, as
    // a single text chunk that the expression parser will
    // re-tokenise.
    const exprStart = this.here()
    let depth = 1
    let buf = ''

    while (this.i < this.source.length && depth > 0) {
      const ch = this.source[this.i]!

      if (ch === '(') depth++
      else if (ch === ')') {
        depth--

        if (depth === 0) break
      }

      buf += ch
      this.advance()
    }

    if (depth !== 0) {
      throw new TemplateCompileError(
        `Unterminated directive expression`,
        this.here(),
        this.source,
        this.sourcePath,
      )
    }

    // Emit expression body as a synthetic `text` token — parser will
    // re-lex via the expression lexer.
    this.emit('text', buf, exprStart)

    const rpLoc = this.here()

    this.advance()
    this.emit('rparen', ')', rpLoc)

    this.lexDirectiveBlock()
  }

  /** Lex `{ children }` — used by `@else` and after paren of if/for. */
  private lexDirectiveBlock(): void {
    this.skipWhitespace()

    if (this.source[this.i] !== '{') {
      throw new TemplateCompileError(
        `Expected '{' to open directive block`,
        this.here(),
        this.source,
        this.sourcePath,
      )
    }

    const lbLoc = this.here()

    this.advance()
    this.emit('lbrace', '{', lbLoc)

    this.lexContent('block')

    if (this.source[this.i] !== '}') {
      throw new TemplateCompileError(
        `Expected '}' to close directive block`,
        this.here(),
        this.source,
        this.sourcePath,
      )
    }

    const rbLoc = this.here()

    this.advance()
    this.emit('rbrace', '}', rbLoc)
  }

  // ── Interpolation body ──────────────────────────────────────────

  /** Read chars between `{{` and `}}`, preserving strings that contain `}`. */
  private readInterpolationBody(openLoc: SourceLoc): string {
    let buf = ''

    while (this.i < this.source.length) {
      const ch = this.source[this.i]!

      // `}}` closes the interpolation (unless inside a string literal)
      if (ch === '}' && this.source[this.i + 1] === '}') {
        this.advance(2)

        return buf
      }

      // Pass string literals through verbatim so they may contain `}`.
      if (ch === '"' || ch === "'") {
        const quote = ch

        buf += ch
        this.advance()

        while (this.i < this.source.length && this.source[this.i] !== quote) {
          if (this.source[this.i] === '\\' && this.i + 1 < this.source.length) {
            buf += this.source[this.i]
            this.advance()
            buf += this.source[this.i]
            this.advance()
            continue
          }

          buf += this.source[this.i]
          this.advance()
        }

        if (this.source[this.i] !== quote) {
          throw new TemplateCompileError(
            `Unterminated string inside interpolation`,
            openLoc,
            this.source,
            this.sourcePath,
          )
        }

        buf += this.source[this.i]
        this.advance()
        continue
      }

      buf += ch
      this.advance()
    }

    throw new TemplateCompileError(
      `Unterminated interpolation — expected '}}'`,
      openLoc,
      this.source,
      this.sourcePath,
    )
  }

  // ── Primitive helpers ───────────────────────────────────────────

  private advance(n = 1): void {
    for (let k = 0; k < n; k++) {
      if (this.source[this.i] === '\n') {
        this.line++
        this.col = 1
      } else {
        this.col++
      }

      this.i++
    }
  }

  private here(): SourceLoc {
    return { offset: this.i, line: this.line, column: this.col }
  }

  private emit(type: TemplateTokenType, value: string, loc: SourceLoc): void {
    this.tokens.push({ type, value, loc })
  }

  private skipWhitespace(): void {
    while (
      this.i < this.source.length &&
      (this.source[this.i] === ' ' ||
        this.source[this.i] === '\t' ||
        this.source[this.i] === '\n' ||
        this.source[this.i] === '\r')
    ) {
      this.advance()
    }
  }

  private peekIdent(word: string): boolean {
    if (this.source.slice(this.i, this.i + word.length) !== word) return false
    const after = this.source[this.i + word.length] ?? ''

    return !isIdentPart(after)
  }

  private consumeIdent(word: string): void {
    // Caller has already verified peekIdent(word).
    this.advance(word.length)
  }
}

function isTagNameStart(ch: string): boolean {
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_'
}

function isTagNamePart(ch: string): boolean {
  return isTagNameStart(ch) || (ch >= '0' && ch <= '9') || ch === '-' || ch === ':' || ch === '.'
}

function isAttrNameStart(ch: string): boolean {
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_' || ch === ':'
}

function isAttrNamePart(ch: string): boolean {
  return isAttrNameStart(ch) || (ch >= '0' && ch <= '9') || ch === '-' || ch === '.'
}

function isIdentPart(ch: string): boolean {
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9') || ch === '_'
}
