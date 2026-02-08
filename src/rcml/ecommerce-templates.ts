/**
 * E-commerce Email Templates
 *
 * Pre-built templates for online stores: order confirmations,
 * shipping updates, abandoned cart recovery, and cancellations.
 *
 * All text and configuration must be provided by the consumer —
 * no hardcoded defaults for any specific business.
 */

import type { RCMLDocument } from '../types';
import {
  createBrandTemplate,
  createBrandLogo,
  createBrandHeading,
  createBrandText,
  createBrandButton,
  createContentSection,
  createFooterSection,
  createPlaceholder,
  createTextNode,
  createDocWithPlaceholders,
  type BrandStyleConfig,
  type CustomFieldMap,
  type FooterConfig,
} from './brand-template';

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
  };
  fieldNames: {
    firstName: string;
    orderRef: string;
    totalPrice: string;
    items?: string;
    shippingAddress?: string;
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
  const { customFields, fieldNames, text } = config;

  const detailRows: ReturnType<typeof createBrandText>[] = [
    createBrandText(
      createDocWithPlaceholders([
        createTextNode(`${text.orderRefLabel}: `),
        createPlaceholder(fieldNames.orderRef, customFields[fieldNames.orderRef]),
      ])
    ),
  ];

  if (fieldNames.items && text.itemsLabel) {
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

  return createBrandTemplate({
    brandStyle: config.brandStyle,
    preheader: text.preheader,
    sections: [
      createBrandLogo(),

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
            createDocWithPlaceholders([createTextNode(text.intro)]),
            { align: 'center' }
          ),
        ],
        { padding: '20px 0' }
      ),

      createContentSection(
        [
          createBrandHeading(createDocWithPlaceholders([createTextNode(text.detailsHeading)]), 2),
          ...detailRows,
        ],
        { padding: '20px 0', backgroundColor: '#f6f8f9' }
      ),

      createContentSection(
        [
          createBrandButton(
            createDocWithPlaceholders([createTextNode(text.ctaButton)]),
            config.websiteUrl
          ),
        ],
        { padding: '20px 0' }
      ),

      createFooterSection(config.footer),
    ],
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
  };
  fieldNames: {
    firstName: string;
    orderRef: string;
    trackingNumber?: string;
    estimatedDelivery?: string;
  };
}

/**
 * Create a shipping update email template.
 */
export function createShippingUpdateEmail(config: ShippingUpdateConfig): RCMLDocument {
  const { customFields, fieldNames, text } = config;

  const detailRows: ReturnType<typeof createBrandText>[] = [
    createBrandText(
      createDocWithPlaceholders([
        createTextNode(`${text.orderRefLabel}: `),
        createPlaceholder(fieldNames.orderRef, customFields[fieldNames.orderRef]),
      ])
    ),
  ];

  if (fieldNames.trackingNumber && text.trackingLabel) {
    detailRows.push(
      createBrandText(
        createDocWithPlaceholders([
          createTextNode(`${text.trackingLabel}: `),
          createPlaceholder(fieldNames.trackingNumber, customFields[fieldNames.trackingNumber]),
        ])
      )
    );
  }

  if (fieldNames.estimatedDelivery && text.estimatedDeliveryLabel) {
    detailRows.push(
      createBrandText(
        createDocWithPlaceholders([
          createTextNode(`${text.estimatedDeliveryLabel}: `),
          createPlaceholder(
            fieldNames.estimatedDelivery,
            customFields[fieldNames.estimatedDelivery]
          ),
        ])
      )
    );
  }

  return createBrandTemplate({
    brandStyle: config.brandStyle,
    preheader: text.preheader,
    sections: [
      createBrandLogo(),

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

      createContentSection(detailRows, { padding: '20px 0', backgroundColor: '#f6f8f9' }),

      createContentSection(
        [
          createBrandButton(
            createDocWithPlaceholders([createTextNode(text.ctaButton)]),
            config.trackingUrl
          ),
        ],
        { padding: '20px 0' }
      ),

      createFooterSection(config.footer),
    ],
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
  const { customFields, fieldNames, text } = config;

  return createBrandTemplate({
    brandStyle: config.brandStyle,
    preheader: text.preheader,
    sections: [
      createBrandLogo(),

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

      createContentSection(
        [
          createBrandButton(
            createDocWithPlaceholders([createTextNode(text.ctaButton)]),
            config.cartUrl
          ),
        ],
        { padding: '20px 0' }
      ),

      createFooterSection(config.footer),
    ],
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
  const { customFields, fieldNames, text } = config;

  return createBrandTemplate({
    brandStyle: config.brandStyle,
    preheader: text.preheader,
    sections: [
      createBrandLogo(),

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

      createContentSection(
        [
          createBrandButton(
            createDocWithPlaceholders([createTextNode(text.ctaButton)]),
            config.websiteUrl
          ),
        ],
        { padding: '20px 0' }
      ),

      createFooterSection(config.footer),
    ],
  });
}
