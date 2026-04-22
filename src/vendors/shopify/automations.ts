/**
 * Shopify Automation Definitions
 *
 * Pre-configured automations for Shopify order flows plus a newsletter
 * welcome. Each automation wires Shopify-specific field names and default
 * English text into the generic template builders — e-commerce templates
 * for the order flows, and the vertical-agnostic welcome template for the
 * newsletter signup.
 *
 * @see https://help.rule.io/en/articles/349484-shopify-integration
 */

import type { VendorAutomation, VendorConsumerConfig } from '../types';
import { SHOPIFY_FIELDS } from './fields';
import { SHOPIFY_TAGS } from './tags';
import {
  createOrderConfirmationEmail,
  createShippingUpdateEmail,
  createAbandonedCartEmail,
  createOrderCancellationEmail,
  createWelcomeEmail,
} from '../../rcml';

/** Default English text for Shopify order confirmation emails. */
const ORDER_CONFIRMATION_TEXT = {
  preheader: 'Your order has been confirmed!',
  greeting: 'Hi',
  intro: 'Thank you for your order. Here are the details:',
  detailsHeading: 'Order Summary',
  orderRefLabel: 'Order',
  itemsLabel: 'Items',
  totalLabel: 'Total',
  shippingLabel: 'Shipping to',
  ctaButton: 'View Order',
  lineItemsHeading: 'Items Ordered',
  itemQtyLabel: 'Qty: ',
  itemUnitPriceLabel: 'Price: ',
  itemSkuLabel: 'SKU: ',
  heroHeadingPrefix: 'Order',
  heroHeadingSuffix: 'confirmed',
  orderDateLabel: 'Order date',
  paymentMethodLabel: 'Payment',
  subtotalLabel: 'Subtotal',
  taxLabel: 'Tax',
  discountLabel: 'Discount',
  shippingCostLabel: 'Shipping',
  shippingAddressHeading: 'Shipping to',
} as const;

/** Default English text for Shopify shipping update / receipt emails. */
const SHIPPING_UPDATE_TEXT = {
  preheader: 'Your order is on its way!',
  heading: 'Shipping Confirmation & Receipt',
  greeting: 'Hi',
  message: 'your order has been shipped!',
  orderRefLabel: 'Order',
  ctaButton: 'View Order',
  // Receipt labels
  orderDateLabel: 'Order date',
  shippingAddressLabel: 'Shipping to',
  lineItemsHeading: 'Items',
  discountLabel: 'Discount',
  taxLabel: 'Tax',
  totalLabel: 'Total',
  legalText: 'This email serves as your official receipt for this transaction.',
  statusConfirmedLabel: 'Confirmed',
  statusShippedLabel: 'Shipped',
  statusDeliveredLabel: 'Delivered',
} as const;

/** Default English text for Shopify order cancellation emails. */
const ORDER_CANCELLATION_TEXT = {
  preheader: 'Your order has been cancelled',
  heading: 'Order Cancelled',
  greeting: 'Hi',
  message: 'Your order has been cancelled. If you have any questions, please contact us.',
  orderRefLabel: 'Order',
  orderDateLabel: 'Order date',
  followUp: 'We hope to see you again soon.',
  ctaButton: 'Visit Store',
} as const;

/** Default English text for Shopify newsletter welcome emails. */
const WELCOME_TEXT = {
  preheader: 'Welcome!',
  heading: 'Welcome!',
  greeting: 'Hi',
  intro: "Thanks for joining our newsletter. We're glad to have you on board.",
  ctaButton: 'Learn More',
  closing: "We'll be in touch with news and updates.",
} as const;

/** Default English text for Shopify abandoned cart emails. */
const ABANDONED_CART_TEXT = {
  preheader: 'You left something behind!',
  greeting: 'Hi',
  message: 'It looks like you left some items in your cart.',
  reminder: 'Complete your purchase before they sell out!',
  ctaButton: 'Return to Cart',
  lineItemsHeading: 'Your Cart',
  itemQtyLabel: 'Qty: ',
  itemUnitPriceLabel: 'Price: ',
  itemSkuLabel: 'SKU: ',
  totalLabel: 'Total',
} as const;

/**
 * Create the full set of Shopify automation definitions.
 *
 * Each automation returns a {@link VendorAutomation} that delegates to
 * the appropriate generic template builder (e-commerce for order flows,
 * vertical-agnostic for the newsletter welcome) with Shopify field names
 * and default English text.
 */
export function createShopifyAutomations(): VendorAutomation[] {
  return [
    {
      id: 'shopify-order-confirmation',
      name: 'Shopify Order Confirmation',
      description: 'Sent when a Shopify order is completed',
      triggerTag: SHOPIFY_TAGS.orderCompleted,
      subject: 'Order Confirmed!',
      preheader: ORDER_CONFIRMATION_TEXT.preheader,
      templateBuilder: (config: VendorConsumerConfig) =>
        createOrderConfirmationEmail({
          brandStyle: config.brandStyle,
          customFields: config.customFields,
          websiteUrl: config.websiteUrl,
          footer: config.footer,
          text: ORDER_CONFIRMATION_TEXT,
          fieldNames: {
            firstName: SHOPIFY_FIELDS.firstName,
            orderRef: SHOPIFY_FIELDS.orderNumber,
            totalPrice: SHOPIFY_FIELDS.totalPrice,
            // Optional fields — only include when mapped in customFields
            ...(config.customFields[SHOPIFY_FIELDS.products] !== undefined && {
              items: SHOPIFY_FIELDS.products,
              itemName: SHOPIFY_FIELDS.itemName,
              itemQuantity: SHOPIFY_FIELDS.itemQuantity,
              itemUnitPrice: SHOPIFY_FIELDS.itemPrice,
              itemSku: SHOPIFY_FIELDS.itemSku,
            }),
            ...(config.customFields[SHOPIFY_FIELDS.orderDate] !== undefined && {
              orderDate: SHOPIFY_FIELDS.orderDate,
            }),
            ...(config.customFields[SHOPIFY_FIELDS.gateway] !== undefined && {
              paymentMethod: SHOPIFY_FIELDS.gateway,
            }),
            ...(config.customFields[SHOPIFY_FIELDS.discount] !== undefined && {
              discountAmount: SHOPIFY_FIELDS.discount,
            }),
            ...(config.customFields[SHOPIFY_FIELDS.totalTax] !== undefined && {
              taxAmount: SHOPIFY_FIELDS.totalTax,
            }),
            // Extended address fields are only meaningful alongside the base
            // shippingAddress line — nest them so they never land in the
            // template without it.
            ...(config.customFields[SHOPIFY_FIELDS.shippingAddress1] !== undefined && {
              shippingAddress: SHOPIFY_FIELDS.shippingAddress1,
              ...(config.customFields[SHOPIFY_FIELDS.shippingAddress2] !== undefined && {
                shippingAddress2: SHOPIFY_FIELDS.shippingAddress2,
              }),
              ...(config.customFields[SHOPIFY_FIELDS.shippingCity] !== undefined && {
                shippingCity: SHOPIFY_FIELDS.shippingCity,
              }),
              ...(config.customFields[SHOPIFY_FIELDS.shippingZip] !== undefined && {
                shippingZip: SHOPIFY_FIELDS.shippingZip,
              }),
              ...(config.customFields[SHOPIFY_FIELDS.shippingCountryCode] !== undefined && {
                shippingCountryCode: SHOPIFY_FIELDS.shippingCountryCode,
              }),
            }),
          },
        }),
    },
    {
      id: 'shopify-shipping-update',
      name: 'Shopify Shipping Update',
      description: 'Sent when a Shopify order is shipped',
      triggerTag: SHOPIFY_TAGS.orderShipped,
      subject: 'Your Order Has Shipped!',
      preheader: SHIPPING_UPDATE_TEXT.preheader,
      templateBuilder: (config: VendorConsumerConfig) =>
        createShippingUpdateEmail({
          brandStyle: config.brandStyle,
          customFields: config.customFields,
          trackingUrl: config.websiteUrl,
          footer: config.footer,
          text: SHIPPING_UPDATE_TEXT,
          fieldNames: {
            firstName: SHOPIFY_FIELDS.firstName,
            orderRef: SHOPIFY_FIELDS.orderNumber,
            // Receipt fields — only include when mapped in customFields
            ...(config.customFields[SHOPIFY_FIELDS.orderDate] !== undefined && {
              orderDate: SHOPIFY_FIELDS.orderDate,
            }),
            ...(config.customFields[SHOPIFY_FIELDS.currency] !== undefined && {
              currency: SHOPIFY_FIELDS.currency,
            }),
            ...(config.customFields[SHOPIFY_FIELDS.discount] !== undefined && {
              discountAmount: SHOPIFY_FIELDS.discount,
            }),
            ...(config.customFields[SHOPIFY_FIELDS.totalTax] !== undefined && {
              taxAmount: SHOPIFY_FIELDS.totalTax,
            }),
            ...(config.customFields[SHOPIFY_FIELDS.shippingAddress1] !== undefined && {
              shippingAddress: SHOPIFY_FIELDS.shippingAddress1,
            }),
            ...(config.customFields[SHOPIFY_FIELDS.totalPrice] !== undefined && {
              totalPrice: SHOPIFY_FIELDS.totalPrice,
            }),
            ...(config.customFields[SHOPIFY_FIELDS.products] !== undefined && {
              items: SHOPIFY_FIELDS.products,
              itemName: SHOPIFY_FIELDS.itemName,
              itemQuantity: SHOPIFY_FIELDS.itemQuantity,
              itemUnitPrice: SHOPIFY_FIELDS.itemPrice,
              itemSku: SHOPIFY_FIELDS.itemSku,
            }),
          },
        }),
    },
    {
      id: 'shopify-order-cancellation',
      name: 'Shopify Order Cancellation',
      description: 'Sent when a Shopify order is cancelled',
      triggerTag: SHOPIFY_TAGS.orderCancelled,
      subject: 'Your Order Has Been Cancelled',
      preheader: ORDER_CANCELLATION_TEXT.preheader,
      templateBuilder: (config: VendorConsumerConfig) =>
        createOrderCancellationEmail({
          brandStyle: config.brandStyle,
          customFields: config.customFields,
          websiteUrl: config.websiteUrl,
          footer: config.footer,
          text: ORDER_CANCELLATION_TEXT,
          fieldNames: {
            firstName: SHOPIFY_FIELDS.firstName,
            orderRef: SHOPIFY_FIELDS.orderNumber,
            ...(config.customFields[SHOPIFY_FIELDS.orderDate] !== undefined && {
              orderDate: SHOPIFY_FIELDS.orderDate,
            }),
          },
        }),
    },
    {
      id: 'shopify-welcome',
      name: 'Shopify Welcome',
      description: 'Sent when a subscriber joins the newsletter',
      triggerTag: SHOPIFY_TAGS.newsletter,
      subject: 'Welcome!',
      preheader: WELCOME_TEXT.preheader,
      templateBuilder: (config: VendorConsumerConfig) =>
        createWelcomeEmail({
          brandStyle: config.brandStyle,
          customFields: config.customFields,
          websiteUrl: config.websiteUrl,
          footer: config.footer,
          text: WELCOME_TEXT,
          fieldNames: {
            firstName: SHOPIFY_FIELDS.firstName,
          },
        }),
    },
    {
      id: 'shopify-abandoned-cart',
      name: 'Shopify Abandoned Cart',
      description: 'Sent when a cart is abandoned after a delay',
      triggerTag: SHOPIFY_TAGS.cartInProgress,
      delayInSeconds: '3600',
      conditions: {
        notHasTag: [SHOPIFY_TAGS.orderCompleted, SHOPIFY_TAGS.orderCancelled],
      },
      subject: 'You Left Something Behind!',
      preheader: ABANDONED_CART_TEXT.preheader,
      templateBuilder: (config: VendorConsumerConfig) =>
        createAbandonedCartEmail({
          brandStyle: config.brandStyle,
          customFields: config.customFields,
          cartUrl: config.websiteUrl,
          footer: config.footer,
          text: ABANDONED_CART_TEXT,
          fieldNames: {
            firstName: SHOPIFY_FIELDS.firstName,
            ...(config.customFields[SHOPIFY_FIELDS.products] !== undefined && {
              items: SHOPIFY_FIELDS.products,
              itemName: SHOPIFY_FIELDS.itemName,
              itemQuantity: SHOPIFY_FIELDS.itemQuantity,
              itemUnitPrice: SHOPIFY_FIELDS.itemPrice,
              itemSku: SHOPIFY_FIELDS.itemSku,
            }),
            ...(config.customFields[SHOPIFY_FIELDS.totalPrice] !== undefined && {
              totalPrice: SHOPIFY_FIELDS.totalPrice,
            }),
          },
        }),
    },
  ];
}
