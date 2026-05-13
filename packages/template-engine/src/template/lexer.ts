/**
 * Template tokeniser. Consumes a raw template source string and
 * produces a flat {@link TemplateToken} stream for the template
 * parser.
 *
 * The source is a mix of:
 * - XML elements (with attributes that may contain `@{…}` bindings)
 * - plain text nodes (no expression syntax — spec §5.1 forbids
 *   `@{…}` in text content; use `<?copy?>` instead)
 * - Block directives encoded as XML Processing Instructions —
 *   `<?if expr?>` / `<?elseif expr?>` / `<?else?>` / `<?endif?>` /
 *   `<?for let? name of expr?>` / `<?endfor?>` /
 *   `<?copy key p1=expr p2=expr …?>`.
 * - XML comments (stripped from the stream)
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
 * an attribute value), `attr-binding` (an `@{expression}` binding
 * inside an attribute value).
 *
 * Inline content: `text` (literal character data — no expression
 * syntax is recognised at text position per spec §5.1).
 *
 * Directive Processing Instructions: `if-open` / `elseif-open`
 * (value = condition expression), `else-open` (empty value),
 * `if-close` (closes `<?endif?>`); `for-open` (value = `let? name
 * of expr` header), `for-close` (closes `<?endfor?>`);
 * `copy-open` (value = `key p1=expr p2=expr …` data).
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
  | 'attr-binding'
  | 'text'
  | 'if-open'
  | 'elseif-open'
  | 'else-open'
  | 'if-close'
  | 'for-open'
  | 'for-close'
  | 'copy-open'
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
   * content, binding body, PI data). Empty string for closing
   * PIs (`if-close`, `for-close`), `else-open`, and `eof`.
   */
  readonly value: string
  /**
   * Location of the token's first significant character.
   *
   * - For tag / attribute tokens: the first character of the name.
   * - For `text`: the first character of the text run.
   * - For `attr-binding`: the first character of the binding body
   *   (inside the `@{`).
   * - For directive-PI tokens carrying data (`if-open`,
   *   `elseif-open`, `for-open`, `copy-open`): the first character
   *   of the data section, so the expression parser's `baseLoc`
   *   points at the expression body.
   * - For data-free directive PIs (`else-open`, `if-close`,
   *   `for-close`): the first character after `<?`.
   */
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
 * elements, attribute values (with embedded `@{…}` bindings), text
 * runs, XML comments (stripped), and directive Processing
 * Instructions (`<?if?>` / `<?elseif?>` / `<?else?>` / `<?endif?>` /
 * `<?for?>` / `<?endfor?>` / `<?copy?>`). Diagnostics use the
 * supplied `sourcePath` in their prefix when present.
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

  // ── Content-level scanner (body + element children share this) ──

  /**
   * Walk the source in "content" position — between tags, at the
   * top level, or inside an element body. Emits text tokens,
   * directive PI tokens, and dispatches into `lexElement` when an
   * XML tag begins. Per spec §5.1, `@{…}` is forbidden in text
   * position; encountering it is a compile error.
   *
   * `mode` controls what terminates the loop:
   * - `'body'`: read until EOF
   * - `'element-children'`: read until `</tag>` is encountered
   */
  private lexContent(mode: 'body' | 'element-children'): void {
    let buf = ''
    let bufStart = this.here()

    const flushText = (): void => {
      if (buf.length === 0) return

      this.emit('text', buf, bufStart)
      buf = ''
    }

    while (this.i < this.source.length) {
      const ch = this.source[this.i]!

      // Element-children mode ends when we see `</`
      if (mode === 'element-children' && ch === '<' && this.source[this.i + 1] === '/') {
        flushText()

        return
      }

      // `<` may open an element, a comment, or a Processing Instruction.
      if (ch === '<') {
        flushText()
        this.lexElement()
        continue
      }

      // `@{…}` bindings are not allowed in text position (spec §5.1).
      // Surface it loudly so the author migrates to `<?copy?>`.
      if (ch === '@' && this.source[this.i + 1] === '{') {
        throw new TemplateCompileError(
          `'@{…}' binding is not valid in text content — use '<?copy key?>' (spec §4 / §5.1)`,
          this.here(),
          this.source,
          this.sourcePath,
        )
      }

      // Default: accumulate into text buffer
      if (buf.length === 0) bufStart = this.here()
      buf += ch
      this.advance()
    }

    flushText()

    if (mode === 'element-children') {
      throw new TemplateCompileError(
        `Unterminated element — expected closing tag`,
        this.here(),
        this.source,
        this.sourcePath,
      )
    }
  }

  // ── XML element / comment / PI dispatch ────────────────────────

  private lexElement(): void {
    const tagStart = this.here()

    this.advance() // '<'

    // XML comment: `<!-- … -->`
    if (this.source[this.i] === '!' && this.source.slice(this.i + 1, this.i + 3) === '--') {
      this.lexComment()

      return
    }

    // Processing Instruction: `<?target data?>`
    if (this.source[this.i] === '?') {
      this.lexPI(tagStart)

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

      // Binding `@{…}` inside attribute value (spec §5).
      if (ch === '@' && this.source[this.i + 1] === '{') {
        flush()
        const loc = this.here()

        this.advance(2) // '@{'
        const body = this.readBindingBody(loc)

        this.emit('attr-binding', body, loc)
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

  // ── Directive Processing Instructions ──────────────────────────

  /**
   * Lex a directive Processing Instruction.
   *
   * The caller has consumed `<` but not `?`. On entry, `this.i`
   * points at the `?` of `<?`. `piStart` marks the location of the
   * opening `<`, used in error messages for unknown targets.
   *
   * Grammar (abbreviated from XML 1.0 §2.6):
   *
   *   PI      ::= '<?' PITarget (S PIData)? '?>'
   *   PITarget ::= ident-like run (letters, digits, `_` / `-`)
   *   PIData  ::= any chars up to the first `?>`
   *
   * Recognised targets: `if` / `elseif` / `else` / `endif` / `for`
   * / `endfor` / `copy`. Anything else raises a compile error — this
   * surfaces typos rather than silently dropping them.
   */
  private lexPI(piStart: SourceLoc): void {
    this.advance() // '?'

    // Read the target (contiguous identifier chars).
    const targetStart = this.i

    while (this.i < this.source.length && isPITargetPart(this.source[this.i]!)) {
      this.advance()
    }

    const target = this.source.slice(targetStart, this.i)

    if (target.length === 0) {
      throw new TemplateCompileError(
        `Expected PI target after '<?'`,
        piStart,
        this.source,
        this.sourcePath,
      )
    }

    // Skip whitespace between target and data.
    this.skipWhitespace()

    // Capture data start location — this is what the expression /
    // header parser uses as its baseLoc.
    const dataLoc = this.here()

    // Read data up to `?>`.
    let data = ''

    while (this.i < this.source.length) {
      if (this.source[this.i] === '?' && this.source[this.i + 1] === '>') {
        this.advance(2)
        this.emitPIToken(target, data, piStart, dataLoc)

        return
      }

      data += this.source[this.i]
      this.advance()
    }

    throw new TemplateCompileError(
      `Unterminated Processing Instruction — expected '?>'`,
      piStart,
      this.source,
      this.sourcePath,
    )
  }

  /**
   * Dispatch a PI target to its corresponding token type. Targets
   * that don't carry data still emit the token; the parser ignores
   * the data value on those.
   */
  private emitPIToken(
    target: string,
    data: string,
    piStart: SourceLoc,
    dataLoc: SourceLoc,
  ): void {
    switch (target) {
      case 'if':
        this.emit('if-open', data, dataLoc)

        return

      case 'elseif':
        this.emit('elseif-open', data, dataLoc)

        return

      case 'else':
        this.emit('else-open', '', dataLoc)

        return

      case 'endif':
        this.emit('if-close', '', dataLoc)

        return

      case 'for':
        this.emit('for-open', data, dataLoc)

        return

      case 'endfor':
        this.emit('for-close', '', dataLoc)

        return

      case 'copy':
        this.emit('copy-open', data, dataLoc)

        return

      default:
        throw new TemplateCompileError(
          `Unknown PI target '${target}'`,
          piStart,
          this.source,
          this.sourcePath,
        )
    }
  }

  // ── Attribute binding body ──────────────────────────────────────

  /**
   * Read chars between `@{` and the matching `}`, preserving string
   * literals so they may contain an embedded `}`. The opening `@{`
   * has already been consumed.
   */
  private readBindingBody(openLoc: SourceLoc): string {
    let buf = ''

    while (this.i < this.source.length) {
      const ch = this.source[this.i]!

      if (ch === '}') {
        this.advance()

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
            `Unterminated string inside '@{…}' binding`,
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
      `Unterminated '@{…}' binding — expected '}'`,
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

/**
 * Chars allowed in a PI target name. Matches the character class
 * XML 1.0 uses for Name (simplified: letters, digits, `_`, `-`).
 * Kept liberal so typos like `<?end-if?>` can still surface as
 * "unknown target" rather than "expected PI target".
 */
function isPITargetPart(ch: string): boolean {
  return (
    (ch >= 'a' && ch <= 'z') ||
    (ch >= 'A' && ch <= 'Z') ||
    (ch >= '0' && ch <= '9') ||
    ch === '_' ||
    ch === '-'
  )
}
