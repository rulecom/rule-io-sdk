/**
 * Template AST — shape produced by {@link parseTemplate} and
 * consumed by {@link evaluate}.
 *
 * The AST preserves XML structure (elements, attrs, text runs)
 * alongside directive blocks (`<?if?>` / `<?for?>` / `<?copy?>`) as
 * siblings. Localized text flows through {@link CopyNode}; dynamic
 * attribute values flow through {@link AttrBindingPart}. There is no
 * expression syntax at text position (spec §5.1).
 *
 * @internal
 */

import type { ExpressionNode } from '../expression/ast.js'
import type { SourceLoc } from '../source/loc.js'

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
  | CopyNode
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
 * mixed literal + `@{…}` binding content (e.g. `href="/u/@{id}"`)
 * can be emitted piece-by-piece with the right escape policy per
 * part.
 */
export interface AttrNode {
  /** Attribute name, preserved verbatim. */
  readonly name: string
  /** Ordered parts — literal runs and inline bindings. */
  readonly value: readonly AttrPart[]
  /** The quote delimiter used in the source — `"` by default. */
  readonly quote: '"' | "'"
  /** Location of the first character of the attribute name. */
  readonly loc: SourceLoc
}

/**
 * One part inside an {@link AttrNode} value — either a literal text
 * run or an `@{expression}` binding. The evaluator concatenates
 * these when emitting the attribute.
 */
export type AttrPart = AttrTextPart | AttrBindingPart

/** Literal run inside an attribute value. Emitted verbatim. */
export interface AttrTextPart {
  readonly kind: 'text'
  readonly text: string
  readonly loc: SourceLoc
}

/** `@{expression}` binding inside an attribute value. */
export interface AttrBindingPart {
  readonly kind: 'binding'
  readonly expr: ExpressionNode
  /** Location of the opening `@{` in the source. */
  readonly loc: SourceLoc
}

/** A run of static character content between XML tags. */
export interface TextNode {
  readonly kind: 'text'
  /** The raw text, emitted verbatim per spec §8. */
  readonly text: string
  /** Location of the first character of the text run. */
  readonly loc: SourceLoc
}

/**
 * A `<?copy key p1=expr p2=expr …?>` localized-copy directive.
 *
 * Resolved at evaluation time: the message leaf is looked up by
 * `key` in the caller-supplied messages tree, its `{{paramName}}`
 * placeholders are substituted with the evaluated `params`, and the
 * result is emitted text-escaped at the current position.
 */
export interface CopyNode {
  readonly kind: 'copy'
  /** Dotted key to the message leaf, split into segments. */
  readonly key: readonly string[]
  /** Ordered `name=expression` params (may be empty). */
  readonly params: readonly { readonly name: string; readonly value: ExpressionNode }[]
  /** Location of the `<?copy` target in the source. */
  readonly loc: SourceLoc
}

/**
 * An `<?if cond?> … <?elseif cond?> … <?else?> … <?endif?>` block.
 *
 * The evaluator walks `branches` top-to-bottom and emits the first
 * whose condition is truthy; if none match and `elseBranch` is
 * present, that runs instead.
 */
export interface IfBlockNode {
  readonly kind: 'if'
  /** Condition branches, in source order. The first branch is the `<?if?>`. */
  readonly branches: readonly {
    readonly condition: ExpressionNode
    readonly children: readonly TemplateNode[]
  }[]
  /** Optional fallback body from `<?else?> … <?endif?>`. */
  readonly elseBranch?: readonly TemplateNode[]
  /** Location of the `<?if?>` keyword. */
  readonly loc: SourceLoc
}

/**
 * An `<?for item of expr?> … <?endfor?>` block.
 *
 * The evaluator binds `itemName` in a new scope for each iteration
 * of the evaluated `iterable`.
 */
export interface ForBlockNode {
  readonly kind: 'for'
  /** Loop-variable name introduced by the header. */
  readonly itemName: string
  /** Expression that must evaluate to an array at runtime. */
  readonly iterable: ExpressionNode
  /** Body evaluated once per element. */
  readonly children: readonly TemplateNode[]
  /** Location of the `<?for?>` keyword. */
  readonly loc: SourceLoc
}
