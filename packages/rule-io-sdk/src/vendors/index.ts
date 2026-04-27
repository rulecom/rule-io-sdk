/**
 * Vendor Presets
 *
 * Pre-configured integrations for popular platforms.
 * Each preset bundles field names, tags, and automation flows
 * specific to a vendor platform.
 *
 * @example
 * ```typescript
 * import { shopifyPreset, SHOPIFY_FIELDS } from 'rule-io-sdk';
 *
 * const automations = shopifyPreset.getAutomations({
 *   brandStyle: myBrandStyle,
 *   customFields: { [SHOPIFY_FIELDS.customerFirstName]: 169233, ... },
 *   websiteUrl: 'https://myshop.com',
 * });
 * ```
 */

// Types
export type {
  VendorPreset,
  VendorFieldSchema,
  VendorTagSchema,
  VendorConsumerConfig,
  VendorAutomation,
  VendorFieldInfo,
} from './types.js';

// Shopify (e-commerce)
export { shopifyPreset, SHOPIFY_FIELDS, SHOPIFY_TAGS } from './shopify/index.js';
export type { ShopifyFieldSchema, ShopifyFieldNames, ShopifyTagSchema, ShopifyTagNames } from './shopify/index.js';

// Bookzen (hospitality)
export { bookzenPreset, BOOKZEN_FIELDS, BOOKZEN_TAGS } from './bookzen/index.js';
export type { BookzenFieldSchema, BookzenFieldNames, BookzenTagSchema, BookzenTagNames } from './bookzen/index.js';

// Samfora (donation)
export { samforaPreset, SAMFORA_FIELDS, SAMFORA_TAGS } from './samfora/index.js';
export type { SamforaFieldSchema, SamforaFieldNames, SamforaTagSchema, SamforaTagNames } from './samfora/index.js';
