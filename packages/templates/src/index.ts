/**
 * @rule-io/templates — Angular-like XML template engine.
 *
 * Public entry point: {@link renderTemplate}. Supports `{{ expression }}`
 * interpolation, `*ngIf` / `*ngFor` structural directives, and `[attr]`
 * property binding on XML elements. Expressions are evaluated against a
 * caller-supplied {@link TemplateContext}.
 */

export { renderTemplate } from './render.js'
export { TemplateRenderError } from './types.js'
export type { TemplateContext } from './types.js'
