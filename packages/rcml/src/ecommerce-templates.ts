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

import type { RCMLBodyChild, RCMLDocument, RCMLSection, RCMLText, RCMLProseMirrorDoc } from './types.js';
import {
  createBrandTemplate,
  createBrandHeading,
  createBrandText,
  createBrandLoop,
  createContentSection,
  createFooterSection,
  createPlaceholder,
  createLoopFieldPlaceholder,
  createTextNode,
  createDocWithPlaceholders,
  createLogoSection,
  createGreetingSection,
  createCtaSection,
  createSummaryRowsSection,
  createStatusTrackerSection,
  createAddressBlock,
  type BrandStyleConfig,
  type CustomFieldMap,
  type FooterConfig,
  validateCustomFields,
  withTemplateContext,
} from './brand-template.js';
import { createDivider, createSocial, createSocialElement, createTwoColumnSection } from './elements.js';
import { RuleConfigError } from '@rule-io/core';
import { sanitizeUrl } from './utils.js';

/** Wrap a divider in a single-column section so it can sit at body level. */
function dividerSection(): RCMLBodyChild {
  return createContentSection([createDivider({ padding: '10px 0' })], { padding: '0' });
}

/** Build a "label: value" RCMLText row, or undefined when either input is missing. */
function labeledRow(
  label: string | undefined,
  fieldName: string | undefined,
  customFields: CustomFieldMap,
): RCMLText | undefined {
  if (!label || !fieldName) return undefined;
  return createBrandText(
    createDocWithPlaceholders([
      createTextNode(`${label}: `),
      createPlaceholder(fieldName, customFields[fieldName]),
    ])
  );
}

// ============================================================================
// Order Confirmation Template
// ============================================================================

export interface OrderConfirmationConfig {
  brandStyle: BrandStyleConfig;
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
 *   brandStyle: myBrandStyle,
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
export function createOrderConfirmationEmail(config: OrderConfirmationConfig): RCMLDocument {
  const templateName = 'createOrderConfirmationEmail';

  return withTemplateContext(templateName, () => {
    const { brandStyle, customFields, fieldNames, text } = config;

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
    validateCustomFields(customFields, fieldsToValidate);

    const sections: RCMLBodyChild[] = [
      ...createLogoSection(brandStyle.logoUrl),
      createGreetingSection(text.greeting, text.intro, fieldNames.firstName, customFields[fieldNames.firstName]),
    ];

    // Hero heading: "{prefix} {orderRef} {suffix}"
    if (text.heroHeadingPrefix || text.heroHeadingSuffix) {
      const heroNodes: Parameters<typeof createDocWithPlaceholders>[0] = [];
      if (text.heroHeadingPrefix) heroNodes.push(createTextNode(`${text.heroHeadingPrefix} `));
      heroNodes.push(createPlaceholder(fieldNames.orderRef, customFields[fieldNames.orderRef]));
      if (text.heroHeadingSuffix) heroNodes.push(createTextNode(` ${text.heroHeadingSuffix}`));
      sections.push(
        createContentSection(
          [createBrandHeading(createDocWithPlaceholders(heroNodes), 1)],
          { padding: '10px 0' }
        )
      );
    }

    // Two-column order meta row (orderRef + orderDate) — shown instead of a single orderRef row when orderDate mapped
    if (hasOrderMetaRow) {
      sections.push(
        createTwoColumnSection({
          padding: '10px 0',
          leftChildren: [
            createBrandText(
              createDocWithPlaceholders([
                createTextNode(`${text.orderRefLabel}: `),
                createPlaceholder(fieldNames.orderRef, customFields[fieldNames.orderRef]),
              ])
            ),
          ],
          rightChildren: [
            createBrandText(
              createDocWithPlaceholders([
                createTextNode(`${text.orderDateLabel}: `),
                createPlaceholder(fieldNames.orderDate!, customFields[fieldNames.orderDate!]),
              ])
            ),
          ],
        })
      );
    }

    // Details box (brand background): heading + orderRef (if not in meta row) + optional payment + fallbacks
    const detailRows: RCMLText[] = [];
    if (!hasOrderMetaRow) {
      detailRows.push(
        createBrandText(
          createDocWithPlaceholders([
            createTextNode(`${text.orderRefLabel}: `),
            createPlaceholder(fieldNames.orderRef, customFields[fieldNames.orderRef]),
          ])
        )
      );
    }

    const paymentRow = labeledRow(text.paymentMethodLabel, fieldNames.paymentMethod, customFields);
    if (paymentRow) detailRows.push(paymentRow);

    // Backward-compat single-placeholder items row (when items mapped but no loop sub-fields)
    if (fieldNames.items && !fieldNames.itemName && text.itemsLabel) {
      detailRows.push(
        createBrandText(
          createDocWithPlaceholders([
            createTextNode(`${text.itemsLabel}: `),
            createPlaceholder(fieldNames.items, customFields[fieldNames.items]),
          ])
        )
      );
    }

    // Total row stays here when no separate financial summary is rendered
    if (!hasFinancialSummary) {
      detailRows.push(
        createBrandText(
          createDocWithPlaceholders([
            createTextNode(`${text.totalLabel}: `),
            createPlaceholder(fieldNames.totalPrice, customFields[fieldNames.totalPrice]),
          ])
        )
      );
    }

    // Inline shipping row stays when no extended address fields mapped (backward compat)
    if (!hasExtendedAddress && text.shippingLabel && fieldNames.shippingAddress) {
      detailRows.push(
        createBrandText(
          createDocWithPlaceholders([
            createTextNode(`${text.shippingLabel}: `),
            createPlaceholder(fieldNames.shippingAddress, customFields[fieldNames.shippingAddress]),
          ])
        )
      );
    }

    sections.push(
      createContentSection(
        [
          createBrandHeading(createDocWithPlaceholders([createTextNode(text.detailsHeading)]), 2),
          ...detailRows,
        ],
        { padding: '20px 0', backgroundColor: brandStyle.brandColor }
      )
    );

    // Divider before line items
    if (hasLineItemLoop) sections.push(dividerSection());

    // Line items loop
    if (hasLineItemLoop && fieldNames.items && fieldNames.itemName) {
      if (text.lineItemsHeading) {
        sections.push(
          createContentSection(
            [createBrandHeading(createDocWithPlaceholders([createTextNode(text.lineItemsHeading)]), 2)],
            { padding: '10px 0' }
          )
        );
      }

      const loopChildren: RCMLText[] = [
        createBrandText(createDocWithPlaceholders([createLoopFieldPlaceholder(fieldNames.itemName)])),
      ];
      if (fieldNames.itemSku) {
        loopChildren.push(
          createBrandText(
            createDocWithPlaceholders([
              createTextNode(text.itemSkuLabel ?? 'SKU: '),
              createLoopFieldPlaceholder(fieldNames.itemSku),
            ])
          )
        );
      }
      if (fieldNames.itemQuantity) {
        loopChildren.push(
          createBrandText(
            createDocWithPlaceholders([
              createTextNode(text.itemQtyLabel ?? 'Qty: '),
              createLoopFieldPlaceholder(fieldNames.itemQuantity),
            ])
          )
        );
      }
      if (fieldNames.itemUnitPrice) {
        loopChildren.push(
          createBrandText(
            createDocWithPlaceholders([
              createTextNode(text.itemUnitPriceLabel ?? 'Price: '),
              createLoopFieldPlaceholder(fieldNames.itemUnitPrice),
            ])
          )
        );
      }
      if (fieldNames.itemTotal) {
        loopChildren.push(
          createBrandText(
            createDocWithPlaceholders([
              createTextNode(text.itemSubtotalLabel ?? 'Subtotal: '),
              createLoopFieldPlaceholder(fieldNames.itemTotal),
            ])
          )
        );
      }

      sections.push(
        createBrandLoop(
          customFields[fieldNames.items],
          [createContentSection(loopChildren, { padding: '10px 0' }) as RCMLSection],
          { maxIterations: 20 }
        )
      );
    }

    // Financial summary box
    if (hasFinancialSummary) {
      sections.push(dividerSection());
      const summary = createSummaryRowsSection(
        [
          labeledRow(text.subtotalLabel, fieldNames.subtotal, customFields),
          labeledRow(text.discountLabel, fieldNames.discountAmount, customFields),
          labeledRow(text.taxLabel, fieldNames.taxAmount, customFields),
          labeledRow(text.shippingCostLabel, fieldNames.shippingCost, customFields),
          createBrandText(
            createDocWithPlaceholders([
              createTextNode(`${text.totalLabel}: `),
              createPlaceholder(fieldNames.totalPrice, customFields[fieldNames.totalPrice]),
            ])
          ),
        ],
        { padding: '20px 0', backgroundColor: brandStyle.brandColor }
      );
      if (summary) sections.push(summary);
    }

    // Shipping address block
    if (hasExtendedAddress && fieldNames.shippingAddress) {
      sections.push(dividerSection());
      const addressLines: RCMLProseMirrorDoc[] = [];
      addressLines.push(
        createDocWithPlaceholders([
          createPlaceholder(fieldNames.shippingAddress, customFields[fieldNames.shippingAddress]),
        ])
      );
      if (fieldNames.shippingAddress2) {
        addressLines.push(
          createDocWithPlaceholders([
            createPlaceholder(fieldNames.shippingAddress2, customFields[fieldNames.shippingAddress2]),
          ])
        );
      }
      if (fieldNames.shippingCity || fieldNames.shippingZip) {
        const cityZipNodes: Parameters<typeof createDocWithPlaceholders>[0] = [];
        if (fieldNames.shippingZip) {
          cityZipNodes.push(createPlaceholder(fieldNames.shippingZip, customFields[fieldNames.shippingZip]));
        }
        if (fieldNames.shippingZip && fieldNames.shippingCity) {
          cityZipNodes.push(createTextNode(' '));
        }
        if (fieldNames.shippingCity) {
          cityZipNodes.push(createPlaceholder(fieldNames.shippingCity, customFields[fieldNames.shippingCity]));
        }
        addressLines.push(createDocWithPlaceholders(cityZipNodes));
      }
      if (fieldNames.shippingCountryCode) {
        addressLines.push(
          createDocWithPlaceholders([
            createPlaceholder(fieldNames.shippingCountryCode, customFields[fieldNames.shippingCountryCode]),
          ])
        );
      }
      const addressBlock = createAddressBlock({
        heading: text.shippingAddressHeading ?? text.shippingLabel,
        lines: addressLines,
      });
      if (addressBlock) sections.push(addressBlock);
    }

    sections.push(
      createCtaSection(text.ctaButton, config.websiteUrl),
      createFooterSection(config.footer),
    );

    return createBrandTemplate({
      brandStyle: brandStyle,
      preheader: text.preheader,
      sections,
    });
  });
}

// ============================================================================
// Shipping Update Template
// ============================================================================

export interface ShippingUpdateConfig {
  brandStyle: BrandStyleConfig;
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
export function createShippingUpdateEmail(config: ShippingUpdateConfig): RCMLDocument {
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
    validateCustomFields(customFields, fieldsToValidate);

    /** Helper to create a detail row from an optional field + label pair. */
    const detailRow = (label: string | undefined, fieldName: string | undefined) => {
      if (!label || !fieldName) return undefined;
      return createBrandText(
        createDocWithPlaceholders([
          createTextNode(`${label}: `),
          createPlaceholder(fieldName, customFields[fieldName]),
        ])
      );
    };

    const sections: RCMLBodyChild[] = [
      ...createLogoSection(config.brandStyle.logoUrl),

      // Heading + greeting
      createContentSection(
        [
          createBrandHeading(createDocWithPlaceholders([createTextNode(text.heading)])),
          createBrandText(
            createDocWithPlaceholders([
              createTextNode(`${text.greeting} `),
              createPlaceholder(fieldNames.firstName, customFields[fieldNames.firstName]),
              createTextNode(', '),
              createTextNode(text.message),
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
        createStatusTrackerSection({
          steps: [
            { label: text.statusConfirmedLabel },
            { label: text.statusShippedLabel },
            { label: text.statusDeliveredLabel },
          ],
          activeIndex: 1,
          brandStyle: config.brandStyle,
        })
      );
      sections.push(dividerSection());
    }

    // Seller info section (company, VAT)
    const sellerRows = [
      detailRow(text.companyLabel, fieldNames.companyName),
      detailRow(text.vatLabel, fieldNames.vatNumber),
    ].filter(Boolean) as ReturnType<typeof createBrandText>[];

    if (sellerRows.length > 0) {
      sections.push(createContentSection(sellerRows, { padding: '10px 0' }));
    }

    // Order details section
    const orderDetailRows = [
      detailRow(text.orderRefLabel, fieldNames.orderRef),
      detailRow(text.orderDateLabel, fieldNames.orderDate),
      detailRow(text.paymentMethodLabel, fieldNames.paymentMethod),
      detailRow(text.customerEmailLabel, fieldNames.customerEmail),
    ].filter(Boolean) as ReturnType<typeof createBrandText>[];

    if (orderDetailRows.length > 0) {
      sections.push(
        createContentSection(orderDetailRows, {
          padding: '20px 0',
          backgroundColor: config.brandStyle.brandColor,
        })
      );
    }

    // Shipping details section
    const shippingRows = [
      detailRow(text.shippingAddressLabel, fieldNames.shippingAddress),
      detailRow(text.carrierLabel, fieldNames.shippingCarrier),
      detailRow(text.trackingLabel, fieldNames.trackingNumber),
      detailRow(text.estimatedDeliveryLabel, fieldNames.estimatedDelivery),
    ].filter(Boolean) as ReturnType<typeof createBrandText>[];

    if (shippingRows.length > 0) {
      sections.push(createContentSection(shippingRows, { padding: '20px 0' }));
    }

    // Track shipment button
    sections.push(createCtaSection(text.ctaButton, config.trackingUrl));

    // Line items loop
    if (fieldNames.items && fieldNames.itemName) {
      const loopChildren: ReturnType<typeof createBrandText>[] = [
        createBrandText(
          createDocWithPlaceholders([
            createLoopFieldPlaceholder(fieldNames.itemName),
          ])
        ),
      ];

      if (fieldNames.itemSku) {
        loopChildren.push(
          createBrandText(
            createDocWithPlaceholders([
              createTextNode(text.itemSkuLabel ?? 'SKU: '),
              createLoopFieldPlaceholder(fieldNames.itemSku),
            ])
          )
        );
      }

      if (fieldNames.itemQuantity) {
        loopChildren.push(
          createBrandText(
            createDocWithPlaceholders([
              createTextNode(text.itemQtyLabel ?? 'Qty: '),
              createLoopFieldPlaceholder(fieldNames.itemQuantity),
            ])
          )
        );
      }

      if (fieldNames.itemUnitPrice) {
        loopChildren.push(
          createBrandText(
            createDocWithPlaceholders([
              createTextNode(text.itemUnitPriceLabel ?? 'Unit price: '),
              createLoopFieldPlaceholder(fieldNames.itemUnitPrice),
            ])
          )
        );
      }

      if (fieldNames.itemTotal) {
        loopChildren.push(
          createBrandText(
            createDocWithPlaceholders([
              createTextNode(text.itemLineTotalLabel ?? 'Line total: '),
              createLoopFieldPlaceholder(fieldNames.itemTotal),
            ])
          )
        );
      }

      if (text.lineItemsHeading) {
        sections.push(
          createContentSection(
            [createBrandHeading(createDocWithPlaceholders([createTextNode(text.lineItemsHeading)]), 2)],
            { padding: '10px 0' }
          )
        );
      }

      sections.push(
        createBrandLoop(
          customFields[fieldNames.items],
          [createContentSection(loopChildren, { padding: '10px 0' }) as RCMLSection],
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
    ].filter(Boolean) as ReturnType<typeof createBrandText>[];

    if (financialRows.length > 0) {
      sections.push(
        createContentSection(financialRows, {
          padding: '20px 0',
          backgroundColor: config.brandStyle.brandColor,
        })
      );
    }

    // Buyer details section
    const buyerRows = [
      detailRow(text.billingAddressLabel, fieldNames.billingAddress),
    ].filter(Boolean) as ReturnType<typeof createBrandText>[];

    if (fieldNames.customerFullName) {
      buyerRows.unshift(
        createBrandText(
          createDocWithPlaceholders([
            createPlaceholder(fieldNames.customerFullName, customFields[fieldNames.customerFullName]),
          ])
        )
      );
    }

    if (buyerRows.length > 0) {
      sections.push(createContentSection(buyerRows, { padding: '10px 0' }));
    }

    // Legal section
    const legalChildren: ReturnType<typeof createBrandText>[] = [];

    if (text.legalText) {
      legalChildren.push(
        createBrandText(
          createDocWithPlaceholders([createTextNode(text.legalText)]),
          { align: 'center' }
        )
      );
    }

    if (text.returnPolicyText && text.returnPolicyUrl) {
      const safeReturnPolicyUrl = sanitizeUrl(text.returnPolicyUrl);
      if (safeReturnPolicyUrl) {
        legalChildren.push(
          createBrandText({
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
          }, { align: 'center' })
        );
      }
    }

    if (text.termsText && text.termsUrl) {
      const safeTermsUrl = sanitizeUrl(text.termsUrl);
      if (safeTermsUrl) {
        legalChildren.push(
          createBrandText({
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
          }, { align: 'center' })
        );
      }
    }

    if (legalChildren.length > 0) {
      sections.push(createContentSection(legalChildren, { padding: '10px 0' }));
    }

    // Footer
    sections.push(createFooterSection(config.footer));

    return createBrandTemplate({
      brandStyle: config.brandStyle,
      preheader: text.preheader,
      sections,
    });
  });
}

// ============================================================================
// Abandoned Cart Template
// ============================================================================

export interface AbandonedCartConfig {
  brandStyle: BrandStyleConfig;
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
export function createAbandonedCartEmail(config: AbandonedCartConfig): RCMLDocument {
  const templateName = 'createAbandonedCartEmail';

  return withTemplateContext(templateName, () => {
    const { brandStyle, customFields, fieldNames, text } = config;

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
    validateCustomFields(customFields, fieldsToValidate);
    const socialLinks = brandStyle.socialLinks ?? [];
    const socialElements = socialLinks
      .map((link) => {
        try {
          return createSocialElement({ name: link.name, href: link.href });
        } catch {
          return undefined;
        }
      })
      .filter((el): el is NonNullable<typeof el> => !!el);
    const hasSocial = socialElements.length > 0;

    const sections: RCMLBodyChild[] = [
      ...createLogoSection(brandStyle.logoUrl),

      createContentSection(
        [
          createBrandHeading(
            createDocWithPlaceholders([
              createTextNode(`${text.greeting} `),
              createPlaceholder(fieldNames.firstName, customFields[fieldNames.firstName]),
              createTextNode('!'),
            ])
          ),
          createBrandText(
            createDocWithPlaceholders([createTextNode(text.message)]),
            { align: 'center' }
          ),
          createBrandText(
            createDocWithPlaceholders([createTextNode(text.reminder)]),
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
          createContentSection(
            [createBrandHeading(createDocWithPlaceholders([createTextNode(text.lineItemsHeading)]), 2)],
            { padding: '10px 0' }
          )
        );
      }

      const loopChildren: RCMLText[] = [
        createBrandText(createDocWithPlaceholders([createLoopFieldPlaceholder(fieldNames.itemName)])),
      ];
      if (fieldNames.itemSku) {
        loopChildren.push(
          createBrandText(
            createDocWithPlaceholders([
              createTextNode(text.itemSkuLabel ?? 'SKU: '),
              createLoopFieldPlaceholder(fieldNames.itemSku),
            ])
          )
        );
      }
      if (fieldNames.itemQuantity) {
        loopChildren.push(
          createBrandText(
            createDocWithPlaceholders([
              createTextNode(text.itemQtyLabel ?? 'Qty: '),
              createLoopFieldPlaceholder(fieldNames.itemQuantity),
            ])
          )
        );
      }
      if (fieldNames.itemUnitPrice) {
        loopChildren.push(
          createBrandText(
            createDocWithPlaceholders([
              createTextNode(text.itemUnitPriceLabel ?? 'Price: '),
              createLoopFieldPlaceholder(fieldNames.itemUnitPrice),
            ])
          )
        );
      }

      sections.push(
        createBrandLoop(
          customFields[fieldNames.items],
          [createContentSection(loopChildren, { padding: '10px 0' }) as RCMLSection],
          { maxIterations: 20 }
        )
      );
    }

    // Cart total row
    if (hasTotalRow && fieldNames.totalPrice && text.totalLabel) {
      sections.push(dividerSection());
      const totalSection = createSummaryRowsSection(
        [
          createBrandText(
            createDocWithPlaceholders([
              createTextNode(`${text.totalLabel}: `),
              createPlaceholder(fieldNames.totalPrice, customFields[fieldNames.totalPrice]),
            ])
          ),
        ],
        { padding: '10px 0', backgroundColor: brandStyle.brandColor }
      );
      if (totalSection) sections.push(totalSection);
    }

    sections.push(createCtaSection(text.ctaButton, config.cartUrl));

    // Social icons when brand has any social link configured
    if (hasSocial) {
      sections.push(
        createContentSection(
          [createSocial(socialElements, { align: 'center' })],
          { padding: '10px 0' }
        )
      );
    }

    sections.push(createFooterSection(config.footer));

    return createBrandTemplate({
      brandStyle: brandStyle,
      preheader: text.preheader,
      sections,
    });
  });
}

// ============================================================================
// Order Cancellation Template
// ============================================================================

export interface OrderCancellationConfig {
  brandStyle: BrandStyleConfig;
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
export function createOrderCancellationEmail(config: OrderCancellationConfig): RCMLDocument {
  const templateName = 'createOrderCancellationEmail';

  return withTemplateContext(templateName, () => {
    const { brandStyle, customFields, fieldNames, text } = config;

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
    validateCustomFields(customFields, fieldsToValidate);

    const sections: RCMLBodyChild[] = [
      ...createLogoSection(brandStyle.logoUrl),

      // Hero banner — brand background so the cancellation status reads as a banner
      createContentSection(
        [createBrandHeading(createDocWithPlaceholders([createTextNode(text.heading)]), 1)],
        { padding: '20px 0', backgroundColor: brandStyle.brandColor }
      ),

      dividerSection(),

      // Body message
      createContentSection(
        [
          createBrandText(
            createDocWithPlaceholders([
              createTextNode(`${text.greeting} `),
              createPlaceholder(fieldNames.firstName, customFields[fieldNames.firstName]),
              createTextNode(','),
            ])
          ),
          createBrandText(createDocWithPlaceholders([createTextNode(text.message)])),
        ],
        { padding: '20px 0' }
      ),
    ];

    // Order details box
    const detailRows: (RCMLText | undefined)[] = [
      createBrandText(
        createDocWithPlaceholders([
          createTextNode(`${text.orderRefLabel}: `),
          createPlaceholder(fieldNames.orderRef, customFields[fieldNames.orderRef]),
        ])
      ),
      labeledRow(text.orderDateLabel, fieldNames.orderDate, customFields),
    ];
    const detailsSection = createSummaryRowsSection(detailRows, {
      padding: '20px 0',
      backgroundColor: brandStyle.brandColor,
    });
    if (detailsSection) sections.push(detailsSection);

    // Optional support callout (centered text + optional link)
    if (text.supportText) {
      const supportNodes: Parameters<typeof createDocWithPlaceholders>[0] = [
        createTextNode(text.supportText),
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
      const supportChildren: RCMLText[] = [
        createBrandText(createDocWithPlaceholders(supportNodes), { align: 'center' }),
      ];
      if (supportLinkHref && supportLinkText) {
        supportChildren.push(
          createBrandText(
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
            },
            { align: 'center' }
          )
        );
      }
      sections.push(dividerSection());
      sections.push(createContentSection(supportChildren, { padding: '10px 0' }));
    }

    sections.push(dividerSection());

    // Follow-up copy
    sections.push(
      createContentSection(
        [createBrandText(createDocWithPlaceholders([createTextNode(text.followUp)]))],
        { padding: '10px 0' }
      )
    );

    sections.push(createCtaSection(text.ctaButton, config.websiteUrl));
    sections.push(createFooterSection(config.footer));

    return createBrandTemplate({
      brandStyle: brandStyle,
      preheader: text.preheader,
      sections,
    });
  });
}
