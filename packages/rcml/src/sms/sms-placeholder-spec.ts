/**
 * SMS-applicable subset of the Rule.io backend placeholder spec.
 *
 * The full {@link placeholderSpec} covers all token types including
 * email-only tokens (`LoopValue`, `RandomString`, `Dispatcher`, `PromoCode`).
 * This file exports a filtered view containing only the six token types
 * that are valid in SMS messages.
 *
 * @see {@link placeholderSpec} for the full email + SMS token catalog.
 * @see {@link smsRfmSpec} for the SMS RFM content model that references these tokens.
 */

import { placeholderSpec } from '../email/placeholder-spec.js'
import type { PlaceholderSpec } from '../email/placeholder-spec.js'

export type { PlaceholderSpec, PlaceholderTokenSpec, PlaceholderParamSpec } from '../email/placeholder-spec.js'

// ─── SMS token type union ──────────────────────────────────────────────────────

const SMS_TOKEN_TYPES = [
  'CustomField',
  'Subscriber',
  'User',
  'Date',
  'RemoteContent',
  'Link',
] as const

/** Union of token type keys valid in SMS messages. @public */
export type SmsPlaceholderTokenType = (typeof SMS_TOKEN_TYPES)[number]

// ─── Filtered spec ────────────────────────────────────────────────────────────

/**
 * Machine-readable placeholder spec for SMS — a filtered view of
 * {@link placeholderSpec} containing only the six token types valid in
 * SMS messages. Excluded: `LoopValue`, `RandomString`, `Dispatcher`,
 * `PromoCode`.
 *
 * @example
 * ```ts
 * import { smsPlaceholderSpec } from '@rulecom/rcml'
 *
 * // All SMS-valid token type names
 * Object.keys(smsPlaceholderSpec.tokens)
 * // → ['CustomField', 'Subscriber', 'User', 'Date', 'RemoteContent', 'Link']
 *
 * // System link types that can appear in href or as Link placeholders
 * smsPlaceholderSpec.tokens['Link'].params?.['type'].allowedValues
 * // → ['Optin', 'Unsubscribe', 'WebBrowser', 'ShareLink', 'Signup']
 *
 * // Cross-reference with smsRfmSpec:
 * import { smsRfmSpec } from '@rulecom/rcml'
 * smsRfmSpec.nodes['placeholder'].attrs?.['type'].allowedValues
 * // → same list as Object.keys(smsPlaceholderSpec.tokens)
 * ```
 * @public
 */
export const smsPlaceholderSpec: PlaceholderSpec = {
  version: placeholderSpec.version,
  tokens: Object.fromEntries(
    SMS_TOKEN_TYPES.map((k) => [k, placeholderSpec.tokens[k]!]),
  ),
}
