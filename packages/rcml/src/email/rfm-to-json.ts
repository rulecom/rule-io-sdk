/**
 * Public API: RFM markdown → RCML content JSON conversion.
 *
 * This file contains **only public exports**. Every symbol here is part of
 * the `@rule-io/rcml` contract and is marked `@public` in its JSDoc. The
 * parse/transform/convert pipeline lives under `./content/`.
 */

import { convert } from './content/converter/convert.js'
import { parseInlineRfm, parseRfm } from './content/parser/parse.js'
import { transform } from './content/transformer/transform.js'
import type { Json } from './validate-rcml-json.js'

/**
 * Convert a full RFM markdown string into an RCML content JSON document.
 *
 * Runs the full pipeline: parse → validate → transform → convert. Throws
 * `RcmlValidationError` if the input contains syntax not allowed by the
 * RFM flavor. The returned {@link Json} can be stored, sent to a Milkdown
 * editor running the RFM preset, or further validated with
 * {@link validateJsonSemantics}.
 *
 * @param input - RFM markdown source string.
 * @returns Typed RCML document JSON (`{ type: 'doc', content: [...] }`).
 * @throws `RcmlValidationError` when the input is not valid RFM.
 *
 * @example
 * ```ts
 * const doc = rfmToJson('Hello :font[world]{font-weight="bold"}')
 * // { type: 'doc', content: [{ type: 'paragraph', content: [...] }] }
 * ```
 * @public
 */
export function rfmToJson(input: string): Json {
  const { ast } = parseRfm(input)
  const ir = transform(ast)
  return convert(ir).toJSON() as Json
}

/**
 * Convert an Inline RFM markdown string into an RCML content JSON document.
 *
 * Inline RFM forbids block-level lists, `:::align`, and hard breaks. Throws
 * `RcmlValidationError` if the input violates these restrictions.
 *
 * @param input - Inline RFM markdown source string.
 * @returns Typed RCML document JSON (`{ type: 'doc', content: [...] }`).
 * @throws `RcmlValidationError` when the input is not valid Inline RFM.
 *
 * @example
 * ```ts
 * const doc = inlineRfmToJson(':font[Click here]{font-weight="bold"}')
 * // { type: 'doc', content: [{ type: 'paragraph', content: [...] }] }
 * ```
 * @public
 */
export function inlineRfmToJson(input: string): Json {
  const { ast } = parseInlineRfm(input)
  const ir = transform(ast)
  return convert(ir).toJSON() as Json
}
