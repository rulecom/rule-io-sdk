/**
 * Messages for the order-confirmation template.
 *
 * Each text node in `order-confirmation.xml` is a single
 * `{{t('key', { … })}}` call against one of these entries. Messages
 * embed the full sentence (including RFM atoms like
 * `::placeholder{…}` / `::loop-value{…}` / `:font[…]{…}` /
 * `:link[…]{…}`) with `{{placeholder}}` slots for dynamic parts.
 *
 * @internal
 */

export const messages = {
  /** `<rc-preview>` body — caller-supplied preheader text. */
  preheader: '{{preheader}}',

  /**
   * Greeting heading: `{greeting}, <firstName-atom>`.
   *
   * Params: `greeting` (caller), `firstNameLabel` (logical field),
   * `firstNameId` (numeric id).
   */
  greetingHeading:
    '{{greeting}}, ::placeholder{type="CustomField" name="{{firstNameLabel}}" value="{{firstNameId}}" original="[CustomField:{{firstNameId}}]"}',

  /** Intro paragraph — caller-supplied. */
  intro: '{{intro}}',

  /**
   * Hero heading wrapping the order ref with optional prefix/suffix
   * text. The builder pre-computes `prefix`/`suffix` with a trailing
   * space and leading space respectively (or empty strings).
   *
   * Params: `prefix`, `suffix`, `orderRefName`, `orderRefId`.
   */
  heroHeading:
    '{{prefix}}::placeholder{type="CustomField" name="{{orderRefName}}" value="{{orderRefId}}" original="[CustomField:{{orderRefId}}]"}{{suffix}}',

  /**
   * Order-reference row: `{orderRefLabel}: <orderRef-atom>`.
   *
   * Params: `orderRefLabel` (caller), `orderRefName` (logical field),
   * `orderRefId` (numeric id).
   */
  orderRefRow:
    '{{orderRefLabel}}: ::placeholder{type="CustomField" name="{{orderRefName}}" value="{{orderRefId}}" original="[CustomField:{{orderRefId}}]"}',

  /** Order date row. Mirrors `orderRefRow`. */
  orderDateRow:
    '{{orderDateLabel}}: ::placeholder{type="CustomField" name="{{orderDateName}}" value="{{orderDateId}}" original="[CustomField:{{orderDateId}}]"}',

  /** Details box heading — caller-supplied. */
  detailsHeading: '{{detailsHeading}}',

  /** Payment method row. */
  paymentRow:
    '{{paymentLabel}}: ::placeholder{type="CustomField" name="{{paymentName}}" value="{{paymentId}}" original="[CustomField:{{paymentId}}]"}',

  /** Inline items row (fallback when no sub-fields are mapped). */
  inlineItemsRow:
    '{{itemsLabel}}: ::placeholder{type="CustomField" name="{{itemsName}}" value="{{itemsId}}" original="[CustomField:{{itemsId}}]"}',

  /** Total-in-details-box row (used when no financial summary). */
  totalRow:
    '{{totalLabel}}: ::placeholder{type="CustomField" name="{{totalName}}" value="{{totalId}}" original="[CustomField:{{totalId}}]"}',

  /** Inline shipping row (fallback when no extended address block). */
  inlineShippingRow:
    '{{shippingLabel}}: ::placeholder{type="CustomField" name="{{shippingName}}" value="{{shippingId}}" original="[CustomField:{{shippingId}}]"}',

  /** Optional line-items section heading — caller-supplied. */
  lineItemsHeading: '{{lineItemsHeading}}',

  /** Loop row: item name as a `::loop-value{…}` atom. */
  itemNameLine:
    '::loop-value{original="[LoopValue:{{nameKey}}]" value="{{nameKey}}" index="{{nameKey}}"}',

  /** Loop row: SKU label + loop-value. */
  itemSkuLine:
    '{{skuLabel}}::loop-value{original="[LoopValue:{{skuKey}}]" value="{{skuKey}}" index="{{skuKey}}"}',

  /** Loop row: quantity label + loop-value. */
  itemQtyLine:
    '{{qtyLabel}}::loop-value{original="[LoopValue:{{qtyKey}}]" value="{{qtyKey}}" index="{{qtyKey}}"}',

  /** Loop row: unit-price label + loop-value. */
  itemUnitPriceLine:
    '{{unitPriceLabel}}::loop-value{original="[LoopValue:{{unitPriceKey}}]" value="{{unitPriceKey}}" index="{{unitPriceKey}}"}',

  /** Loop row: item-subtotal label + loop-value. */
  itemSubtotalLine:
    '{{subtotalLabel}}::loop-value{original="[LoopValue:{{subtotalKey}}]" value="{{subtotalKey}}" index="{{subtotalKey}}"}',

  /** Financial summary rows. */
  subtotalRow:
    '{{subtotalLabel}}: ::placeholder{type="CustomField" name="{{subtotalName}}" value="{{subtotalId}}" original="[CustomField:{{subtotalId}}]"}',
  discountRow:
    '{{discountLabel}}: ::placeholder{type="CustomField" name="{{discountName}}" value="{{discountId}}" original="[CustomField:{{discountId}}]"}',
  taxRow:
    '{{taxLabel}}: ::placeholder{type="CustomField" name="{{taxName}}" value="{{taxId}}" original="[CustomField:{{taxId}}]"}',
  shippingCostRow:
    '{{shippingCostLabel}}: ::placeholder{type="CustomField" name="{{shippingCostName}}" value="{{shippingCostId}}" original="[CustomField:{{shippingCostId}}]"}',

  /** Shipping address block. */
  shippingAddressHeading: '{{heading}}',
  shippingAddressLine:
    '::placeholder{type="CustomField" name="{{addressName}}" value="{{addressId}}" original="[CustomField:{{addressId}}]"}',
  shippingAddress2Line:
    '::placeholder{type="CustomField" name="{{address2Name}}" value="{{address2Id}}" original="[CustomField:{{address2Id}}]"}',
  shippingZipLine:
    '::placeholder{type="CustomField" name="{{zipName}}" value="{{zipId}}" original="[CustomField:{{zipId}}]"}',
  shippingCityLine:
    '::placeholder{type="CustomField" name="{{cityName}}" value="{{cityId}}" original="[CustomField:{{cityId}}]"}',
  shippingCountryCodeLine:
    '::placeholder{type="CustomField" name="{{countryName}}" value="{{countryId}}" original="[CustomField:{{countryId}}]"}',

  /** Primary CTA button label — caller-supplied. */
  ctaButton: '{{ctaButton}}',

  /** Footer link row (see order-cancellation for the shape). */
  footerLinks:
    ':font[:link[{{viewInBrowserText}}]{href="[Link:WebBrowser]" target="_blank" no-tracked="true"}]{font-size="{{fontSize}}" text-decoration="underline" color="{{textColor}}"} :font[|]{font-size="{{fontSize}}" color="{{textColor}}"} :font[:link[{{unsubscribeText}}]{href="[Link:Unsubscribe]" target="_blank" no-tracked="true"}]{font-size="{{fontSize}}" text-decoration="underline" color="{{textColor}}"}',

  /** Fixed "Certified by Rule" footer attribution. */
  certifiedByRule: 'Certified by Rule',
} as const
