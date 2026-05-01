/**
 * Public type surface for `@rule-io/templates`.
 *
 * @public
 */

/**
 * Evaluation context supplied to {@link renderTemplate}.
 *
 * Values referenced by identifier inside `{{ expression }}`, `*ngIf`,
 * `*ngFor`, and `[attr]` bindings are looked up here (or on a scope
 * frame pushed by `*ngFor`). Function values are callable in
 * expressions.
 *
 * @public
 */
export interface TemplateContext {
  readonly [key: string]: unknown
}

/**
 * Thrown by {@link renderTemplate} when the input XML is malformed, a
 * structural directive is misused, or an expression fails to evaluate.
 * `path` is an XPath-like slash-separated trail of tag names to the
 * offending node; useful for locating the problem in large templates.
 *
 * @public
 */
export class TemplateRenderError extends Error {
  readonly path: string
  readonly source?: string

  constructor(message: string, path: string, source?: string) {
    super(`${message} (at ${path})`)
    this.name = 'TemplateRenderError'
    this.path = path

    if (source !== undefined) this.source = source
  }
}
