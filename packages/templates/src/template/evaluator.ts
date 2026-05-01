/**
 * Template evaluator — walks a {@link TemplateNode} tree against
 * a scope stack and emits the compiled XML string.
 *
 * Scope stack semantics (spec §11.3): lookup order is
 *   1. innermost local scope (e.g. most recent `@for`)
 *   2. outer local scopes
 *   3. global `data`
 *
 * Escaping is context-aware: text-node interpolations get
 * text-escape (`& < >`) and attribute-value interpolations
 * additionally escape the matching quote delimiter. Static template
 * text is emitted verbatim (spec §10) so RFM atoms like
 * `::placeholder{name="foo"}` survive.
 *
 * @internal
 */

import { TemplateCompileError } from '../errors.js'
import {
  evaluateExpression,
  probeDataPath,
  probeLocalPath,
  type EvalContext,
  type EvalScope,
} from '../expression/evaluator.js'
import { lookupMessage, substituteMessageParams } from '../messages/messages.js'
import { escapeXmlAttr, escapeXmlText } from './escape.js'
import type {
  AttrNode,
  ElementNode,
  ForBlockNode,
  IfBlockNode,
  InterpolationNode,
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
  /** Resolved messages tree for the caller's locale. */
  readonly messages: unknown
}

/**
 * Walk a template AST against a scope stack and produce the output
 * XML string.
 *
 * The initial scope stack is supplied by {@link compileTemplate} as
 * `[{ data }]`. `@for` blocks push additional scopes with the
 * loop-variable binding plus loop-meta entries (`$index`, `$count`,
 * `$first`, `$last`, `$even`, `$odd`).
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
      // Spec §10: static template text is emitted verbatim.
      out.push(node.text)

      return

    case 'interpolation': {
      const value = resolveInterpolation(node, scopes, opts)

      out.push(escapeXmlText(value))

      return
    }

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

  for (const part of attr.value) {
    if (part.kind === 'text') {
      // Literal attribute text is emitted verbatim — the author is
      // responsible for well-formed content (matching the escape
      // policy for static template text, spec §10).
      out.push(part.text)
    } else {
      const value = resolveInterpolation(part, scopes, opts)

      out.push(escapeXmlAttr(value, attr.quote))
    }
  }

  out.push(attr.quote)
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
      `@for iterable must evaluate to array (got ${typeof iterable})`,
      node.loc,
      opts.source,
      opts.sourcePath,
    )
  }

  for (let i = 0; i < iterable.length; i++) {
    const item = iterable[i] as unknown
    const loopScope: EvalScope = {
      [node.itemName]: item,
      $index: i,
      $count: iterable.length,
      $first: i === 0,
      $last: i === iterable.length - 1,
      $even: i % 2 === 0,
      $odd: i % 2 !== 0,
    }

    emitNodes(out, node.children, [...scopes, loopScope], opts)
  }
}

// ── Interpolation resolution ──────────────────────────────────────

function resolveInterpolation(
  node: InterpolationNode,
  scopes: readonly EvalScope[],
  opts: EvaluatorOptions,
): string {
  const ctx = makeEvalContext(scopes, opts)
  const expr = node.expr

  switch (expr.kind) {
    case 'message': {
      const template = lookupMessage(
        opts.messages,
        expr.key,
        node.loc,
        opts.source,
        opts.sourcePath,
      )

      const params: Record<string, string> = {}

      for (const p of expr.params) {
        const value = evaluateExpression(p.value, ctx)

        params[p.name] = stringify(value)
      }

      return substituteMessageParams(
        template,
        params,
        node.loc,
        opts.source,
        opts.sourcePath,
        expr.key.join('.'),
      )
    }

    case 'data': {
      const { found, value } = probeDataPath(expr.path, ctx)

      if (!found) {
        throw new TemplateCompileError(
          `Data path not found: ${expr.path.join('.')}`,
          node.loc,
          opts.source,
          opts.sourcePath,
        )
      }

      return stringify(value)
    }

    case 'local': {
      const { found, value } = probeLocalPath(expr.path, ctx)

      if (!found) {
        throw new TemplateCompileError(
          `Unknown variable: ${expr.path.join('.')}`,
          node.loc,
          opts.source,
          opts.sourcePath,
        )
      }

      return stringify(value)
    }

    case 'loopMeta': {
      const { found, value } = probeLocalPath([expr.name], ctx)

      if (!found) {
        throw new TemplateCompileError(
          `'${expr.name}' used outside '@for' block`,
          node.loc,
          opts.source,
          opts.sourcePath,
        )
      }

      return stringify(value)
    }
  }
}

function stringify(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)

  // For objects/arrays we default to JSON so misconfiguration at
  // least surfaces a visible error in rendered output rather than
  // `[object Object]`.
  return JSON.stringify(value)
}

function toBool(value: unknown): boolean {
  // Spec §8.5: only false / null / undefined are falsy.
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
