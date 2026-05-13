/**
 * Expression evaluator — walks an {@link ExpressionNode} AST against
 * a scope stack, returning the raw JS value.
 *
 * Scope stack semantics (spec §7): lookup order is
 *   1. innermost local scope (e.g. most recent `<?for?>`)
 *   2. outer local scopes
 *   3. global `data`
 *
 * Short-circuits `&&` / `||` so an undefined path inside the
 * right-hand operand never triggers a "path not found" error when the
 * left-hand already decided the result.
 *
 * @internal
 */

import { TemplateCompileError } from '../errors.js'
import type { ExpressionNode } from './ast.js'

/**
 * One scope frame on the evaluator's scope stack.
 *
 * The outermost scope is always `{ data: <caller's data> }`; each
 * `<?for?>` block pushes an additional frame binding the loop
 * variable.
 */
export interface EvalScope {
  readonly [name: string]: unknown
}

/**
 * Context threaded through every expression evaluation.
 *
 * Carries the scope stack plus enough outer-source metadata that
 * any `TemplateCompileError` raised mid-evaluation (e.g. `@for`
 * iterable type check) can point at the right character.
 */
export interface EvalContext {
  /** The scope stack. Index 0 is the outermost (usually `{ data }`). */
  readonly scopes: readonly EvalScope[]
  /** Full outer template source, for error frames. */
  readonly source: string
  /** Optional file path for error prefixes. */
  readonly sourcePath?: string
}

/**
 * Evaluate an {@link ExpressionNode} against the given context.
 *
 * `&&` and `||` short-circuit: an undefined path inside the
 * right-hand operand never triggers a "path not found" error when
 * the left-hand already decided the result. Equality (`==` / `!=`)
 * uses JS loose-equality semantics per spec §9.
 *
 * @param node - The AST to evaluate.
 * @param ctx - Scope stack plus outer-source metadata.
 * @returns The raw JS value the expression resolved to. The caller
 *   is responsible for coercing to boolean (for `<?if?>` / `<?for?>` gating)
 *   or to string (for interpolation output) as appropriate.
 */
export function evaluateExpression(node: ExpressionNode, ctx: EvalContext): unknown {
  switch (node.kind) {
    case 'literal':
      return node.value

    case 'group':
      return evaluateExpression(node.expr, ctx)

    case 'unary':
      return !evaluateExpression(node.operand, ctx)

    case 'binary': {
      // Short-circuit logical operators
      if (node.op === '&&') {
        const l = evaluateExpression(node.left, ctx)

        if (!l) return l

        return evaluateExpression(node.right, ctx)
      }

      if (node.op === '||') {
        const l = evaluateExpression(node.left, ctx)

        if (l) return l

        return evaluateExpression(node.right, ctx)
      }

      const l = evaluateExpression(node.left, ctx)
      const r = evaluateExpression(node.right, ctx)

      switch (node.op) {

        case '==': return l == r

        case '!=': return l != r
        case '<': return (l as number) < (r as number)
        case '<=': return (l as number) <= (r as number)
        case '>': return (l as number) > (r as number)
        case '>=': return (l as number) >= (r as number)
      }
    }

    // falls through (TS can't see above switch is exhaustive for BinaryOp)
    case 'localPath':
      return resolveLocalPath(node.path, ctx)
  }
}

/**
 * Resolve a path reference by walking the scope stack from
 * innermost → outermost. The first scope whose top-level key matches
 * `path[0]` owns the lookup; subsequent path segments dot-navigate
 * into that scope's value.
 *
 * The outermost scope frame is the caller's `data` object itself
 * (flattened by {@link compileTemplate}), so bare path references
 * like `user.premium` resolve into `data.user.premium` when no
 * enclosing `<?for?>` shadows the head segment.
 */
function resolveLocalPath(
  path: readonly string[],
  ctx: EvalContext,
): unknown {
  if (path.length === 0) return undefined
  const [head, ...tail] = path

  for (let i = ctx.scopes.length - 1; i >= 0; i--) {
    const scope = ctx.scopes[i]!

    if (head !== undefined && Object.prototype.hasOwnProperty.call(scope, head)) {
      return walkPath(scope[head], tail)
    }
  }

  return undefined
}

function walkPath(root: unknown, path: readonly string[]): unknown {
  let cur: unknown = root

  for (const seg of path) {
    if (cur === null || cur === undefined) return undefined

    if (typeof cur !== 'object') return undefined

    cur = (cur as Record<string, unknown>)[seg]
  }

  return cur
}

/** Non-throwing probe for local-path presence. */
export function probeLocalPath(
  path: readonly string[],
  ctx: EvalContext,
): { found: boolean; value: unknown } {
  if (path.length === 0) return { found: false, value: undefined }
  const [head, ...tail] = path

  for (let i = ctx.scopes.length - 1; i >= 0; i--) {
    const scope = ctx.scopes[i]!

    if (head !== undefined && Object.prototype.hasOwnProperty.call(scope, head)) {
      let cur: unknown = scope[head]

      for (const seg of tail) {
        if (cur === null || cur === undefined || typeof cur !== 'object') {
          return { found: false, value: undefined }
        }

        if (!Object.prototype.hasOwnProperty.call(cur, seg)) {
          return { found: false, value: undefined }
        }

        cur = (cur as Record<string, unknown>)[seg]
      }

      return { found: true, value: cur }
    }
  }

  return { found: false, value: undefined }
}

// Re-export TemplateCompileError so callers importing from this module
// can throw with the right error class when a lookup fails and the
// outer context wants it turned into a compile error.
export { TemplateCompileError }
