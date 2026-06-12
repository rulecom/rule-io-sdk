/**
 * Public API: SFM (SMS Format Markup) string → SMS content JSON conversion.
 */

import { parseSfm } from './content/parser/parse.js'
import type { SmsContentJson } from './content/json-validator/types.js'

/**
 * Convert an SFM string into an {@link SmsContentJson} document.
 *
 * SFM is a simple text format:
 * - `[Type:Name]` placeholders (e.g. `[Subscriber:FirstName]`)
 * - Single `\n` → hard line break within a paragraph
 * - Double `\n\n` → new paragraph
 *
 * Link marks are not representable in SFM — construct {@link SmsContentJson}
 * directly when you need linked text with tracking/shortening attributes.
 *
 * @param input - SFM source string.
 * @returns Typed SMS content JSON (`{ type: 'doc', content: [...] }`).
 *
 * @example
 * ```ts
 * const doc = sfmToJson('Hi [Subscriber:FirstName]!\nYour order has shipped.')
 * ```
 * @public
 */
export function sfmToJson(input: string): SmsContentJson {
  return parseSfm(input)
}
