/**
 * Public API: SMS content JSON → SMS RFM string conversion.
 */

import { serializeSmsJson } from './content/serializer/serialize.js'
import type { SmsContentJson } from './content/json-validator/types.js'

/**
 * Convert an {@link SmsContentJson} document back to an SMS RFM string.
 *
 * Reverse of {@link smsRfmToJson}. The conversion is lossless:
 * - Text nodes with a link mark → `:link[text]{href="..." track="..." shorten="..."}`
 * - Placeholder nodes with a resolved value or max-length → `::placeholder{...}` directive form
 * - Placeholder nodes with null value and null max-length → compact `[Type:Name]` form
 * - Hardbreaks → `\` at line end
 * - Paragraphs → separated by `\n\n`
 *
 * @param json - Typed SMS content JSON (`{ type: 'doc', content: [...] }`).
 * @returns SMS RFM string.
 *
 * @example
 * ```ts
 * const json = smsRfmToJson('Hello [Subscriber:FirstName]')
 * const rfm = jsonToSmsRfm(json)
 * // rfm === 'Hello [Subscriber:FirstName]'
 * ```
 * @public
 */
export function jsonToSmsRfm(json: SmsContentJson): string {
  return serializeSmsJson(json)
}
