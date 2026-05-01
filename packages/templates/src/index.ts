/**
 * `@rule-io/templates` — minimal XML template compiler.
 *
 * See `docs/template-framework.md` for the v1.1 specification.
 *
 * Primary export: {@link compileTemplate}, a pure synchronous compiler
 * that accepts `{ templateSrc, locale, messages, data }` and returns
 * `{ xml }`. All compilation happens in-process; no filesystem or
 * network access.
 *
 * @public
 */

export { compileTemplate } from './compile.js'
export { TemplateCompileError } from './errors.js'
export type {
  CompileTemplateOptions,
  CompileTemplateResult,
  LoopMetaName,
} from './types.js'
