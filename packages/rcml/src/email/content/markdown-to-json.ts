import { parseRfm, parseInlineRfm } from './parser/parse.js'
import { transform } from './transformer/transform.js'
import { convert } from './converter/convert.js'
import type { Json } from './json-validator/types.js'

/**
 * Convert a full RFM markdown string to an RCML document JSON object.
 *
 * Runs the full pipeline: parse → validate → transform → convert.
 * Throws `RcmlValidationError` if the input contains syntax not allowed by
 * the RFM flavor.
 *
 * The returned `Json` value is a typed RCML document tree that can be stored,
 * sent to the Milkdown editor running the RFM preset, or further validated
 * with {@link validateJsonSemantics}.
 *
 * @param input - RFM markdown source string.
 * @returns Typed RCML document JSON (`{ type: 'doc', content: [...] }`).
 *
 * @example
 * ```ts
 * const doc = rfmToJson('Hello :font[world]{font-weight="bold"}')
 * // { type: 'doc', content: [{ type: 'paragraph', content: [...] }] }
 * ```
 */
export function rfmToJson(input: string): Json {
  const { ast } = parseRfm(input)
  const ir = transform(ast)

  return convert(ir).toJSON() as Json
}

/**
 * Convert an Inline RFM markdown string to an RCML document JSON object.
 *
 * Runs the full pipeline: parse → validate → transform → convert.
 * Throws `RcmlValidationError` if the input contains syntax not allowed by
 * the Inline RFM flavor (block-level lists, `:::align`, and hard breaks are
 * forbidden in inline mode).
 *
 * @param input - Inline RFM markdown source string.
 * @returns Typed RCML document JSON (`{ type: 'doc', content: [...] }`).
 *
 * @example
 * ```ts
 * const doc = inlineRfmToJson(':font[Click here]{font-weight="bold"}')
 * // { type: 'doc', content: [{ type: 'paragraph', content: [...] }] }
 * ```
 */
export function inlineRfmToJson(input: string): Json {
  const { ast } = parseInlineRfm(input)
  const ir = transform(ast)

  return convert(ir).toJSON() as Json
}
