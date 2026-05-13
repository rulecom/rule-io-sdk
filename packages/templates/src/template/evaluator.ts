/**
 * Template evaluator — walks a {@link TemplateNode} tree against
 * a scope stack and emits the compiled XML string.
 *
 * Scope stack semantics (spec §7): lookup order is
 *   1. innermost local scope (e.g. most recent `<?for?>`)
 *   2. outer local scopes
 *   3. global `data`
 *
 * Escaping is context-aware: `<?copy?>` output gets text-escape
 * (`& < >`) and `@{…}` attribute bindings additionally escape the
 * matching quote delimiter. Static template text is emitted
 * verbatim (spec §8) so RFM atoms like `::placeholder{name="foo"}`
 * survive.
 *
 * @internal
 */

import { TemplateCompileError } from '../errors.js'
import {
  evaluateExpression,
  probeLocalPath,
  type EvalContext,
  type EvalScope,
} from '../expression/evaluator.js'
import type { ExpressionNode } from '../expression/ast.js'
import { isTemplateRef, serializeRef } from '../refs/serializer.js'
import type { TemplateRefSerializer } from '../refs/types.js'
import type { SourceLoc } from '../source/loc.js'
import { lookupMessage, substituteMessageParams } from '../messages/messages.js'
import { escapeXmlAttr, escapeXmlText } from './escape.js'
import type {
  AttrNode,
  CopyNode,
  ElementNode,
  ForBlockNode,
  IfBlockNode,
  TemplateNode,
} from './ast.js'

/**
 * Compile-time inputs for {@link evaluate}. Carried through every
 * internal emitter as a single parameter to keep signatures short.
 */
export interface EvaluatorOptions {
  /** Full outer template source — used for error frames. */
  readonly source: string
  /** Optional file path for error prefixes. */
  readonly sourcePath?: string
  /** Resolved messages tree. */
  readonly messages: unknown
  /** Serializer invoked when a `TemplateRef` reaches a renderable position. */
  readonly serializer: TemplateRefSerializer
}

/**
 * Walk a template AST against a scope stack and produce the output
 * XML string.
 *
 * The initial scope stack is supplied by {@link compileTemplate} as
 * `[{ data }]`. `<?for?>` blocks push additional scopes with the
 * loop-variable binding.
 *
 * @param nodes - Template AST from {@link parseTemplate}.
 * @param scopes - Initial scope stack, outermost first.
 * @param opts - Compile-time inputs.
 * @returns Rendered XML string: static content verbatim, interpolated
 *   values context-aware-escaped.
 */
export function evaluate(
  nodes: readonly TemplateNode[],
  scopes: readonly EvalScope[],
  opts: EvaluatorOptions,
): string {
  const out: string[] = []

  emitNodes(out, nodes, scopes, opts)

  return out.join('')
}

function emitNodes(
  out: string[],
  nodes: readonly TemplateNode[],
  scopes: readonly EvalScope[],
  opts: EvaluatorOptions,
): void {
  for (const node of nodes) {
    emitNode(out, node, scopes, opts)
  }
}

function emitNode(
  out: string[],
  node: TemplateNode,
  scopes: readonly EvalScope[],
  opts: EvaluatorOptions,
): void {
  switch (node.kind) {
    case 'element':
      emitElement(out, node, scopes, opts)

      return

    case 'text':
      // Spec §8: static template text is emitted verbatim.
      out.push(node.text)

      return

    case 'copy':
      emitCopy(out, node, scopes, opts)

      return

    case 'if':
      emitIf(out, node, scopes, opts)

      return

    case 'for':
      emitFor(out, node, scopes, opts)

      return
  }
}

function emitElement(
  out: string[],
  node: ElementNode,
  scopes: readonly EvalScope[],
  opts: EvaluatorOptions,
): void {
  out.push('<')
  out.push(node.tag)

  for (const attr of node.attrs) {
    emitAttr(out, attr, scopes, opts)
  }

  if (node.selfClose) {
    out.push('/>')

    return
  }

  out.push('>')
  emitNodes(out, node.children, scopes, opts)
  out.push('</')
  out.push(node.tag)
  out.push('>')
}

function emitAttr(
  out: string[],
  attr: AttrNode,
  scopes: readonly EvalScope[],
  opts: EvaluatorOptions,
): void {
  out.push(' ')
  out.push(attr.name)

  if (attr.value.length === 0) {
    // Empty value — emit `name=""` to stay valid XML.
    out.push('=""')

    return
  }

  out.push('=')
  out.push(attr.quote)

  const ctx = makeEvalContext(scopes, opts)

  for (const part of attr.value) {
    if (part.kind === 'text') {
      // Literal attribute text is emitted verbatim — the author is
      // responsible for well-formed content (matching the escape
      // policy for static template text, spec §8).
      out.push(part.text)
    } else {
      const value = evalBindingExpression(part.expr, ctx, part.loc, opts)

      out.push(escapeXmlAttr(stringify(value, opts.serializer), attr.quote))
    }
  }

  out.push(attr.quote)
}

function emitCopy(
  out: string[],
  node: CopyNode,
  scopes: readonly EvalScope[],
  opts: EvaluatorOptions,
): void {
  const ctx = makeEvalContext(scopes, opts)
  const template = lookupMessage(
    opts.messages,
    node.key,
    node.loc,
    opts.source,
    opts.sourcePath,
  )

  const params: Record<string, string> = {}

  for (const p of node.params) {
    const value = evalBindingExpression(p.value, ctx, node.loc, opts)

    params[p.name] = stringify(value, opts.serializer)
  }

  const resolved = substituteMessageParams(
    template,
    params,
    node.loc,
    opts.source,
    opts.sourcePath,
    node.key.join('.'),
  )

  out.push(escapeXmlText(resolved))
}

function emitIf(
  out: string[],
  node: IfBlockNode,
  scopes: readonly EvalScope[],
  opts: EvaluatorOptions,
): void {
  const ctx = makeEvalContext(scopes, opts)

  for (const branch of node.branches) {
    if (toBool(evaluateExpression(branch.condition, ctx))) {
      emitNodes(out, branch.children, scopes, opts)

      return
    }
  }

  if (node.elseBranch !== undefined) {
    emitNodes(out, node.elseBranch, scopes, opts)
  }
}

function emitFor(
  out: string[],
  node: ForBlockNode,
  scopes: readonly EvalScope[],
  opts: EvaluatorOptions,
): void {
  const iterable = evaluateExpression(node.iterable, makeEvalContext(scopes, opts))

  if (!Array.isArray(iterable)) {
    throw new TemplateCompileError(
      `<?for?> iterable must evaluate to array (got ${typeof iterable})`,
      node.loc,
      opts.source,
      opts.sourcePath,
    )
  }

  for (const item of iterable) {
    const loopScope: EvalScope = { [node.itemName]: item }

    emitNodes(out, node.children, [...scopes, loopScope], opts)
  }
}

/**
 * Evaluate an expression used as the value of an `@{…}` attribute
 * binding or a `<?copy?>` param. For a bare `localPath` expression,
 * a missing variable raises a compile error (spec §10 "Unknown
 * identifier"). Complex expressions (`&&`, `||`, `==`, …) still
 * short-circuit silently since partial undefined is common and
 * intentional.
 */
function evalBindingExpression(
  expr: ExpressionNode,
  ctx: EvalContext,
  loc: SourceLoc,
  opts: EvaluatorOptions,
): unknown {
  if (expr.kind === 'localPath') {
    const { found, value } = probeLocalPath(expr.path, ctx)

    if (!found) {
      throw new TemplateCompileError(
        `Unknown identifier: ${expr.path.join('.')}`,
        loc,
        opts.source,
        opts.sourcePath,
      )
    }

    return value
  }

  return evaluateExpression(expr, ctx)
}

function stringify(value: unknown, serializer: TemplateRefSerializer): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)

  // TemplateRef → provider-specific placeholder via the serializer.
  if (isTemplateRef(value)) return serializeRef(value, serializer)

  // For other objects/arrays we default to JSON so misconfiguration
  // at least surfaces a visible error in rendered output rather than
  // `[object Object]`.
  return JSON.stringify(value)
}

function toBool(value: unknown): boolean {
  // Only false / null / undefined are falsy.
  return !(value === false || value === null || value === undefined)
}

function makeEvalContext(
  scopes: readonly EvalScope[],
  opts: EvaluatorOptions,
): EvalContext {
  const ctx: EvalContext = {
    scopes,
    source: opts.source,
  }

  if (opts.sourcePath !== undefined) {
    return { ...ctx, sourcePath: opts.sourcePath }
  }

  return ctx
}
