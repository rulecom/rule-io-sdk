/**
 * Template AST — shape produced by {@link parseTemplate} and
 * consumed by {@link evaluate}.
 *
 * The AST intentionally preserves XML structure (elements, attrs,
 * text runs) alongside directive blocks (`@if` / `@for`) as
 * siblings. `{{…}}` interpolations are represented as
 * `InterpolationNode` children both in text position (direct AST
 * nodes) and in attribute position (as parts inside `AttrNode`).
 *
 * @internal
 */

import type { ExpressionNode } from '../expression/ast.js'
import type { SourceLoc } from '../source/loc.js'
import type { LoopMetaName } from '../types.js'

/**
 * Root type of the template AST — a discriminated union on `kind`.
 *
 * Every node carries a `loc` referring to its first character in
 * the outer template source so error messages can point at the
 * right position.
 */
export type TemplateNode =
  | ElementNode
  | TextNode
  | InterpolationNode
  | IfBlockNode
  | ForBlockNode

/** An XML element with its tag name, attribute list, and children. */
export interface ElementNode {
  readonly kind: 'element'
  /** Tag name, e.g. `rc-text`. Preserved case-sensitively. */
  readonly tag: string
  /** Attributes in source order (duplicates not de-duplicated). */
  readonly attrs: readonly AttrNode[]
  /** Children in source order. Empty for self-closed tags. */
  readonly children: readonly TemplateNode[]
  /** `true` when the source used `<tag/>` form; `false` for `<tag>…</tag>`. */
  readonly selfClose: boolean
  /** Location of the opening `<` in the source. */
  readonly loc: SourceLoc
}

/**
 * One attribute on an {@link ElementNode}.
 *
 * The value is represented as an ordered list of parts so that
 * mixed literal + interpolation content (e.g. `href="/u/{{id}}"`)
 * can be emitted piece-by-piece with the right escape policy per
 * part.
 */
export interface AttrNode {
  /** Attribute name, preserved verbatim. */
  readonly name: string
  /** Ordered parts — literal runs and inline interpolations. */
  readonly value: readonly AttrPart[]
  /** The quote delimiter used in the source — `"` by default. */
  readonly quote: '"' | "'"
  /** Location of the first character of the attribute name. */
  readonly loc: SourceLoc
}

/**
 * One part inside an {@link AttrNode} value — either a literal text
 * run or an interpolation. The evaluator concatenates these when
 * emitting the attribute.
 */
export type AttrPart =
  | { readonly kind: 'text'; readonly text: string; readonly loc: SourceLoc }
  | InterpolationNode

/** A run of static character content between XML tags. */
export interface TextNode {
  readonly kind: 'text'
  /** The raw text, emitted verbatim per spec §10. */
  readonly text: string
  /** Location of the first character of the text run. */
  readonly loc: SourceLoc
}

/** A `{{…}}` interpolation. Appears at text position or inside attrs. */
export interface InterpolationNode {
  readonly kind: 'interpolation'
  /** The parsed body — which namespace the interpolation resolves from. */
  readonly expr: InterpolationExpression
  /** Location of the opening `{{` in the source. */
  readonly loc: SourceLoc
}

/**
 * The body of an {@link InterpolationNode}, tagged by which
 * namespace it resolves from.
 *
 * - `message` — `{{t:key(…)}}` — parameterised message lookup.
 * - `data` — `{{data:a.b}}` — path into the caller's data.
 * - `local` — `{{item.name}}` — unqualified scope-stack lookup.
 * - `loopMeta` — `{{$index}}` / `{{$first}}` / … — loop metadata.
 */
export type InterpolationExpression =
  | MessageInterpolation
  | DataInterpolation
  | LocalInterpolation
  | LoopMetaInterpolation

/** `{{t:key.path(name=expr, …)}}`. */
export interface MessageInterpolation {
  readonly kind: 'message'
  /** Dotted key to the message leaf, split into segments. */
  readonly key: readonly string[]
  /** Ordered `name=value` params (may be empty). */
  readonly params: readonly { readonly name: string; readonly value: ExpressionNode }[]
}

/** `{{data:path.to.value}}`. */
export interface DataInterpolation {
  readonly kind: 'data'
  /** Dotted path into the `data` input, split into segments. */
  readonly path: readonly string[]
}

/** `{{item.name}}` — unqualified path resolved against the scope stack. */
export interface LocalInterpolation {
  readonly kind: 'local'
  /** Dotted path split into segments. */
  readonly path: readonly string[]
}

/** `{{$index}}` etc. — one of the six reserved loop-meta names. */
export interface LoopMetaInterpolation {
  readonly kind: 'loopMeta'
  readonly name: LoopMetaName
}

/**
 * An `@if (cond) {…} @else if (cond) {…} @else {…}` block.
 *
 * The evaluator walks `branches` top-to-bottom and emits the first
 * whose condition is truthy; if none match and `elseBranch` is
 * present, that runs instead.
 */
export interface IfBlockNode {
  readonly kind: 'if'
  /** Condition branches, in source order. The first branch is the `@if`. */
  readonly branches: readonly {
    readonly condition: ExpressionNode
    readonly children: readonly TemplateNode[]
  }[]
  /** Optional fallback body from `@else { … }`. */
  readonly elseBranch?: readonly TemplateNode[]
  /** Location of the `@if` keyword. */
  readonly loc: SourceLoc
}

/**
 * An `@for (item of expr) { … }` block.
 *
 * The evaluator binds `itemName` + the six loop-meta entries in a
 * new scope for each iteration of the evaluated `iterable`.
 */
export interface ForBlockNode {
  readonly kind: 'for'
  /** Loop-variable name introduced by the header. */
  readonly itemName: string
  /** Expression that must evaluate to an array at runtime. */
  readonly iterable: ExpressionNode
  /** Body evaluated once per element. */
  readonly children: readonly TemplateNode[]
  /** Location of the `@for` keyword. */
  readonly loc: SourceLoc
}
