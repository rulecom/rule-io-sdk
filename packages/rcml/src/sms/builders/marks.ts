/**
 * Public API: typed factories for SMS content JSON marks.
 *
 * Marks are applied to {@link SmsTextNode} via its `marks` field. Builders
 * here return mark objects ready to drop into that array.
 *
 * @public
 */

import type { SmsLinkMark } from './../content/json-validator/types.js'

// ─── Link mark ────────────────────────────────────────────────────────────────

/** Options for {@link createLinkMark}. @public */
export interface CreateSmsLinkMarkOptions {
  /**
   * Destination URL. May contain `[Type:Name]` placeholders such as
   * `[CustomField:Order.Id]` or `[Link:Unsubscribe]` — the Rule platform
   * resolves them at send time.
   */
  href: string
  /** Whether click tracking is enabled for this link. */
  track: boolean
  /** Whether URL shortening is enabled for this link. */
  shorten: boolean
}

/**
 * Build an {@link SmsLinkMark} — a `link` mark carrying a destination URL,
 * a click-tracking flag, and a URL-shortening flag.
 *
 * @example
 * ```ts
 * sms.createLinkMark({
 *   href: 'https://example.com/orders/[CustomField:Order.Id]',
 *   track: true,
 *   shorten: true,
 * })
 * ```
 * @public
 */
export function createLinkMark(opts: CreateSmsLinkMarkOptions): SmsLinkMark {
  return {
    type: 'link',
    attrs: {
      href: opts.href,
      track: opts.track,
      shorten: opts.shorten,
    },
  }
}
