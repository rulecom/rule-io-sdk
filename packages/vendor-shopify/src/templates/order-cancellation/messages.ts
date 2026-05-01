/**
 * Messages for the order-cancellation template.
 *
 * Each text node in `order-cancellation.xml` is a single
 * `{{t('key', { … })}}` call against one of these entries. Message
 * bodies embed the full sentence — including any RFM atoms
 * (`::placeholder{…}`, `:link[…]{…}`, `:font[…]{…}`) with
 * `{{placeholder}}` slots for their dynamic parts (field name, field
 * id, loop key, caller-supplied label). The template's `.ts` builder
 * passes those values as `t()` params.
 *
 * @internal
 */

export const messages = {
  /** `<rc-preview>` body — caller-supplied preheader text. */
  preheader: '{{preheader}}',

  /** Hero banner heading — caller-supplied. */
  heading: '{{heading}}',

  /**
   * Greeting line: `{greeting} <firstName-atom>,`.
   *
   * Params:
   * - `greeting` — caller label (e.g. `"Hi"`).
   * - `firstNameLabel` — Rule.io logical field name for the customer.
   * - `firstNameId` — numeric custom-field id (stringified).
   */
  greetingLine:
    '{{greeting}} ::placeholder{type="CustomField" name="{{firstNameLabel}}" value="{{firstNameId}}" original="[CustomField:{{firstNameId}}]"},',

  /** Main cancellation message — caller-supplied. */
  message: '{{message}}',

  /**
   * Order reference row: `{orderRefLabel}: <orderRef-atom>`.
   *
   * Params: `orderRefLabel` (caller), `orderRefName` (logical field),
   * `orderRefId` (numeric id).
   */
  orderRefRow:
    '{{orderRefLabel}}: ::placeholder{type="CustomField" name="{{orderRefName}}" value="{{orderRefId}}" original="[CustomField:{{orderRefId}}]"}',

  /** Order date row (optional). Params mirror `orderRefRow`. */
  orderDateRow:
    '{{orderDateLabel}}: ::placeholder{type="CustomField" name="{{orderDateName}}" value="{{orderDateId}}" original="[CustomField:{{orderDateId}}]"}',

  /** Optional support-callout text — caller-supplied. */
  supportText: '{{supportText}}',

  /**
   * Support callout link (rendered beside `supportText` when a
   * support URL/email is supplied). Params: `linkText` (display
   * text), `linkHref` (safe href).
   */
  supportLink: ':link[{{linkText}}]{href="{{linkHref}}" target="_blank"}',

  /** Closing follow-up paragraph — caller-supplied. */
  followUp: '{{followUp}}',

  /** Primary CTA button label — caller-supplied. */
  ctaButton: '{{ctaButton}}',

  /**
   * Footer link row: view-in-browser + separator + unsubscribe,
   * each wrapped in `:font[:link[…]{…}]{…}` with styling.
   *
   * Params: `viewInBrowserText`, `unsubscribeText`, `fontSize`,
   * `textColor` (all resolved by the builder with English defaults).
   */
  footerLinks:
    ':font[:link[{{viewInBrowserText}}]{href="[Link:WebBrowser]" target="_blank" no-tracked="true"}]{font-size="{{fontSize}}" text-decoration="underline" color="{{textColor}}"} :font[|]{font-size="{{fontSize}}" color="{{textColor}}"} :font[:link[{{unsubscribeText}}]{href="[Link:Unsubscribe]" target="_blank" no-tracked="true"}]{font-size="{{fontSize}}" text-decoration="underline" color="{{textColor}}"}',

  /** Fixed "Certified by Rule" footer attribution. */
  certifiedByRule: 'Certified by Rule',
} as const
