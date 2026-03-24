/**
 * Shopify Custom Field Definitions
 *
 * Every Shopify integration uses these same field names because
 * the webhook payload structure is the same across all stores.
 * Consumers provide the numeric IDs from their Rule.io account.
 */

import type { VendorFieldSchema } from '../types';

/**
 * Shopify field names for Rule.io custom fields.
 *
 * @example
 * ```typescript
 * import { SHOPIFY_FIELDS } from 'rule-io-sdk';
 *
 * const customFields = {
 *   [SHOPIFY_FIELDS.customerFirstName]: 169233,
 *   [SHOPIFY_FIELDS.orderRef]: 169234,
 *   // ... map all fields to your Rule.io numeric IDs
 * };
 * ```
 */
export const SHOPIFY_FIELDS = {
  customerFirstName: 'Order.CustomerName',
  customerEmail: 'Order.CustomerEmail',
  orderRef: 'Order.OrderRef',
  totalPrice: 'Order.Total',
  items: 'Order.Items',
  shippingAddress: 'Order.ShippingAddress',
  trackingNumber: 'Order.TrackingNumber',
  estimatedDelivery: 'Order.EstimatedDelivery',
  currency: 'Order.Currency',
} as const satisfies VendorFieldSchema;

/** Object type of the Shopify field schema. */
export type ShopifyFieldSchema = typeof SHOPIFY_FIELDS;

/** Union of logical Shopify field name keys. */
export type ShopifyFieldNames = keyof ShopifyFieldSchema;
