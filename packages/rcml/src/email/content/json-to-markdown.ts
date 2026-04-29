import type { Json } from './json-validator/types.js'
import { serializeBlock } from './serializer/block.js'

/**
 * Convert an RCML document JSON object back to an RFM markdown string.
 *
 * This is the reverse of {@link rfmToJson}: the output is a valid RFM markdown
 * string that, when passed back through `rfmToJson`, produces a JSON document
 * equal to the input.
 *
 * If the input JSON was originally produced by {@link inlineRfmToJson}, the
 * output will also be valid Inline RFM (since it will only contain
 * inline-RFM-compatible constructs). In that case you may prefer the
 * semantically explicit {@link jsonToInlineRfm} alias.
 *
 * @param json - Typed RCML document JSON (`{ type: 'doc', content: [...] }`).
 * @returns RFM markdown string.
 *
 * @example
 * ```ts
 * import { rfmToJson, jsonToRfm } from 'rcml-generator'
 *
 * const json = rfmToJson('Hello :font[world]{font-weight="bold"}')
 * const md   = jsonToRfm(json)
 * // md === 'Hello :font[world]{font-weight="bold"}'
 * ```
 */
export function jsonToRfm(json: Json): string {
  return json.content.map(serializeBlock).join('\n\n')
}

/**
 * Convert an RCML document JSON object back to an Inline RFM markdown string.
 *
 * This is the reverse of {@link inlineRfmToJson}: the output is a valid Inline
 * RFM string that, when passed back through `inlineRfmToJson`, produces a JSON
 * document equal to the input.
 *
 * Semantically equivalent to {@link jsonToRfm} — use this function when the
 * JSON was produced by `inlineRfmToJson` to make the intent clear at call sites.
 *
 * @param json - Typed RCML document JSON (`{ type: 'doc', content: [...] }`).
 * @returns Inline RFM markdown string.
 *
 * @example
 * ```ts
 * import { inlineRfmToJson, jsonToInlineRfm } from 'rcml-generator'
 *
 * const json = inlineRfmToJson(':font[Click here]{font-weight="bold"}')
 * const md   = jsonToInlineRfm(json)
 * // md === ':font[Click here]{font-weight="bold"}'
 * ```
 */
export function jsonToInlineRfm(json: Json): string {
  return json.content.map(serializeBlock).join('\n\n')
}
