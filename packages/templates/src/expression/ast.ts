/**
 * Expression AST — shape produced by {@link parseExpression} and
 * consumed by {@link evaluateExpression}.
 *
 * The AST covers condition expressions inside `<?if?>` / `<?elseif?>`,
 * the iterable in `<?for item of <expr>?>`, the value expressions
 * for `<?copy?>` PI params, and the bodies of `@{…}` attribute
 * bindings. It is deliberately minimal: no function calls, no
 * arithmetic, no ternary (spec §6.5).
 *
 * @internal
 */

import type { SourceLoc } from '../source/loc.js'

/**
 * The binary operators recognised by the v3 expression grammar.
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
 * - `localPath` — an identifier path (e.g. `item.name` or
 *   `user.premium`). Resolves against the scope stack
 *   innermost-to-outermost; the outermost frame is the caller's
 *   `data` object itself, so plain `foo.bar` references into `data`
 *   without any prefix.
 * - `unary` — a logical-not applied to another expression.
 * - `binary` — two sub-expressions joined by a {@link BinaryOp}.
 * - `group` — an explicit `( … )` grouping; preserved in the AST
 *   only for accurate error locations, the evaluator treats it as
 *   its inner expression.
 */
export type ExpressionNode =
  | { kind: 'literal'; value: string | number | boolean | null; loc: SourceLoc }
  | { kind: 'localPath'; path: readonly string[]; loc: SourceLoc }
  | { kind: 'unary'; op: '!'; operand: ExpressionNode; loc: SourceLoc }
  | { kind: 'binary'; op: BinaryOp; left: ExpressionNode; right: ExpressionNode; loc: SourceLoc }
  | { kind: 'group'; expr: ExpressionNode; loc: SourceLoc }
