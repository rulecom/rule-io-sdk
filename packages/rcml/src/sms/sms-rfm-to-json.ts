/**
 * Public API: SMS RFM string → SMS content JSON conversion.
 */

import { parseSmsRfm } from './content/parser/parse.js'
import type { SmsContentJson } from './content/json-validator/types.js'

/**
 * Convert an SMS RFM string into an {@link SmsContentJson} document.
 *
 * SMS RFM uses markdown-directive syntax:
 * - `:link[text]{href="..." track="true|false" shorten="true|false"}` → text node with link mark
 * - `::placeholder{type="..." original="..." name="..." value="..." max-length="..."}` → placeholder node
 * - `[Type:Name]` shorthand (e.g. `[Subscriber:FirstName]`) — backward-compatible alias for `::placeholder{...}`
 * - `\` at line end → hard line break within a paragraph
 * - Double `\n\n` → new paragraph
 *
 * Throws `RcmlValidationError` if the input contains unsupported constructs.
 *
 * @param input - SMS RFM source string.
 * @returns Typed SMS content JSON (`{ type: 'doc', content: [...] }`).
 *
 * @example
 * ```ts
 * // Shorthand placeholder
 * const doc = smsRfmToJson('Hi [Subscriber:FirstName]!\nYour order has shipped.')
 *
 * // Link directive
 * const doc2 = smsRfmToJson('Click :link[here]{href="https://example.com" track="true" shorten="true"}')
 * ```
 * @public
 */
export function smsRfmToJson(input: string): SmsContentJson {
  return parseSmsRfm(input)
}
