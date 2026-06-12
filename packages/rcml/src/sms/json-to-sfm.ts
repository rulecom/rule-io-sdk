/**
 * Public API: SMS content JSON → SFM (SMS Format Markup) string conversion.
 */

import { serializeSmsJson } from './content/serializer/serialize.js'
import type { SmsContentJson } from './content/json-validator/types.js'

/**
 * Convert an {@link SmsContentJson} document back to an SFM string.
 *
 * Reverse of {@link sfmToJson} for plain content. Note that link marks are
 * **lossy** — only the text content of linked spans is preserved in the
 * output; `track` and `shorten` attrs are dropped.
 *
 * @param json - Typed SMS content JSON (`{ type: 'doc', content: [...] }`).
 * @returns SFM string.
 *
 * @example
 * ```ts
 * const json = sfmToJson('Hello [Subscriber:FirstName]')
 * const sfm = jsonToSfm(json)
 * // sfm === 'Hello [Subscriber:FirstName]'
 * ```
 * @public
 */
export function jsonToSfm(json: SmsContentJson): string {
  return serializeSmsJson(json)
}
