/**
 * Public type surface for `@rule-io/templates` v1.1.
 *
 * @public
 */

/**
 * Options accepted by {@link compileTemplate}.
 *
 * The compiler is pure and synchronous: it never reads from disk or
 * the network. Callers assemble the full compilation context up front
 * and pass it in.
 *
 * @public
 */
export interface CompileTemplateOptions<
  TMessages = Record<string, unknown>,
  TData = Record<string, unknown>,
> {
  /**
   * Raw template source — XML with embedded `{{…}}` interpolations and
   * `@if` / `@for` control-flow blocks. No root element required; the
   * source may contain a sequence of sibling elements and directives.
   */
  readonly templateSrc: string

  /**
   * Selected locale. Informational — the compiler expects `messages`
   * to already be the resolved tree for this locale. Surfaces in
   * error messages and is available for future extensions that may
   * key off it.
   */
  readonly locale: string

  /**
   * Resolved message tree for `locale`. Nested objects whose leaves
   * are strings. Leaf strings may contain `{paramName}` placeholders
   * that get substituted by the params supplied to a particular
   * `{{t:key.path(param=expr, …)}}` interpolation.
   */
  readonly messages: TMessages

  /**
   * Data context referenced by `{{data:…}}` interpolations and by
   * condition expressions (`@if (data:… == …)`). Plain serialisable
   * object — no functions, classes, promises, getters or proxies.
   */
  readonly data: TData

  /**
   * Optional source file path, reported in error messages so
   * callers get a clickable location.
   */
  readonly sourcePath?: string
}

/**
 * Result of a successful {@link compileTemplate} call.
 *
 * @public
 */
export interface CompileTemplateResult {
  /** The compiled XML string. */
  readonly xml: string
}

/**
 * Loop metadata variable names accessible inside a `@for` block.
 *
 * @public
 */
export type LoopMetaName =
  | '$index'
  | '$count'
  | '$first'
  | '$last'
  | '$even'
  | '$odd'
