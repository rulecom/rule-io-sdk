/**
 * Messages for the shipping-update template.
 *
 * Each text node in `shipping-update.xml` is a single
 * `{{t('key', { … })}}` call against one of these entries. Message
 * bodies embed the full sentence (including RFM atoms like
 * `::placeholder{…}` / `::loop-value{…}` / `:link[…]{…}` /
 * `:font[…]{…}`) with `{{placeholder}}` slots for dynamic parts
 * (field name, field id, loop key, caller-supplied label).
 *
 * @internal
 */

export const messages = {
  /** `<rc-preview>` body — caller-supplied preheader text. */
  preheader: '{{preheader}}',

  /** Top heading — caller-supplied. */
  heading: '{{heading}}',

  /**
   * Greeting paragraph: `{greeting} <firstName-atom>, {message}`.
   *
   * Params: `greeting` (caller), `message` (caller),
   * `firstNameLabel` (logical field), `firstNameId` (numeric id).
   */
  greetingLine:
    '{{greeting}} ::placeholder{type="CustomField" name="{{firstNameLabel}}" value="{{firstNameId}}" original="[CustomField:{{firstNameId}}]"}, {{message}}',

  /**
   * Status tracker step label — bold, coloured label inside one of
   * the three `<rc-column>` step cells.
   *
   * Params: `label` (caller-supplied step label), `fg` (foreground
   * colour pre-computed by the builder).
   */
  statusStepLabel: ':font[{{label}}]{color="{{fg}}" font-weight="700"}',

  /** Seller company-name row: `{companyLabel}: <companyName-atom>`. */
  companyRow:
    '{{companyLabel}}: ::placeholder{type="CustomField" name="{{companyName}}" value="{{companyId}}" original="[CustomField:{{companyId}}]"}',

  /** Seller VAT row: `{vatLabel}: <vatNumber-atom>`. */
  vatRow:
    '{{vatLabel}}: ::placeholder{type="CustomField" name="{{vatName}}" value="{{vatId}}" original="[CustomField:{{vatId}}]"}',

  /** Order-reference row. */
  orderRefRow:
    '{{orderRefLabel}}: ::placeholder{type="CustomField" name="{{orderRefName}}" value="{{orderRefId}}" original="[CustomField:{{orderRefId}}]"}',

  /** Order date row. */
  orderDateRow:
    '{{orderDateLabel}}: ::placeholder{type="CustomField" name="{{orderDateName}}" value="{{orderDateId}}" original="[CustomField:{{orderDateId}}]"}',

  /** Payment method row. */
  paymentRow:
    '{{paymentLabel}}: ::placeholder{type="CustomField" name="{{paymentName}}" value="{{paymentId}}" original="[CustomField:{{paymentId}}]"}',

  /** Customer-email row. */
  customerEmailRow:
    '{{emailLabel}}: ::placeholder{type="CustomField" name="{{emailName}}" value="{{emailId}}" original="[CustomField:{{emailId}}]"}',

  /** Shipping address row. */
  shippingAddressRow:
    '{{addressLabel}}: ::placeholder{type="CustomField" name="{{addressName}}" value="{{addressId}}" original="[CustomField:{{addressId}}]"}',

  /** Shipping carrier row. */
  carrierRow:
    '{{carrierLabel}}: ::placeholder{type="CustomField" name="{{carrierName}}" value="{{carrierId}}" original="[CustomField:{{carrierId}}]"}',

  /** Tracking number row. */
  trackingRow:
    '{{trackingLabel}}: ::placeholder{type="CustomField" name="{{trackingName}}" value="{{trackingId}}" original="[CustomField:{{trackingId}}]"}',

  /** Estimated delivery row. */
  estimatedDeliveryRow:
    '{{etaLabel}}: ::placeholder{type="CustomField" name="{{etaName}}" value="{{etaId}}" original="[CustomField:{{etaId}}]"}',

  /** Primary CTA button label — caller-supplied. */
  ctaButton: '{{ctaButton}}',

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

  /** Loop row: line-total label + loop-value. */
  itemLineTotalLine:
    '{{lineTotalLabel}}::loop-value{original="[LoopValue:{{lineTotalKey}}]" value="{{lineTotalKey}}" index="{{lineTotalKey}}"}',

  /** Financial summary rows. */
  subtotalRow:
    '{{subtotalLabel}}: ::placeholder{type="CustomField" name="{{subtotalName}}" value="{{subtotalId}}" original="[CustomField:{{subtotalId}}]"}',
  discountRow:
    '{{discountLabel}}: ::placeholder{type="CustomField" name="{{discountName}}" value="{{discountId}}" original="[CustomField:{{discountId}}]"}',
  taxRow:
    '{{taxLabel}}: ::placeholder{type="CustomField" name="{{taxName}}" value="{{taxId}}" original="[CustomField:{{taxId}}]"}',
  shippingCostRow:
    '{{shippingCostLabel}}: ::placeholder{type="CustomField" name="{{shippingCostName}}" value="{{shippingCostId}}" original="[CustomField:{{shippingCostId}}]"}',
  totalRow:
    '{{totalLabel}}: ::placeholder{type="CustomField" name="{{totalName}}" value="{{totalId}}" original="[CustomField:{{totalId}}]"}',

  /** Buyer: customer full name (bare atom, no label). */
  customerFullNameLine:
    '::placeholder{type="CustomField" name="{{nameField}}" value="{{nameId}}" original="[CustomField:{{nameId}}]"}',

  /** Billing address row. */
  billingAddressRow:
    '{{billingLabel}}: ::placeholder{type="CustomField" name="{{billingName}}" value="{{billingId}}" original="[CustomField:{{billingId}}]"}',

  /** Legal receipt confirmation text — caller-supplied. */
  legalText: '{{legalText}}',

  /** Return-policy link row. */
  returnPolicyLink: ':link[{{linkText}}]{href="{{linkHref}}" target="_blank"}',

  /** Terms-and-conditions link row. */
  termsLink: ':link[{{linkText}}]{href="{{linkHref}}" target="_blank"}',

  /** Footer link row (see order-cancellation for the shape). */
  footerLinks:
    ':font[:link[{{viewInBrowserText}}]{href="[Link:WebBrowser]" target="_blank" no-tracked="true"}]{font-size="{{fontSize}}" text-decoration="underline" color="{{textColor}}"} :font[|]{font-size="{{fontSize}}" color="{{textColor}}"} :font[:link[{{unsubscribeText}}]{href="[Link:Unsubscribe]" target="_blank" no-tracked="true"}]{font-size="{{fontSize}}" text-decoration="underline" color="{{textColor}}"}',

  /** Fixed "Certified by Rule" footer attribution. */
  certifiedByRule: 'Certified by Rule',
} as const
