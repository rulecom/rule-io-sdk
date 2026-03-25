/**
 * Shopify Automation Definitions
 *
 * Pre-configured automations for Shopify e-commerce flows.
 * Each automation wires Shopify-specific field names and default
 * English text into the generic e-commerce template builders.
 */

import type { VendorAutomation, VendorConsumerConfig } from '../types';
import { SHOPIFY_FIELDS } from './fields';
import { SHOPIFY_TAGS } from './tags';
import {
  createOrderConfirmationEmail,
  createShippingUpdateEmail,
  createAbandonedCartEmail,
  createOrderCancellationEmail,
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
} as const;

/** Default English text for Shopify shipping update emails. */
const SHIPPING_UPDATE_TEXT = {
  preheader: 'Your order is on its way!',
  heading: 'Shipping Update',
  greeting: 'Hi',
  message: 'your order has been shipped!',
  orderRefLabel: 'Order',
  trackingLabel: 'Tracking',
  estimatedDeliveryLabel: 'Estimated delivery',
  ctaButton: 'Track Shipment',
} as const;

/** Default English text for Shopify abandoned cart emails. */
const ABANDONED_CART_TEXT = {
  preheader: 'You left something behind!',
  greeting: 'Hi',
  message: 'It looks like you left some items in your cart.',
  reminder: 'Complete your purchase before they sell out!',
  ctaButton: 'Return to Cart',
} as const;

/** Default English text for Shopify order cancellation emails. */
const ORDER_CANCELLATION_TEXT = {
  preheader: 'Your order has been cancelled',
  heading: 'Order Cancelled',
  greeting: 'Hi',
  message: 'Your order has been cancelled as requested.',
  orderRefLabel: 'Order',
  followUp: 'If you have any questions, please contact our support team.',
  ctaButton: 'Visit Store',
} as const;

/**
 * Create the full set of Shopify automation definitions.
 *
 * Each automation returns a {@link VendorAutomation} that delegates to
 * the generic e-commerce template builders with Shopify field names
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
            firstName: SHOPIFY_FIELDS.customerFirstName,
            orderRef: SHOPIFY_FIELDS.orderRef,
            totalPrice: SHOPIFY_FIELDS.totalPrice,
            items: SHOPIFY_FIELDS.items,
            shippingAddress: SHOPIFY_FIELDS.shippingAddress,
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
            firstName: SHOPIFY_FIELDS.customerFirstName,
            orderRef: SHOPIFY_FIELDS.orderRef,
            trackingNumber: SHOPIFY_FIELDS.trackingNumber,
            estimatedDelivery: SHOPIFY_FIELDS.estimatedDelivery,
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
        notHasTag: [SHOPIFY_TAGS.orderCompleted],
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
            firstName: SHOPIFY_FIELDS.customerFirstName,
          },
        }),
    },
    {
      id: 'shopify-order-cancellation',
      name: 'Shopify Order Cancellation',
      description: 'Sent when a Shopify order is cancelled',
      triggerTag: SHOPIFY_TAGS.orderCancelled,
      subject: 'Order Cancelled',
      preheader: ORDER_CANCELLATION_TEXT.preheader,
      templateBuilder: (config: VendorConsumerConfig) =>
        createOrderCancellationEmail({
          brandStyle: config.brandStyle,
          customFields: config.customFields,
          websiteUrl: config.websiteUrl,
          footer: config.footer,
          text: ORDER_CANCELLATION_TEXT,
          fieldNames: {
            firstName: SHOPIFY_FIELDS.customerFirstName,
            orderRef: SHOPIFY_FIELDS.orderRef,
          },
        }),
    },
  ];
}
