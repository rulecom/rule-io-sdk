/**
 * Shopify Tag Definitions
 *
 * Standard tags used by Shopify integrations with Rule.io.
 */

import type { VendorTagSchema } from '../types';

/**
 * Shopify tags for Rule.io automations.
 *
 * @example
 * ```typescript
 * import { SHOPIFY_TAGS } from 'rule-io-sdk';
 *
 * await client.syncSubscriber({
 *   email: 'customer@example.com',
 *   tags: [SHOPIFY_TAGS.orderCompleted],
 * });
 * ```
 */
export const SHOPIFY_TAGS = {
  cartInProgress: 'CartInProgress',
  orderCompleted: 'OrderCompleted',
  orderShipped: 'OrderShipped',
  orderCancelled: 'OrderCancelled',
  newsletter: 'Newsletter',
  newCustomer: 'new-customer',
  returningCustomer: 'returning-customer',
} as const satisfies VendorTagSchema;

/** Object type of the Shopify tag schema. */
export type ShopifyTagSchema = typeof SHOPIFY_TAGS;

/** Union of logical Shopify tag name keys. */
export type ShopifyTagNames = keyof ShopifyTagSchema;
