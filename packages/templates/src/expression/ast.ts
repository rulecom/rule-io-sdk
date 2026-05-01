/**
 * Expression AST — shape produced by {@link parseExpression} and
 * consumed by {@link evaluateExpression}.
 *
 * The AST covers condition expressions inside `@if` / `@else if`,
 * the iterable in `@for (item of <expr>)`, and the value expressions
 * for message-interpolation params (`{{t:key(name=<expr>)}}`). It is
 * deliberately minimal: no function calls, no arithmetic, no
 * ternary.
 *
 * @internal
 */

import type { SourceLoc } from '../source/loc.js'
import type { LoopMetaName } from '../types.js'

/**
 * The binary operators recognised by the v1.1 expression grammar.
 *
 * Equality (`==`/`!=`) uses JS's loose-equality semantics per the
 * evaluator; strict equality is not supported. Relational operators
 * defer to JS coercion rules for mismatched operand types.
 */
export type BinaryOp =
  | '=='
  | '!='
  | '<'
  | '<='
  | '>'
  | '>='
  | '&&'
  | '||'

/**
 * Root type of the expression AST — a discriminated union on `kind`.
 *
 * Variants:
 *
 * - `literal` — a string, number, boolean, or `null` constant written
 *   verbatim in the source.
 * - `dataPath` — a `data:a.b.c` reference that resolves against the
 *   compiler's `data` input.
 * - `localPath` — an unqualified identifier path (e.g. `item.name`)
 *   that resolves against the scope stack starting at the innermost
 *   `@for` binding.
 * - `loopMeta` — one of the reserved loop-meta names (`$index`,
 *   `$count`, `$first`, `$last`, `$even`, `$odd`).
 * - `unary` — a logical-not applied to another expression.
 * - `binary` — two sub-expressions joined by a {@link BinaryOp}.
 * - `group` — an explicit `( … )` grouping; preserved in the AST
 *   only for accurate error locations, the evaluator treats it as
 *   its inner expression.
 */
export type ExpressionNode =
  | { kind: 'literal'; value: string | number | boolean | null; loc: SourceLoc }
  | { kind: 'dataPath'; path: readonly string[]; loc: SourceLoc }
  | { kind: 'localPath'; path: readonly string[]; loc: SourceLoc }
  | { kind: 'loopMeta'; name: LoopMetaName; loc: SourceLoc }
  | { kind: 'unary'; op: '!'; operand: ExpressionNode; loc: SourceLoc }
  | { kind: 'binary'; op: BinaryOp; left: ExpressionNode; right: ExpressionNode; loc: SourceLoc }
  | { kind: 'group'; expr: ExpressionNode; loc: SourceLoc }
