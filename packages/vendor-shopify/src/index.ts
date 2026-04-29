/**
 * Shopify Vendor Preset
 *
 * Reference e-commerce integration for Rule.io.
 */

export { shopifyPreset } from './preset.js';
export { SHOPIFY_FIELDS } from './fields.js';
export { SHOPIFY_TAGS } from './tags.js';
export type { ShopifyFieldSchema, ShopifyFieldNames } from './fields.js';
export type { ShopifyTagSchema, ShopifyTagNames } from './tags.js';

// E-commerce email templates (moved from @rule-io/rcml — re-exported so the
// @rule-io/sdk meta-package keeps surfacing them for external consumers).
export {
  createOrderConfirmationEmail,
  createShippingUpdateEmail,
  createAbandonedCartEmail,
  createOrderCancellationEmail,
} from './ecommerce-templates.js';
export type {
  OrderConfirmationConfig,
  ShippingUpdateConfig,
  AbandonedCartConfig,
  OrderCancellationConfig,
} from './ecommerce-templates.js';

// Vertical-agnostic welcome email template (moved from @rule-io/rcml).
export { createWelcomeEmail } from './generic-templates.js';
export type { WelcomeEmailConfig } from './generic-templates.js';
