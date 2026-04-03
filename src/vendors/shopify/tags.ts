/**
 * Shopify Tag Definitions
 *
 * Tags match the actual Shopify→Rule.io integration exactly.
 * @see https://help.rule.io/en/articles/349484-shopify-integration
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
  newsletter: 'Newsletter',
} as const satisfies VendorTagSchema;

/** Object type of the Shopify tag schema. */
export type ShopifyTagSchema = typeof SHOPIFY_TAGS;

/** Union of logical Shopify tag name keys. */
export type ShopifyTagNames = keyof ShopifyTagSchema;
