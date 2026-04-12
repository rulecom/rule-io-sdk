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

import type { RCMLDocument, RCMLSection, RCMLLoop, RCMLSwitch } from '../types';
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
  type BrandStyleConfig,
  type CustomFieldMap,
  type FooterConfig,
  validateCustomFields,
  withTemplateContext,
} from './brand-template';
import { sanitizeUrl } from './utils';

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
  // Loop sub-fields are JSON key names, not custom field paths — skip validation for them
  const { itemName, itemQuantity, itemUnitPrice, itemTotal, ...regularFields } = config.fieldNames;
  validateCustomFields(config.customFields, regularFields, templateName);

  return withTemplateContext(templateName, () => {
    const { customFields, fieldNames, text } = config;

    const detailRows: ReturnType<typeof createBrandText>[] = [
      createBrandText(
        createDocWithPlaceholders([
          createTextNode(`${text.orderRefLabel}: `),
          createPlaceholder(fieldNames.orderRef, customFields[fieldNames.orderRef]),
        ])
      ),
    ];

    // Build line items section: use rc-loop if sub-fields provided, else single placeholder
    const hasLineItemFields = fieldNames.items && fieldNames.itemName;
    let lineItemsSection: RCMLSection | RCMLLoop | undefined;

    if (hasLineItemFields && fieldNames.items && fieldNames.itemName) {
      const loopChildren: ReturnType<typeof createBrandText>[] = [
        createBrandText(
          createDocWithPlaceholders([
            createLoopFieldPlaceholder(fieldNames.itemName),
          ])
        ),
      ];

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

      const lineItemsLoop = createBrandLoop(
        customFields[fieldNames.items],
        [createContentSection(loopChildren, { padding: '10px 0' }) as RCMLSection],
        { maxIterations: 20 }
      );

      lineItemsSection = lineItemsLoop;
    } else if (fieldNames.items && text.itemsLabel) {
      // Fallback: single placeholder for items field
      detailRows.push(
        createBrandText(
          createDocWithPlaceholders([
            createTextNode(`${text.itemsLabel}: `),
            createPlaceholder(fieldNames.items, customFields[fieldNames.items]),
          ])
        )
      );
    }

    detailRows.push(
      createBrandText(
        createDocWithPlaceholders([
          createTextNode(`${text.totalLabel}: `),
          createPlaceholder(fieldNames.totalPrice, customFields[fieldNames.totalPrice]),
        ])
      )
    );

    if (fieldNames.shippingAddress && text.shippingLabel) {
      detailRows.push(
        createBrandText(
          createDocWithPlaceholders([
            createTextNode(`${text.shippingLabel}: `),
            createPlaceholder(fieldNames.shippingAddress, customFields[fieldNames.shippingAddress]),
          ])
        )
      );
    }

    const sections: (RCMLSection | RCMLLoop | RCMLSwitch)[] = [
      ...createLogoSection(config.brandStyle.logoUrl),

      createGreetingSection(text.greeting, text.intro, fieldNames.firstName, customFields[fieldNames.firstName]),

      createContentSection(
        [
          createBrandHeading(createDocWithPlaceholders([createTextNode(text.detailsHeading)]), 2),
          ...detailRows,
        ],
        { padding: '20px 0', backgroundColor: config.brandStyle.brandColor }
      ),
    ];

    if (lineItemsSection) {
      if (text.lineItemsHeading) {
        sections.push(
          createContentSection(
            [createBrandHeading(createDocWithPlaceholders([createTextNode(text.lineItemsHeading)]), 2)],
            { padding: '10px 0' }
          )
        );
      }
      sections.push(lineItemsSection);
    }

    sections.push(
      createCtaSection(text.ctaButton, config.websiteUrl),
      createFooterSection(config.footer),
    );

    return createBrandTemplate({
      brandStyle: config.brandStyle,
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
  // Loop sub-fields are JSON key names, not custom field paths — skip validation for them
  const { itemName, itemQuantity, itemUnitPrice, itemTotal, itemSku, ...regularFields } = config.fieldNames;
  validateCustomFields(config.customFields, regularFields, templateName);

  return withTemplateContext(templateName, () => {
    const { customFields, fieldNames, text } = config;

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

    const sections: (RCMLSection | RCMLLoop | RCMLSwitch)[] = [
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
  };
  fieldNames: {
    firstName: string;
  };
}

/**
 * Create an abandoned cart recovery email template.
 */
export function createAbandonedCartEmail(config: AbandonedCartConfig): RCMLDocument {
  const templateName = 'createAbandonedCartEmail';
  validateCustomFields(config.customFields, config.fieldNames, templateName);

  return withTemplateContext(templateName, () => {
    const { customFields, fieldNames, text } = config;

    return createBrandTemplate({
      brandStyle: config.brandStyle,
      preheader: text.preheader,
      sections: [
        ...createLogoSection(config.brandStyle.logoUrl),

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

        createCtaSection(text.ctaButton, config.cartUrl),

        createFooterSection(config.footer),
      ],
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
  };
  fieldNames: {
    firstName: string;
    orderRef: string;
  };
}

/**
 * Create an order cancellation email template.
 */
export function createOrderCancellationEmail(config: OrderCancellationConfig): RCMLDocument {
  const templateName = 'createOrderCancellationEmail';
  validateCustomFields(config.customFields, config.fieldNames, templateName);

  return withTemplateContext(templateName, () => {
    const { customFields, fieldNames, text } = config;

    return createBrandTemplate({
      brandStyle: config.brandStyle,
      preheader: text.preheader,
      sections: [
        ...createLogoSection(config.brandStyle.logoUrl),

        createContentSection(
          [
            createBrandHeading(createDocWithPlaceholders([createTextNode(text.heading)])),

            createBrandText(
              createDocWithPlaceholders([
                createTextNode(`${text.greeting} `),
                createPlaceholder(fieldNames.firstName, customFields[fieldNames.firstName]),
                createTextNode(','),
              ])
            ),

            createBrandText(createDocWithPlaceholders([createTextNode(text.message)])),

            createBrandText(
              createDocWithPlaceholders([
                createTextNode(`${text.orderRefLabel}: `),
                createPlaceholder(fieldNames.orderRef, customFields[fieldNames.orderRef]),
              ])
            ),

            createBrandText(createDocWithPlaceholders([createTextNode(text.followUp)])),
          ],
          { padding: '20px 0' }
        ),

        createCtaSection(text.ctaButton, config.websiteUrl),

        createFooterSection(config.footer),
      ],
    });
  });
}
