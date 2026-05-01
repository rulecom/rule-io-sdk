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

// E-commerce email templates. Each template is colocated with its
// XML + messages + tests under `src/templates/<name>/`.
export { createOrderConfirmationEmail } from './templates/order-confirmation/order-confirmation.js';
export type { OrderConfirmationConfig } from './templates/order-confirmation/order-confirmation.js';

export { createShippingUpdateEmail } from './templates/shipping-update/shipping-update.js';
export type { ShippingUpdateConfig } from './templates/shipping-update/shipping-update.js';

export { createAbandonedCartEmail } from './templates/abandoned-cart/abandoned-cart.js';
export type { AbandonedCartConfig } from './templates/abandoned-cart/abandoned-cart.js';

export { createAbandonedCartTemplate } from './templates/abandoned-cart/create-abandoned-cart-template.js';
export type {
  AbandonedCartRenderOptions,
  AbandonedCartTemplate,
  AbandonedCartTemplateContext,
  AbandonedCartTemplateCopy,
} from './templates/abandoned-cart/create-abandoned-cart-template.js';

export { createOrderCancellationEmail } from './templates/order-cancellation/order-cancellation.js';
export type { OrderCancellationConfig } from './templates/order-cancellation/order-cancellation.js';

// Vertical-agnostic welcome email template (moved from @rule-io/rcml).
export { createWelcomeEmail } from './generic-templates.js';
export type { WelcomeEmailConfig } from './generic-templates.js';
