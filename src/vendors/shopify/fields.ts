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
  // Customer
  customerFirstName: 'Order.CustomerName',
  customerFullName: 'Order.CustomerFullName',
  customerEmail: 'Order.CustomerEmail',

  // Order
  orderRef: 'Order.OrderRef',
  orderDate: 'Order.OrderDate',
  currency: 'Order.Currency',
  paymentMethod: 'Order.PaymentMethod',

  // Financials
  subtotal: 'Order.Subtotal',
  discountAmount: 'Order.DiscountAmount',
  taxAmount: 'Order.TaxAmount',
  shippingCost: 'Order.ShippingCost',
  totalPrice: 'Order.Total',

  // Shipping
  shippingAddress: 'Order.ShippingAddress',
  billingAddress: 'Order.BillingAddress',
  trackingNumber: 'Order.TrackingNumber',
  estimatedDelivery: 'Order.EstimatedDelivery',
  shippingCarrier: 'Order.ShippingCarrier',

  // Seller
  companyName: 'Order.CompanyName',
  vatNumber: 'Order.VATNumber',

  // Line items (repeatable sub-fields within Order.Items)
  items: 'Order.Items',
  itemName: 'Order.Items.Name',
  itemQuantity: 'Order.Items.Quantity',
  itemUnitPrice: 'Order.Items.UnitPrice',
  itemTotal: 'Order.Items.Total',
  itemSku: 'Order.Items.SKU',
} as const satisfies VendorFieldSchema;

/** Object type of the Shopify field schema. */
export type ShopifyFieldSchema = typeof SHOPIFY_FIELDS;

/** Union of logical Shopify field name keys. */
export type ShopifyFieldNames = keyof ShopifyFieldSchema;
