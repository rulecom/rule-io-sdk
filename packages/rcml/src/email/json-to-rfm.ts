/**
 * Public API: RCML content JSON → RFM markdown conversion.
 *
 * This file contains **only public exports**. Every symbol here is part of
 * the `@rule-io/rcml` contract and is marked `@public` in its JSDoc. The
 * block/inline/mark serializers live under `./content/serializer/`.
 */

import { serializeBlock } from './content/serializer/block.js'
import type { Json } from './validate-rcml-json.js'

/**
 * Convert an RCML content JSON document back to an RFM markdown string.
 *
 * Reverse of {@link rfmToJson}: the output is a valid RFM markdown string
 * that, when passed back through `rfmToJson`, produces a JSON document equal
 * to the input.
 *
 * If the input JSON was originally produced by {@link inlineRfmToJson}, the
 * output will also be valid Inline RFM (it will only contain
 * inline-RFM-compatible constructs). In that case prefer the semantically
 * explicit {@link jsonToInlineRfm} alias.
 *
 * @param json - Typed RCML document JSON (`{ type: 'doc', content: [...] }`).
 * @returns RFM markdown string.
 *
 * @example
 * ```ts
 * const json = rfmToJson('Hello :font[world]{font-weight="bold"}')
 * const md = jsonToRfm(json)
 * // md === 'Hello :font[world]{font-weight="bold"}'
 * ```
 * @public
 */
export function jsonToRfm(json: Json): string {
  return json.content.map(serializeBlock).join('\n\n')
}

/**
 * Convert an RCML content JSON document back to an Inline RFM markdown string.
 *
 * Reverse of {@link inlineRfmToJson}. Semantically equivalent to
 * {@link jsonToRfm} — use this name when the JSON was produced by
 * `inlineRfmToJson` to keep the intent clear at call sites.
 *
 * @param json - Typed RCML document JSON (`{ type: 'doc', content: [...] }`).
 * @returns Inline RFM markdown string.
 *
 * @example
 * ```ts
 * const json = inlineRfmToJson(':font[Click here]{font-weight="bold"}')
 * const md = jsonToInlineRfm(json)
 * // md === ':font[Click here]{font-weight="bold"}'
 * ```
 * @public
 */
export function jsonToInlineRfm(json: Json): string {
  return json.content.map(serializeBlock).join('\n\n')
}
