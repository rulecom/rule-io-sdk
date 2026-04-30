/**
 * E-commerce Email Templates
 *
 * Pre-built templates for online stores: order confirmations,
 * shipping updates, abandoned cart recovery, and cancellations.
 *
 * All text and configuration must be provided by the consumer —
 * no hardcoded defaults for any specific business.
 *
 * Note: Line-item labels (e.g. "Qty: ", "Price: ", "SKU: ") default to
 * English when not overridden via the `text` config. The footer section
 * also defaults to English link text ("View in browser", "Unsubscribe")
 * when no `footer` config is provided. Pass the corresponding config
 * fields to override with your own locale.
 */

import { RuleConfigError, sanitizeUrl } from '@rule-io/core';
import type { CustomFieldMap, EmailTheme, FooterConfig } from '@rule-io/core';
import {
  createColumnElement,
  createDividerElement,
  createSectionElement,
  createSocialChildElement,
  createSocialElement,
  type Json,
  type RcmlBodyChild,
  type RcmlDocument,
  type RcmlSection,
  type RcmlText,
} from '@rule-io/rcml';
import {
  accentBackground,
  addressBlock,
  brandHeading,
  brandLoop,
  brandText,
  buildThemedDocument,
  contentSection,
  ctaSection,
  docWithNodes,
  footerSection,
  greetingSection,
  loopFieldPlaceholder,
  maybeLogoSection,
  placeholder,
  statusTrackerSection,
  summaryRowsSection,
  textNode,
  validateRequiredFields,
  withTemplateContext,
  type BrandInlineNode as InlineNode,
} from '@rule-io/rcml';

/** Wrap a divider in a single-column section so it can sit at body level. */
function dividerSection(): RcmlBodyChild {
  return contentSection([createDividerElement({ attrs: { padding: '10px 0' } })], { padding: '0' });
}

/** Build a "label: value" RcmlText row, or undefined when either input is missing. */
function labeledRow(
  label: string | undefined,
  fieldName: string | undefined,
  customFields: CustomFieldMap,
): RcmlText | undefined {
  if (!label || !fieldName) return undefined;

  return brandText(
    docWithNodes([
      textNode(`${label}: `),
      placeholder(fieldName, customFields[fieldName]),
    ])
  );
}

// ============================================================================
// Order Confirmation Template
// ============================================================================

export interface OrderConfirmationConfig {
  theme: EmailTheme;
  customFields: CustomFieldMap;
  websiteUrl: string;
  footer?: FooterConfig;
  text: {
    preheader: string;
    greeting: string;
    intro: string;
    detailsHeading: string;
    orderRefLabel: string;
    itemsLabel?: string;
    totalLabel: string;
    shippingLabel?: string;
    ctaButton: string;
    /** Heading above the line items loop section */
    lineItemsHeading?: string;
    /** Label for quantity in line items (default: 'Qty: ') */
    itemQtyLabel?: string;
    /** Label for unit price in line items (default: 'Price: ') */
    itemUnitPriceLabel?: string;
    /** Label for subtotal in line items (default: 'Subtotal: ') */
    itemSubtotalLabel?: string;
    /** Label for SKU in line items (default: 'SKU: ') */
    itemSkuLabel?: string;
    /** Leading text for the hero heading (e.g. "Order") — rendered as "{prefix} {orderRef} {suffix}" */
    heroHeadingPrefix?: string;
    /** Trailing text for the hero heading (e.g. "confirmed") */
    heroHeadingSuffix?: string;
    /** Label for order date row (e.g. "Order date") */
    orderDateLabel?: string;
    /** Label for payment method row (e.g. "Payment") */
    paymentMethodLabel?: string;
    /** Label for financial summary subtotal row */
    subtotalLabel?: string;
    /** Label for financial summary tax row */
    taxLabel?: string;
    /** Label for financial summary discount row */
    discountLabel?: string;
    /** Label for financial summary shipping cost row */
    shippingCostLabel?: string;
    /** Heading above the shipping address block (e.g. "Shipping to") */
    shippingAddressHeading?: string;
  };
  fieldNames: {
    firstName: string;
    orderRef: string;
    totalPrice: string;
    items?: string;
    shippingAddress?: string;
    /** Line item sub-field: product name (enables rc-loop rendering) */
    itemName?: string;
    /** Line item sub-field: quantity */
    itemQuantity?: string;
    /** Line item sub-field: unit price */
    itemUnitPrice?: string;
    /** Line item sub-field: line total */
    itemTotal?: string;
    /** Line item sub-field: SKU */
    itemSku?: string;
    /** Order date custom field */
    orderDate?: string;
    /** Payment method custom field */
    paymentMethod?: string;
    /** Pre-tax subtotal */
    subtotal?: string;
    /** Tax amount */
    taxAmount?: string;
    /** Discount amount */
    discountAmount?: string;
    /** Shipping cost */
    shippingCost?: string;
    /** Shipping address line 2 */
    shippingAddress2?: string;
    /** Shipping city */
    shippingCity?: string;
    /** Shipping ZIP / postal code */
    shippingZip?: string;
    /** Shipping country code */
    shippingCountryCode?: string;
  };
}

/**
 * Create an order confirmation email template.
 *
 * @example
 * ```typescript
 * const email = createOrderConfirmationEmail({
 *   theme: myEmailTheme,
 *   customFields: myFields,
 *   websiteUrl: 'https://myshop.com',
 *   text: {
 *     preheader: 'Your order has been confirmed!',
 *     greeting: 'Hi',
 *     intro: 'Thank you for your order. Here are the details:',
 *     detailsHeading: 'Order Summary',
 *     orderRefLabel: 'Order',
 *     totalLabel: 'Total',
 *     ctaButton: 'View Order',
 *   },
 *   fieldNames: {
 *     firstName: 'Order.CustomerName',
 *     orderRef: 'Order.OrderRef',
 *     totalPrice: 'Order.Total',
 *   },
 * });
 * ```
 */
export function createOrderConfirmationEmail(config: OrderConfirmationConfig): RcmlDocument {
  const templateName = 'createOrderConfirmationEmail';

  return withTemplateContext(templateName, () => {
    const { theme, customFields, fieldNames, text } = config;

    const hasExtendedAddress = !!(
      fieldNames.shippingAddress2 ||
      fieldNames.shippingCity ||
      fieldNames.shippingZip ||
      fieldNames.shippingCountryCode
    );

    if (hasExtendedAddress && !fieldNames.shippingAddress) {
      throw new RuleConfigError(
        'fieldNames.shippingAddress is required when any of ' +
          'shippingAddress2, shippingCity, shippingZip, or shippingCountryCode is provided'
      );
    }

    // Key off fieldName + label pairs so a mapped field with no label doesn't
    // flip the summary on and silently relocate the total row.
    const hasFinancialSummary = !!(
      (fieldNames.subtotal && text.subtotalLabel) ||
      (fieldNames.discountAmount && text.discountLabel) ||
      (fieldNames.taxAmount && text.taxLabel) ||
      (fieldNames.shippingCost && text.shippingCostLabel)
    );
    const hasLineItemLoop = !!(fieldNames.items && fieldNames.itemName);
    const hasInlineItemsRow = !!(fieldNames.items && !fieldNames.itemName && text.itemsLabel);
    const hasInlineShippingRow = !hasExtendedAddress && !!text.shippingLabel && !!fieldNames.shippingAddress;
    const rendersShippingAddress = hasInlineShippingRow || (hasExtendedAddress && !!fieldNames.shippingAddress);
    const hasOrderMetaRow = !!(text.orderDateLabel && fieldNames.orderDate);
    const hasPaymentRow = !!(text.paymentMethodLabel && fieldNames.paymentMethod);

    // Only validate fields that will actually be rendered. Loop sub-fields
    // (itemName/Quantity/UnitPrice/Total/Sku) are JSON key names in the loop
    // body, not custom field paths — never validated here.
    const fieldsToValidate: Record<string, string> = {
      firstName: fieldNames.firstName,
      orderRef: fieldNames.orderRef,
      totalPrice: fieldNames.totalPrice,
    };

    if ((hasLineItemLoop || hasInlineItemsRow) && fieldNames.items) {
      fieldsToValidate.items = fieldNames.items;
    }

    if (rendersShippingAddress && fieldNames.shippingAddress) {
      fieldsToValidate.shippingAddress = fieldNames.shippingAddress;
    }

    if (hasExtendedAddress) {
      if (fieldNames.shippingAddress2) fieldsToValidate.shippingAddress2 = fieldNames.shippingAddress2;
      if (fieldNames.shippingCity) fieldsToValidate.shippingCity = fieldNames.shippingCity;
      if (fieldNames.shippingZip) fieldsToValidate.shippingZip = fieldNames.shippingZip;
      if (fieldNames.shippingCountryCode) fieldsToValidate.shippingCountryCode = fieldNames.shippingCountryCode;
    }

    if (hasOrderMetaRow && fieldNames.orderDate) fieldsToValidate.orderDate = fieldNames.orderDate;
    if (hasPaymentRow && fieldNames.paymentMethod) fieldsToValidate.paymentMethod = fieldNames.paymentMethod;
    if (fieldNames.subtotal && text.subtotalLabel) fieldsToValidate.subtotal = fieldNames.subtotal;
    if (fieldNames.discountAmount && text.discountLabel) fieldsToValidate.discountAmount = fieldNames.discountAmount;
    if (fieldNames.taxAmount && text.taxLabel) fieldsToValidate.taxAmount = fieldNames.taxAmount;
    if (fieldNames.shippingCost && text.shippingCostLabel) fieldsToValidate.shippingCost = fieldNames.shippingCost;
    // templateName omitted — withTemplateContext wraps the error with the prefix.
    validateRequiredFields(customFields, fieldsToValidate);

    const sections: RcmlBodyChild[] = [
      ...maybeLogoSection(theme),
      greetingSection(text.greeting, text.intro, fieldNames.firstName, customFields[fieldNames.firstName]),
    ];

    // Hero heading: "{prefix} {orderRef} {suffix}"
    if (text.heroHeadingPrefix || text.heroHeadingSuffix) {
      const heroNodes: InlineNode[] = [];

      if (text.heroHeadingPrefix) heroNodes.push(textNode(`${text.heroHeadingPrefix} `));
      heroNodes.push(placeholder(fieldNames.orderRef, customFields[fieldNames.orderRef]));
      if (text.heroHeadingSuffix) heroNodes.push(textNode(` ${text.heroHeadingSuffix}`));
      sections.push(
        contentSection(
          [brandHeading(docWithNodes(heroNodes), 1)],
          { padding: '10px 0' }
        )
      );
    }

    // Two-column order meta row (orderRef + orderDate) — shown instead of a single orderRef row when orderDate mapped
    if (hasOrderMetaRow) {
      sections.push(
        createSectionElement({
          attrs: { padding: '10px 0' },
          children: [
            createColumnElement({
              attrs: { width: '50%' },
              children: [
                brandText(
                  docWithNodes([
                    textNode(`${text.orderRefLabel}: `),
                    placeholder(fieldNames.orderRef, customFields[fieldNames.orderRef]),
                  ])
                ),
              ],
            }),
            createColumnElement({
              attrs: { width: '50%' },
              children: [
                brandText(
                  docWithNodes([
                    textNode(`${text.orderDateLabel}: `),
                    placeholder(fieldNames.orderDate!, customFields[fieldNames.orderDate!]),
                  ])
                ),
              ],
            }),
          ],
        })
      );
    }

    // Details box (brand background): heading + orderRef (if not in meta row) + optional payment + fallbacks
    const detailRows: RcmlText[] = [];

    if (!hasOrderMetaRow) {
      detailRows.push(
        brandText(
          docWithNodes([
            textNode(`${text.orderRefLabel}: `),
            placeholder(fieldNames.orderRef, customFields[fieldNames.orderRef]),
          ])
        )
      );
    }

    const paymentRow = labeledRow(text.paymentMethodLabel, fieldNames.paymentMethod, customFields);

    if (paymentRow) detailRows.push(paymentRow);

    // Backward-compat single-placeholder items row (when items mapped but no loop sub-fields)
    if (fieldNames.items && !fieldNames.itemName && text.itemsLabel) {
      detailRows.push(
        brandText(
          docWithNodes([
            textNode(`${text.itemsLabel}: `),
            placeholder(fieldNames.items, customFields[fieldNames.items]),
          ])
        )
      );
    }

    // Total row stays here when no separate financial summary is rendered
    if (!hasFinancialSummary) {
      detailRows.push(
        brandText(
          docWithNodes([
            textNode(`${text.totalLabel}: `),
            placeholder(fieldNames.totalPrice, customFields[fieldNames.totalPrice]),
          ])
        )
      );
    }

    // Inline shipping row stays when no extended address fields mapped (backward compat)
    if (!hasExtendedAddress && text.shippingLabel && fieldNames.shippingAddress) {
      detailRows.push(
        brandText(
          docWithNodes([
            textNode(`${text.shippingLabel}: `),
            placeholder(fieldNames.shippingAddress, customFields[fieldNames.shippingAddress]),
          ])
        )
      );
    }

    sections.push(
      contentSection(
        [
          brandHeading(docWithNodes([textNode(text.detailsHeading)]), 2),
          ...detailRows,
        ],
        { padding: '20px 0', backgroundColor: accentBackground(theme) }
      )
    );

    // Divider before line items
    if (hasLineItemLoop) sections.push(dividerSection());

    // Line items loop
    if (hasLineItemLoop && fieldNames.items && fieldNames.itemName) {
      if (text.lineItemsHeading) {
        sections.push(
          contentSection(
            [brandHeading(docWithNodes([textNode(text.lineItemsHeading)]), 2)],
            { padding: '10px 0' }
          )
        );
      }

      const loopChildren: RcmlText[] = [
        brandText(docWithNodes([loopFieldPlaceholder(fieldNames.itemName)])),
      ];

      if (fieldNames.itemSku) {
        loopChildren.push(
          brandText(
            docWithNodes([
              textNode(text.itemSkuLabel ?? 'SKU: '),
              loopFieldPlaceholder(fieldNames.itemSku),
            ])
          )
        );
      }

      if (fieldNames.itemQuantity) {
        loopChildren.push(
          brandText(
            docWithNodes([
              textNode(text.itemQtyLabel ?? 'Qty: '),
              loopFieldPlaceholder(fieldNames.itemQuantity),
            ])
          )
        );
      }

      if (fieldNames.itemUnitPrice) {
        loopChildren.push(
          brandText(
            docWithNodes([
              textNode(text.itemUnitPriceLabel ?? 'Price: '),
              loopFieldPlaceholder(fieldNames.itemUnitPrice),
            ])
          )
        );
      }

      if (fieldNames.itemTotal) {
        loopChildren.push(
          brandText(
            docWithNodes([
              textNode(text.itemSubtotalLabel ?? 'Subtotal: '),
              loopFieldPlaceholder(fieldNames.itemTotal),
            ])
          )
        );
      }

      sections.push(
        brandLoop(
          customFields[fieldNames.items],
          [contentSection(loopChildren, { padding: '10px 0' }) as RcmlSection],
          { maxIterations: 20 }
        )
      );
    }

    // Financial summary box
    if (hasFinancialSummary) {
      sections.push(dividerSection());
      const summary = summaryRowsSection(
        [
          labeledRow(text.subtotalLabel, fieldNames.subtotal, customFields),
          labeledRow(text.discountLabel, fieldNames.discountAmount, customFields),
          labeledRow(text.taxLabel, fieldNames.taxAmount, customFields),
          labeledRow(text.shippingCostLabel, fieldNames.shippingCost, customFields),
          brandText(
            docWithNodes([
              textNode(`${text.totalLabel}: `),
              placeholder(fieldNames.totalPrice, customFields[fieldNames.totalPrice]),
            ])
          ),
        ],
        { padding: '20px 0', backgroundColor: accentBackground(theme) }
      );

      if (summary) sections.push(summary);
    }

    // Shipping address block
    if (hasExtendedAddress && fieldNames.shippingAddress) {
      sections.push(dividerSection());
      const addressLines: Json[] = [];

      addressLines.push(
        docWithNodes([
          placeholder(fieldNames.shippingAddress, customFields[fieldNames.shippingAddress]),
        ])
      );

      if (fieldNames.shippingAddress2) {
        addressLines.push(
          docWithNodes([
            placeholder(fieldNames.shippingAddress2, customFields[fieldNames.shippingAddress2]),
          ])
        );
      }

      if (fieldNames.shippingCity || fieldNames.shippingZip) {
        const cityZipNodes: InlineNode[] = [];

        if (fieldNames.shippingZip) {
          cityZipNodes.push(placeholder(fieldNames.shippingZip, customFields[fieldNames.shippingZip]));
        }

        if (fieldNames.shippingZip && fieldNames.shippingCity) {
          cityZipNodes.push(textNode(' '));
        }

        if (fieldNames.shippingCity) {
          cityZipNodes.push(placeholder(fieldNames.shippingCity, customFields[fieldNames.shippingCity]));
        }

        addressLines.push(docWithNodes(cityZipNodes));
      }

      if (fieldNames.shippingCountryCode) {
        addressLines.push(
          docWithNodes([
            placeholder(fieldNames.shippingCountryCode, customFields[fieldNames.shippingCountryCode]),
          ])
        );
      }

      const addressBlockSection = addressBlock({
        heading: text.shippingAddressHeading ?? text.shippingLabel,
        lines: addressLines,
      });

      if (addressBlockSection) sections.push(addressBlockSection);
    }

    sections.push(
      ctaSection(text.ctaButton, config.websiteUrl),
      footerSection(config.footer),
    );

    return buildThemedDocument(theme, sections, text.preheader);
  });
}

// ============================================================================
// Shipping Update Template
// ============================================================================

export interface ShippingUpdateConfig {
  theme: EmailTheme;
  customFields: CustomFieldMap;
  trackingUrl: string;
  footer?: FooterConfig;
  text: {
    preheader: string;
    heading: string;
    greeting: string;
    message: string;
    orderRefLabel: string;
    trackingLabel?: string;
    estimatedDeliveryLabel?: string;
    ctaButton: string;

    // Receipt fields (all optional — extend shipping update into a legal receipt)
    /** Label for order date row */
    orderDateLabel?: string;
    /** Label for customer email row */
    customerEmailLabel?: string;
    /** Label for billing address row */
    billingAddressLabel?: string;
    /** Label for payment method row */
    paymentMethodLabel?: string;
    /** Label for company name row */
    companyLabel?: string;
    /** Label for VAT/tax ID row */
    vatLabel?: string;
    /** Label for shipping carrier row */
    carrierLabel?: string;
    /** Label for shipping address row */
    shippingAddressLabel?: string;
    /** Label for shipping cost row */
    shippingCostLabel?: string;
    /** Heading for the line items section */
    lineItemsHeading?: string;
    /** Label for SKU in line items (default: 'SKU: ') */
    itemSkuLabel?: string;
    /** Label for quantity in line items (default: 'Qty: ') */
    itemQtyLabel?: string;
    /** Label for unit price in line items (default: 'Unit price: ') */
    itemUnitPriceLabel?: string;
    /** Label for line total in line items (default: 'Line total: ') */
    itemLineTotalLabel?: string;
    /** Label for subtotal row */
    subtotalLabel?: string;
    /** Label for tax row */
    taxLabel?: string;
    /** Label for discount row */
    discountLabel?: string;
    /** Label for total row */
    totalLabel?: string;
    /** Legal receipt confirmation text */
    legalText?: string;
    /** Return policy link text */
    returnPolicyText?: string;
    /** Return policy URL */
    returnPolicyUrl?: string;
    /** Terms and conditions link text */
    termsText?: string;
    /** Terms and conditions URL */
    termsUrl?: string;
    /** Label for the "confirmed" step of the status tracker */
    statusConfirmedLabel?: string;
    /** Label for the "shipped" step of the status tracker */
    statusShippedLabel?: string;
    /** Label for the "delivered" step of the status tracker */
    statusDeliveredLabel?: string;
  };
  fieldNames: {
    firstName: string;
    orderRef: string;
    trackingNumber?: string;
    estimatedDelivery?: string;

    // Receipt fields (all optional)
    /** Full customer name for legal identification */
    customerFullName?: string;
    /** Customer email */
    customerEmail?: string;
    /** Order/transaction date */
    orderDate?: string;
    /** Billing address */
    billingAddress?: string;
    /** Seller company name */
    companyName?: string;
    /** VAT/tax registration number */
    vatNumber?: string;
    /** Payment method used */
    paymentMethod?: string;
    /** Currency code */
    currency?: string;
    /** Pre-tax subtotal */
    subtotal?: string;
    /** Tax amount */
    taxAmount?: string;
    /** Discount amount */
    discountAmount?: string;
    /** Shipping cost */
    shippingCost?: string;
    /** Shipping address */
    shippingAddress?: string;
    /** Shipping carrier */
    shippingCarrier?: string;
    /** Order total */
    totalPrice?: string;
    /** Repeatable items field (for rc-loop) */
    items?: string;
    /** Line item: product name */
    itemName?: string;
    /** Line item: quantity */
    itemQuantity?: string;
    /** Line item: unit price */
    itemUnitPrice?: string;
    /** Line item: line total */
    itemTotal?: string;
    /** Line item: SKU */
    itemSku?: string;
  };
}

/**
 * Create a shipping update email template.
 *
 * When only the base fields are provided, renders a lightweight shipping
 * notification. When receipt fields are provided (seller info, line items,
 * financial summary, legal text), renders a full legally-binding receipt.
 */
export function createShippingUpdateEmail(config: ShippingUpdateConfig): RcmlDocument {
  const templateName = 'createShippingUpdateEmail';

  return withTemplateContext(templateName, () => {
    const { customFields, fieldNames, text } = config;

    // Only validate fields that will actually be rendered. Every detail row
    // renders through `detailRow(label, fieldName)` which skips silently when
    // either side is missing — validating unconditionally would force the
    // caller to provide customFields entries for placeholders that never
    // appear in the output. Loop sub-fields (itemName/Quantity/UnitPrice/
    // Total/Sku) are JSON key names in the loop body, not custom field paths,
    // so they are never validated here.
    const fieldsToValidate: Record<string, string> = {
      firstName: fieldNames.firstName,
      orderRef: fieldNames.orderRef,
    };

    if (text.trackingLabel && fieldNames.trackingNumber) fieldsToValidate.trackingNumber = fieldNames.trackingNumber;
    if (text.estimatedDeliveryLabel && fieldNames.estimatedDelivery) fieldsToValidate.estimatedDelivery = fieldNames.estimatedDelivery;
    if (text.orderDateLabel && fieldNames.orderDate) fieldsToValidate.orderDate = fieldNames.orderDate;
    if (text.customerEmailLabel && fieldNames.customerEmail) fieldsToValidate.customerEmail = fieldNames.customerEmail;
    if (text.billingAddressLabel && fieldNames.billingAddress) fieldsToValidate.billingAddress = fieldNames.billingAddress;
    if (text.paymentMethodLabel && fieldNames.paymentMethod) fieldsToValidate.paymentMethod = fieldNames.paymentMethod;
    if (text.companyLabel && fieldNames.companyName) fieldsToValidate.companyName = fieldNames.companyName;
    if (text.vatLabel && fieldNames.vatNumber) fieldsToValidate.vatNumber = fieldNames.vatNumber;
    if (text.carrierLabel && fieldNames.shippingCarrier) fieldsToValidate.shippingCarrier = fieldNames.shippingCarrier;
    if (text.shippingAddressLabel && fieldNames.shippingAddress) fieldsToValidate.shippingAddress = fieldNames.shippingAddress;
    if (text.subtotalLabel && fieldNames.subtotal) fieldsToValidate.subtotal = fieldNames.subtotal;
    if (text.taxLabel && fieldNames.taxAmount) fieldsToValidate.taxAmount = fieldNames.taxAmount;
    if (text.discountLabel && fieldNames.discountAmount) fieldsToValidate.discountAmount = fieldNames.discountAmount;
    if (text.shippingCostLabel && fieldNames.shippingCost) fieldsToValidate.shippingCost = fieldNames.shippingCost;
    if (text.totalLabel && fieldNames.totalPrice) fieldsToValidate.totalPrice = fieldNames.totalPrice;
    // customerFullName renders unconditionally when mapped (no label gate).
    if (fieldNames.customerFullName) fieldsToValidate.customerFullName = fieldNames.customerFullName;
    // Line items loop renders when both items + itemName are mapped.
    if (fieldNames.items && fieldNames.itemName) fieldsToValidate.items = fieldNames.items;
    // templateName omitted — withTemplateContext wraps the error with the prefix.
    validateRequiredFields(customFields, fieldsToValidate);

    /** Helper to create a detail row from an optional field + label pair. */
    const detailRow = (label: string | undefined, fieldName: string | undefined) => {
      if (!label || !fieldName) return undefined;

      return brandText(
        docWithNodes([
          textNode(`${label}: `),
          placeholder(fieldName, customFields[fieldName]),
        ])
      );
    };

    const sections: RcmlBodyChild[] = [
      ...maybeLogoSection(config.theme),

      // Heading + greeting
      contentSection(
        [
          brandHeading(docWithNodes([textNode(text.heading)])),
          brandText(
            docWithNodes([
              textNode(`${text.greeting} `),
              placeholder(fieldNames.firstName, customFields[fieldNames.firstName]),
              textNode(', '),
              textNode(text.message),
            ])
          ),
        ],
        { padding: '20px 0' }
      ),
    ];

    // Three-step status tracker (Confirmed → Shipped → Delivered), Shipped is active.
    // Rendered only when all three labels are supplied; otherwise omitted entirely.
    if (text.statusConfirmedLabel && text.statusShippedLabel && text.statusDeliveredLabel) {
      sections.push(
        statusTrackerSection({
          steps: [
            { label: text.statusConfirmedLabel },
            { label: text.statusShippedLabel },
            { label: text.statusDeliveredLabel },
          ],
          activeIndex: 1,
          theme: config.theme,
        })
      );
      sections.push(dividerSection());
    }

    // Seller info section (company, VAT)
    const sellerRows = [
      detailRow(text.companyLabel, fieldNames.companyName),
      detailRow(text.vatLabel, fieldNames.vatNumber),
    ].filter(Boolean) as ReturnType<typeof brandText>[];

    if (sellerRows.length > 0) {
      sections.push(contentSection(sellerRows, { padding: '10px 0' }));
    }

    // Order details section
    const orderDetailRows = [
      detailRow(text.orderRefLabel, fieldNames.orderRef),
      detailRow(text.orderDateLabel, fieldNames.orderDate),
      detailRow(text.paymentMethodLabel, fieldNames.paymentMethod),
      detailRow(text.customerEmailLabel, fieldNames.customerEmail),
    ].filter(Boolean) as ReturnType<typeof brandText>[];

    if (orderDetailRows.length > 0) {
      sections.push(
        contentSection(orderDetailRows, {
          padding: '20px 0',
          backgroundColor: accentBackground(config.theme),
        })
      );
    }

    // Shipping details section
    const shippingRows = [
      detailRow(text.shippingAddressLabel, fieldNames.shippingAddress),
      detailRow(text.carrierLabel, fieldNames.shippingCarrier),
      detailRow(text.trackingLabel, fieldNames.trackingNumber),
      detailRow(text.estimatedDeliveryLabel, fieldNames.estimatedDelivery),
    ].filter(Boolean) as ReturnType<typeof brandText>[];

    if (shippingRows.length > 0) {
      sections.push(contentSection(shippingRows, { padding: '20px 0' }));
    }

    // Track shipment button
    sections.push(ctaSection(text.ctaButton, config.trackingUrl));

    // Line items loop
    if (fieldNames.items && fieldNames.itemName) {
      const loopChildren: ReturnType<typeof brandText>[] = [
        brandText(
          docWithNodes([
            loopFieldPlaceholder(fieldNames.itemName),
          ])
        ),
      ];

      if (fieldNames.itemSku) {
        loopChildren.push(
          brandText(
            docWithNodes([
              textNode(text.itemSkuLabel ?? 'SKU: '),
              loopFieldPlaceholder(fieldNames.itemSku),
            ])
          )
        );
      }

      if (fieldNames.itemQuantity) {
        loopChildren.push(
          brandText(
            docWithNodes([
              textNode(text.itemQtyLabel ?? 'Qty: '),
              loopFieldPlaceholder(fieldNames.itemQuantity),
            ])
          )
        );
      }

      if (fieldNames.itemUnitPrice) {
        loopChildren.push(
          brandText(
            docWithNodes([
              textNode(text.itemUnitPriceLabel ?? 'Unit price: '),
              loopFieldPlaceholder(fieldNames.itemUnitPrice),
            ])
          )
        );
      }

      if (fieldNames.itemTotal) {
        loopChildren.push(
          brandText(
            docWithNodes([
              textNode(text.itemLineTotalLabel ?? 'Line total: '),
              loopFieldPlaceholder(fieldNames.itemTotal),
            ])
          )
        );
      }

      if (text.lineItemsHeading) {
        sections.push(
          contentSection(
            [brandHeading(docWithNodes([textNode(text.lineItemsHeading)]), 2)],
            { padding: '10px 0' }
          )
        );
      }

      sections.push(
        brandLoop(
          customFields[fieldNames.items],
          [contentSection(loopChildren, { padding: '10px 0' }) as RcmlSection],
          { maxIterations: 20 }
        )
      );
    }

    // Financial summary section
    const financialRows = [
      detailRow(text.subtotalLabel, fieldNames.subtotal),
      detailRow(text.discountLabel, fieldNames.discountAmount),
      detailRow(text.taxLabel, fieldNames.taxAmount),
      detailRow(text.shippingCostLabel, fieldNames.shippingCost),
      detailRow(text.totalLabel, fieldNames.totalPrice),
    ].filter(Boolean) as ReturnType<typeof brandText>[];

    if (financialRows.length > 0) {
      sections.push(
        contentSection(financialRows, {
          padding: '20px 0',
          backgroundColor: accentBackground(config.theme),
        })
      );
    }

    // Buyer details section
    const buyerRows = [
      detailRow(text.billingAddressLabel, fieldNames.billingAddress),
    ].filter(Boolean) as ReturnType<typeof brandText>[];

    if (fieldNames.customerFullName) {
      buyerRows.unshift(
        brandText(
          docWithNodes([
            placeholder(fieldNames.customerFullName, customFields[fieldNames.customerFullName]),
          ])
        )
      );
    }

    if (buyerRows.length > 0) {
      sections.push(contentSection(buyerRows, { padding: '10px 0' }));
    }

    // Legal section
    const legalChildren: ReturnType<typeof brandText>[] = [];

    if (text.legalText) {
      legalChildren.push(
        brandText(
          docWithNodes([textNode(text.legalText)]),
          { align: 'center' }
        )
      );
    }

    if (text.returnPolicyText && text.returnPolicyUrl) {
      const safeReturnPolicyUrl = sanitizeUrl(text.returnPolicyUrl);

      if (safeReturnPolicyUrl) {
        legalChildren.push(
          brandText({
            type: 'doc',
            content: [{
              type: 'paragraph',
              content: [{
                type: 'text',
                text: text.returnPolicyText,
                marks: [{
                  type: 'link',
                  attrs: { href: safeReturnPolicyUrl, target: '_blank' },
                }],
              }],
            }],
          } as unknown as Json, { align: 'center' })
        );
      }
    }

    if (text.termsText && text.termsUrl) {
      const safeTermsUrl = sanitizeUrl(text.termsUrl);

      if (safeTermsUrl) {
        legalChildren.push(
          brandText({
            type: 'doc',
            content: [{
              type: 'paragraph',
              content: [{
                type: 'text',
                text: text.termsText,
                marks: [{
                  type: 'link',
                  attrs: { href: safeTermsUrl, target: '_blank' },
                }],
              }],
            }],
          } as unknown as Json, { align: 'center' })
        );
      }
    }

    if (legalChildren.length > 0) {
      sections.push(contentSection(legalChildren, { padding: '10px 0' }));
    }

    // Footer
    sections.push(footerSection(config.footer));

    return buildThemedDocument(config.theme, sections, text.preheader);
  });
}

// ============================================================================
// Abandoned Cart Template
// ============================================================================

export interface AbandonedCartConfig {
  theme: EmailTheme;
  customFields: CustomFieldMap;
  cartUrl: string;
  footer?: FooterConfig;
  text: {
    preheader: string;
    greeting: string;
    message: string;
    reminder: string;
    ctaButton: string;
    /** Heading above the line items loop section */
    lineItemsHeading?: string;
    /** Label for quantity in line items (default: 'Qty: ') */
    itemQtyLabel?: string;
    /** Label for unit price in line items (default: 'Price: ') */
    itemUnitPriceLabel?: string;
    /** Label for SKU in line items (default: 'SKU: ') */
    itemSkuLabel?: string;
    /** Label for the cart total row */
    totalLabel?: string;
  };
  fieldNames: {
    firstName: string;
    /** Repeatable items field (enables rc-loop rendering) */
    items?: string;
    /** Line item sub-field: product name */
    itemName?: string;
    /** Line item sub-field: quantity */
    itemQuantity?: string;
    /** Line item sub-field: unit price */
    itemUnitPrice?: string;
    /** Line item sub-field: SKU */
    itemSku?: string;
    /** Cart total */
    totalPrice?: string;
  };
}

/**
 * Create an abandoned cart recovery email template.
 */
export function createAbandonedCartEmail(config: AbandonedCartConfig): RcmlDocument {
  const templateName = 'createAbandonedCartEmail';

  return withTemplateContext(templateName, () => {
    const { theme, customFields, fieldNames, text } = config;

    const hasLineItemLoop = !!(fieldNames.items && fieldNames.itemName);
    const hasTotalRow = !!(text.totalLabel && fieldNames.totalPrice);

    // Only validate fields that will actually be rendered. Loop sub-fields
    // (itemName/Quantity/UnitPrice/Sku) are JSON key names in the loop body,
    // not custom field paths — never validated here. `items` is validated only
    // when the loop will render, and `totalPrice` only when the total row
    // will render, so mapping either without its render partner does not
    // produce a misleading missing-field error.
    const fieldsToValidate: Record<string, string> = {
      firstName: fieldNames.firstName,
    };

    if (hasLineItemLoop && fieldNames.items) fieldsToValidate.items = fieldNames.items;
    if (hasTotalRow && fieldNames.totalPrice) fieldsToValidate.totalPrice = fieldNames.totalPrice;
    // templateName omitted — withTemplateContext wraps the error with the prefix.
    validateRequiredFields(customFields, fieldsToValidate);
    const socialElements = Object.values(theme.links)
      .filter((link): link is NonNullable<typeof link> => link !== undefined)
      .map((link) => {
        try {
          return createSocialChildElement({ attrs: { name: link.type, href: link.url } });
        } catch {
          return undefined;
        }
      })
      .filter((el): el is NonNullable<typeof el> => el !== undefined);
    const hasSocial = socialElements.length > 0;

    const sections: RcmlBodyChild[] = [
      ...maybeLogoSection(theme),

      contentSection(
        [
          brandHeading(
            docWithNodes([
              textNode(`${text.greeting} `),
              placeholder(fieldNames.firstName, customFields[fieldNames.firstName]),
              textNode('!'),
            ])
          ),
          brandText(
            docWithNodes([textNode(text.message)]),
            { align: 'center' }
          ),
          brandText(
            docWithNodes([textNode(text.reminder)]),
            { align: 'center' }
          ),
        ],
        { padding: '20px 0' }
      ),
    ];

    // Cart line items loop
    if (hasLineItemLoop && fieldNames.items && fieldNames.itemName) {
      sections.push(dividerSection());

      if (text.lineItemsHeading) {
        sections.push(
          contentSection(
            [brandHeading(docWithNodes([textNode(text.lineItemsHeading)]), 2)],
            { padding: '10px 0' }
          )
        );
      }

      const loopChildren: RcmlText[] = [
        brandText(docWithNodes([loopFieldPlaceholder(fieldNames.itemName)])),
      ];

      if (fieldNames.itemSku) {
        loopChildren.push(
          brandText(
            docWithNodes([
              textNode(text.itemSkuLabel ?? 'SKU: '),
              loopFieldPlaceholder(fieldNames.itemSku),
            ])
          )
        );
      }

      if (fieldNames.itemQuantity) {
        loopChildren.push(
          brandText(
            docWithNodes([
              textNode(text.itemQtyLabel ?? 'Qty: '),
              loopFieldPlaceholder(fieldNames.itemQuantity),
            ])
          )
        );
      }

      if (fieldNames.itemUnitPrice) {
        loopChildren.push(
          brandText(
            docWithNodes([
              textNode(text.itemUnitPriceLabel ?? 'Price: '),
              loopFieldPlaceholder(fieldNames.itemUnitPrice),
            ])
          )
        );
      }

      sections.push(
        brandLoop(
          customFields[fieldNames.items],
          [contentSection(loopChildren, { padding: '10px 0' }) as RcmlSection],
          { maxIterations: 20 }
        )
      );
    }

    // Cart total row
    if (hasTotalRow && fieldNames.totalPrice && text.totalLabel) {
      sections.push(dividerSection());
      const totalSection = summaryRowsSection(
        [
          brandText(
            docWithNodes([
              textNode(`${text.totalLabel}: `),
              placeholder(fieldNames.totalPrice, customFields[fieldNames.totalPrice]),
            ])
          ),
        ],
        { padding: '10px 0', backgroundColor: accentBackground(theme) }
      );

      if (totalSection) sections.push(totalSection);
    }

    sections.push(ctaSection(text.ctaButton, config.cartUrl));

    // Social icons when brand has any social link configured
    if (hasSocial) {
      sections.push(
        contentSection(
          [createSocialElement({ attrs: { align: 'center' }, children: socialElements })],
          { padding: '10px 0' }
        )
      );
    }

    sections.push(footerSection(config.footer));

    return buildThemedDocument(theme, sections, text.preheader);
  });
}

// ============================================================================
// Order Cancellation Template
// ============================================================================

export interface OrderCancellationConfig {
  theme: EmailTheme;
  customFields: CustomFieldMap;
  websiteUrl: string;
  footer?: FooterConfig;
  text: {
    preheader: string;
    heading: string;
    greeting: string;
    message: string;
    orderRefLabel: string;
    followUp: string;
    ctaButton: string;
    /** Label for optional order date row */
    orderDateLabel?: string;
    /** Optional support/refund callout text — rendered centered when supplied */
    supportText?: string;
    /** Optional support email — rendered as a mailto link beside supportText */
    supportEmail?: string;
    /** Optional support URL — rendered as a link beside supportText */
    supportUrl?: string;
  };
  fieldNames: {
    firstName: string;
    orderRef: string;
    /** Optional order date custom field */
    orderDate?: string;
  };
}

/**
 * Create an order cancellation email template.
 */
export function createOrderCancellationEmail(config: OrderCancellationConfig): RcmlDocument {
  const templateName = 'createOrderCancellationEmail';

  return withTemplateContext(templateName, () => {
    const { theme, customFields, fieldNames, text } = config;

    // Only validate fields that will actually be rendered. `orderDate` is
    // rendered via `labeledRow(text.orderDateLabel, ...)` which skips when
    // either side is missing, so it's only validated when both are set.
    const fieldsToValidate: Record<string, string> = {
      firstName: fieldNames.firstName,
      orderRef: fieldNames.orderRef,
    };

    if (text.orderDateLabel && fieldNames.orderDate) {
      fieldsToValidate.orderDate = fieldNames.orderDate;
    }

    // templateName omitted — withTemplateContext wraps the error with the prefix.
    validateRequiredFields(customFields, fieldsToValidate);

    const sections: RcmlBodyChild[] = [
      ...maybeLogoSection(theme),

      // Hero banner — brand background so the cancellation status reads as a banner
      contentSection(
        [brandHeading(docWithNodes([textNode(text.heading)]), 1)],
        { padding: '20px 0', backgroundColor: accentBackground(theme) }
      ),

      dividerSection(),

      // Body message
      contentSection(
        [
          brandText(
            docWithNodes([
              textNode(`${text.greeting} `),
              placeholder(fieldNames.firstName, customFields[fieldNames.firstName]),
              textNode(','),
            ])
          ),
          brandText(docWithNodes([textNode(text.message)])),
        ],
        { padding: '20px 0' }
      ),
    ];

    // Order details box
    const detailRows: (RcmlText | undefined)[] = [
      brandText(
        docWithNodes([
          textNode(`${text.orderRefLabel}: `),
          placeholder(fieldNames.orderRef, customFields[fieldNames.orderRef]),
        ])
      ),
      labeledRow(text.orderDateLabel, fieldNames.orderDate, customFields),
    ];
    const detailsSection = summaryRowsSection(detailRows, {
      padding: '20px 0',
      backgroundColor: accentBackground(theme),
    });

    if (detailsSection) sections.push(detailsSection);

    // Optional support callout (centered text + optional link)
    if (text.supportText) {
      const supportNodes: InlineNode[] = [
        textNode(text.supportText),
      ];
      // When both supportUrl and supportEmail are supplied, prefer the URL so
      // the displayed link text and href stay in sync.
      const safeSupportUrl = text.supportUrl ? sanitizeUrl(text.supportUrl) : undefined;
      let supportLinkHref: string | undefined;
      let supportLinkText: string | undefined;

      if (safeSupportUrl) {
        supportLinkHref = safeSupportUrl;
        supportLinkText = safeSupportUrl;
      } else if (text.supportEmail) {
        // Reject whitespace, control characters, or reserved URI characters
        // (?, #, &, /, :) so malformed input fails fast instead of producing
        // broken or parameter-injectable mailto links.
        if (!/^[^\s\x00-\x1F\x7F?#&/:]+@[^\s\x00-\x1F\x7F?#&/:]+$/.test(text.supportEmail)) {
          throw new RuleConfigError(
            `supportEmail "${text.supportEmail}" is not a valid email address`
          );
        }

        supportLinkHref = `mailto:${encodeURIComponent(text.supportEmail)}`;
        supportLinkText = text.supportEmail;
      }

      const supportChildren: RcmlText[] = [
        brandText(docWithNodes(supportNodes), { align: 'center' }),
      ];

      if (supportLinkHref && supportLinkText) {
        supportChildren.push(
          brandText(
            {
              type: 'doc',
              content: [{
                type: 'paragraph',
                content: [{
                  type: 'text',
                  text: supportLinkText,
                  marks: [{
                    type: 'link',
                    attrs: { href: supportLinkHref, target: '_blank' },
                  }],
                }],
              }],
            } as unknown as Json,
            { align: 'center' }
          )
        );
      }

      sections.push(dividerSection());
      sections.push(contentSection(supportChildren, { padding: '10px 0' }));
    }

    sections.push(dividerSection());

    // Follow-up copy
    sections.push(
      contentSection(
        [brandText(docWithNodes([textNode(text.followUp)]))],
        { padding: '10px 0' }
      )
    );

    sections.push(ctaSection(text.ctaButton, config.websiteUrl));
    sections.push(footerSection(config.footer));

    return buildThemedDocument(theme, sections, text.preheader);
  });
}
