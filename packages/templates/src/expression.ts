/**
 * Safe expression evaluator for the Angular-like template syntax used in
 * `renderTemplate`.
 *
 * Supports: identifiers, string/number/boolean/null/undefined literals,
 * parentheses, member access (`.`, optional `?.`), index access (`[ ]`),
 * function calls, unary `!`, binary comparison (`===`, `!==`, `==`,
 * `!=`, `<`, `<=`, `>`, `>=`), logical `&&` / `||`, nullish coalescing
 * `??`.
 *
 * No assignment, no property writes, no function definitions, no `eval`
 * — pure read-only evaluation of a small grammar against a scope chain.
 *
 * @internal
 */

import { TemplateRenderError } from './types.js'

export type Scope = Readonly<Record<string, unknown>>

// ─── Token types ────────────────────────────────────────────────────────────

type TokenType =
  | 'ident'
  | 'number'
  | 'string'
  | 'punct'
  | 'end'

interface Token {
  type: TokenType
  value: string
  /** Character offset where the token starts in the original source. */
  offset: number
}

// ─── AST node types ─────────────────────────────────────────────────────────

type AstNode =
  | { kind: 'literal'; value: unknown }
  | { kind: 'ident'; name: string }
  | { kind: 'member'; object: AstNode; property: string; optional: boolean }
  | { kind: 'index'; object: AstNode; index: AstNode; optional: boolean }
  | { kind: 'call'; callee: AstNode; args: AstNode[] }
  | { kind: 'unary'; op: '!'; operand: AstNode }
  | { kind: 'binary'; op: BinaryOp; left: AstNode; right: AstNode }
  | { kind: 'logical'; op: '&&' | '||' | '??'; left: AstNode; right: AstNode }
  | { kind: 'ternary'; test: AstNode; consequent: AstNode; alternate: AstNode }

type BinaryOp =
  | '===' | '!==' | '==' | '!='
  | '<' | '<=' | '>' | '>='
  | '+' | '-'

// ─── Tokeniser ──────────────────────────────────────────────────────────────

const PUNCT_CHARS = new Set([
  '.', '[', ']', '(', ')', ',', '?', '!',
  '<', '>', '=', '&', '|',
  '+', '-', ':',
])

function tokenise(source: string): Token[] {
  const tokens: Token[] = []
  let i = 0

  while (i < source.length) {
    const ch = source[i]!

    // Skip whitespace
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i++
      continue
    }

    // Identifiers + keywords (true, false, null, undefined become literal tokens)
    if (isIdentStart(ch)) {
      const start = i

      while (i < source.length && isIdentPart(source[i]!)) i++
      const raw = source.slice(start, i)

      tokens.push({ type: 'ident', value: raw, offset: start })
      continue
    }

    // Number literal (integer or decimal)
    if (ch >= '0' && ch <= '9') {
      const start = i

      while (i < source.length && source[i]! >= '0' && source[i]! <= '9') i++

      if (source[i] === '.') {
        i++
        while (i < source.length && source[i]! >= '0' && source[i]! <= '9') i++
      }

      tokens.push({ type: 'number', value: source.slice(start, i), offset: start })
      continue
    }

    // String literal — single or double quoted, with backslash escapes
    if (ch === '"' || ch === "'") {
      const quote = ch
      const start = i

      i++
      let out = ''

      while (i < source.length && source[i] !== quote) {
        if (source[i] === '\\' && i + 1 < source.length) {
          const next = source[i + 1]!

          out += next === 'n' ? '\n' : next === 't' ? '\t' : next
          i += 2
          continue
        }

        out += source[i]
        i++
      }

      if (source[i] !== quote) {
        throw new TemplateRenderError(
          `Unterminated string literal starting at offset ${String(start)}`,
          '',
          source,
        )
      }

      i++ // closing quote
      tokens.push({ type: 'string', value: out, offset: start })
      continue
    }

    // Multi-char punctuation
    if (PUNCT_CHARS.has(ch)) {
      const start = i
      // Try 3-char: === !==
      const three = source.slice(i, i + 3)

      if (three === '===' || three === '!==') {
        i += 3
        tokens.push({ type: 'punct', value: three, offset: start })
        continue
      }

      // Try 2-char: ?. == != <= >= && || ??
      const two = source.slice(i, i + 2)

      if (
        two === '?.' || two === '==' || two === '!=' ||
        two === '<=' || two === '>=' || two === '&&' ||
        two === '||' || two === '??'
      ) {
        i += 2
        tokens.push({ type: 'punct', value: two, offset: start })
        continue
      }

      // Single-char
      tokens.push({ type: 'punct', value: ch, offset: start })
      i++
      continue
    }

    throw new TemplateRenderError(
      `Unexpected character '${ch}' at offset ${String(i)}`,
      '',
      source,
    )
  }

  tokens.push({ type: 'end', value: '', offset: i })

  return tokens
}

function isIdentStart(ch: string): boolean {
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_' || ch === '$'
}

function isIdentPart(ch: string): boolean {
  return isIdentStart(ch) || (ch >= '0' && ch <= '9')
}

// ─── Parser ─────────────────────────────────────────────────────────────────

class Parser {
  private pos = 0

  constructor(
    private readonly tokens: Token[],
    private readonly source: string,
  ) {}

  parse(): AstNode {
    const node = this.parseTernary()

    if (this.peek().type !== 'end') {
      throw this.error(`Unexpected token '${this.peek().value}'`)
    }

    return node
  }

  // Precedence (low → high):
  //   ternary ?:
  //   ??
  //   ||
  //   &&
  //   ==/!=/===/!==
  //   <, <=, >, >=
  //   +, -
  //   unary !
  //   call/member
  //   primary

  private parseTernary(): AstNode {
    const test = this.parseNullishCoalescing()

    if (this.matchPunct('?')) {
      // Consequent and alternate are themselves full expressions
      // (right-associative so nested `a ? b : c ? d : e` parses as
      // `a ? b : (c ? d : e)`).
      const consequent = this.parseTernary()

      this.consumePunct(':', 'expected : after ternary consequent')
      const alternate = this.parseTernary()

      return { kind: 'ternary', test, consequent, alternate }
    }

    return test
  }

  private parseNullishCoalescing(): AstNode {
    let left = this.parseLogicalOr()

    while (this.matchPunct('??')) {
      const right = this.parseLogicalOr()

      left = { kind: 'logical', op: '??', left, right }
    }

    return left
  }

  private parseLogicalOr(): AstNode {
    let left = this.parseLogicalAnd()

    while (this.matchPunct('||')) {
      const right = this.parseLogicalAnd()

      left = { kind: 'logical', op: '||', left, right }
    }

    return left
  }

  private parseLogicalAnd(): AstNode {
    let left = this.parseEquality()

    while (this.matchPunct('&&')) {
      const right = this.parseEquality()

      left = { kind: 'logical', op: '&&', left, right }
    }

    return left
  }

  private parseEquality(): AstNode {
    let left = this.parseRelational()

    while (true) {
      const t = this.peek()

      if (t.type === 'punct' && (t.value === '===' || t.value === '!==' || t.value === '==' || t.value === '!=')) {
        this.pos++
        const right = this.parseRelational()

        left = { kind: 'binary', op: t.value as BinaryOp, left, right }
        continue
      }

      return left
    }
  }

  private parseRelational(): AstNode {
    let left = this.parseAdditive()

    while (true) {
      const t = this.peek()

      if (t.type === 'punct' && (t.value === '<' || t.value === '<=' || t.value === '>' || t.value === '>=')) {
        this.pos++
        const right = this.parseAdditive()

        left = { kind: 'binary', op: t.value as BinaryOp, left, right }
        continue
      }

      return left
    }
  }

  private parseAdditive(): AstNode {
    let left = this.parseUnary()

    while (true) {
      const t = this.peek()

      if (t.type === 'punct' && (t.value === '+' || t.value === '-')) {
        this.pos++
        const right = this.parseUnary()

        left = { kind: 'binary', op: t.value as BinaryOp, left, right }
        continue
      }

      return left
    }
  }

  private parseUnary(): AstNode {
    if (this.matchPunct('!')) {
      const operand = this.parseUnary()

      return { kind: 'unary', op: '!', operand }
    }

    return this.parseCallMember()
  }

  private parseCallMember(): AstNode {
    let node = this.parsePrimary()

    while (true) {
      if (this.matchPunct('.')) {
        const prop = this.consume('ident', 'expected property name after .')

        node = { kind: 'member', object: node, property: prop.value, optional: false }
        continue
      }

      if (this.matchPunct('?.')) {
        // After ?. we can have .name, [expr], or (args) — handle the first two.
        const t = this.peek()

        if (t.type === 'ident') {
          this.pos++
          node = { kind: 'member', object: node, property: t.value, optional: true }
          continue
        }

        if (t.type === 'punct' && t.value === '[') {
          this.pos++
          const idx = this.parseTernary()

          this.consumePunct(']', 'expected ] to close index')
          node = { kind: 'index', object: node, index: idx, optional: true }
          continue
        }

        throw this.error(`Unexpected token after ?.: '${t.value}'`)
      }

      if (this.matchPunct('[')) {
        const idx = this.parseTernary()

        this.consumePunct(']', 'expected ] to close index')
        node = { kind: 'index', object: node, index: idx, optional: false }
        continue
      }

      if (this.matchPunct('(')) {
        const args: AstNode[] = []

        if (!this.matchPunct(')')) {
          args.push(this.parseTernary())

          while (this.matchPunct(',')) {
            args.push(this.parseTernary())
          }

          this.consumePunct(')', 'expected ) to close call')
        }

        node = { kind: 'call', callee: node, args }
        continue
      }

      return node
    }
  }

  private parsePrimary(): AstNode {
    const t = this.peek()

    if (t.type === 'number') {
      this.pos++

      return { kind: 'literal', value: Number(t.value) }
    }

    if (t.type === 'string') {
      this.pos++

      return { kind: 'literal', value: t.value }
    }

    if (t.type === 'ident') {
      this.pos++

      if (t.value === 'true') return { kind: 'literal', value: true }

      if (t.value === 'false') return { kind: 'literal', value: false }

      if (t.value === 'null') return { kind: 'literal', value: null }

      if (t.value === 'undefined') return { kind: 'literal', value: undefined }

      return { kind: 'ident', name: t.value }
    }

    if (t.type === 'punct' && t.value === '(') {
      this.pos++
      const node = this.parseTernary()

      this.consumePunct(')', 'expected ) to close group')

      return node
    }

    throw this.error(`Unexpected token '${t.value}'`)
  }

  // ── Helpers ──

  private peek(): Token {
    return this.tokens[this.pos]!
  }

  private matchPunct(value: string): boolean {
    const t = this.peek()

    if (t.type === 'punct' && t.value === value) {
      this.pos++

      return true
    }

    return false
  }

  private consume(type: TokenType, message: string): Token {
    const t = this.peek()

    if (t.type !== type) {
      throw this.error(`${message} (got '${t.value}')`)
    }

    this.pos++

    return t
  }

  private consumePunct(value: string, message: string): Token {
    const t = this.peek()

    if (t.type !== 'punct' || t.value !== value) {
      throw this.error(`${message} (got '${t.value}')`)
    }

    this.pos++

    return t
  }

  private error(message: string): TemplateRenderError {
    return new TemplateRenderError(`${message} in expression '${this.source}'`, '', this.source)
  }
}

// ─── Evaluator ──────────────────────────────────────────────────────────────

/**
 * Property names that would let an expression walk the prototype chain to
 * the `Function` constructor (`obj.constructor.constructor("...")`) and
 * execute arbitrary code. Both `.foo` and `obj["foo"]` access are gated
 * through {@link readSafeProperty} so a denylist here is sufficient.
 */
const FORBIDDEN_PROPERTY_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

function readSafeProperty(obj: object, key: string, source: string): unknown {
  if (FORBIDDEN_PROPERTY_KEYS.has(key)) {
    throw new TemplateRenderError(
      `Access to '${key}' is forbidden in '${source}'`,
      '',
      source,
    )
  }

  return (obj as Record<string, unknown>)[key]
}

export function evaluateExpression(
  source: string,
  scopes: readonly Scope[],
): unknown {
  const tokens = tokenise(source)
  const parser = new Parser(tokens, source)
  const ast = parser.parse()

  return evalNode(ast, scopes, source)
}

function evalNode(node: AstNode, scopes: readonly Scope[], source: string): unknown {
  switch (node.kind) {
    case 'literal':
      return node.value

    case 'ident':
      return lookupIdent(node.name, scopes)

    case 'member': {
      const obj = evalNode(node.object, scopes, source)

      if (obj === null || obj === undefined) {
        if (node.optional) return undefined

        throw new TemplateRenderError(
          `Cannot read property '${node.property}' of ${String(obj)} in '${source}'`,
          '',
          source,
        )
      }

      return readSafeProperty(obj as object, node.property, source)
    }

    case 'index': {
      const obj = evalNode(node.object, scopes, source)

      if (obj === null || obj === undefined) {
        if (node.optional) return undefined

        throw new TemplateRenderError(
          `Cannot read index of ${String(obj)} in '${source}'`,
          '',
          source,
        )
      }

      const key = evalNode(node.index, scopes, source)

      return readSafeProperty(obj as object, String(key), source)
    }

    case 'call': {
      const callee = evalNode(node.callee, scopes, source)

      if (typeof callee !== 'function') {
        throw new TemplateRenderError(
          `Value is not callable in '${source}'`,
          '',
          source,
        )
      }

      const args = node.args.map((a) => evalNode(a, scopes, source))

      return (callee as (...xs: unknown[]) => unknown)(...args)
    }

    case 'unary':
      return !evalNode(node.operand, scopes, source)

    case 'binary': {
      const l = evalNode(node.left, scopes, source)
      const r = evalNode(node.right, scopes, source)

      switch (node.op) {
        case '===': return l === r
        case '!==': return l !== r
         
        case '==': return l == r
         
        case '!=': return l != r
        case '<': return (l as number) < (r as number)
        case '<=': return (l as number) <= (r as number)
        case '>': return (l as number) > (r as number)
        case '>=': return (l as number) >= (r as number)
        case '+':
          // Mirror JS: string concat when either operand is a string,
          // numeric addition otherwise.
          if (typeof l === 'string' || typeof r === 'string') {
            return String(l) + String(r)
          }

          return (l as number) + (r as number)
        case '-': return (l as number) - (r as number)
      }
    }

    // falls through
    case 'logical': {
      const l = evalNode(node.left, scopes, source)

      switch (node.op) {
        case '&&': return (l as unknown) && evalNode(node.right, scopes, source)
        case '||': return l || evalNode(node.right, scopes, source)
        case '??': return l ?? evalNode(node.right, scopes, source)
      }
    }

    // falls through
    case 'ternary':
      return evalNode(node.test, scopes, source)
        ? evalNode(node.consequent, scopes, source)
        : evalNode(node.alternate, scopes, source)
  }
}

function lookupIdent(name: string, scopes: readonly Scope[]): unknown {
  // Walk scope stack from innermost to outermost.
  for (let i = scopes.length - 1; i >= 0; i--) {
    const scope = scopes[i]!

    if (Object.prototype.hasOwnProperty.call(scope, name)) {
      return scope[name]
    }
  }

  return undefined
}
