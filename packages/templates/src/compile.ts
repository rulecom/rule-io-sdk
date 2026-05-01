/**
 * Top-level orchestrator for `@rule-io/templates`.
 *
 * Invokes the seven compile phases from spec §11:
 * 1. tokenise template
 * 2. parse template AST
 * 3. parse expression AST (interleaved with 2 via the expression sub-parser)
 * 4. evaluate structural directives
 * 5. resolve interpolations
 * 6. substitute message params
 * 7. serialise XML
 *
 * Everything runs synchronously against caller-supplied inputs; no
 * I/O, no global state, no async work.
 *
 * @public
 */

import { evaluate } from './template/evaluator.js'
import { parseTemplate } from './template/parser.js'
import { tokeniseTemplate } from './template/lexer.js'
import type {
  CompileTemplateOptions,
  CompileTemplateResult,
} from './types.js'

/**
 * Compile an XML template with `@if` / `@for` control flow and
 * `{{t:…}}` / `{{data:…}}` interpolation against the supplied
 * `messages` and `data`.
 *
 * @public
 */
export function compileTemplate(
  options: CompileTemplateOptions,
): CompileTemplateResult {
  const { templateSrc, messages, data, sourcePath } = options

  // Phase 1 — tokenise
  const tokens = tokeniseTemplate({ source: templateSrc, sourcePath })

  // Phases 2 + 3 — parse template AST (expression AST is built in the
  // interpolation parser and expression parser on demand)
  const nodes = parseTemplate(tokens, { source: templateSrc, sourcePath })

  // Phases 4–7 — evaluate + serialise
  const xml = evaluate(nodes, [{ data }], {
    source: templateSrc,
    sourcePath,
    messages,
  })

  return { xml }
}
