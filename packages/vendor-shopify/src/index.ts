/**
 * Shopify Vendor Preset
 *
 * Reference e-commerce integration for Rule.io. Each email template
 * lives in its own folder under `src/templates/<name>/` with four
 * files: `<name>.xml` (layout), `<name>-copy.json` (default copy),
 * `<name>.ts` (types + factory), `<name>.test.ts` (tests). See
 * `packages/templates/README.md` for the authoring pattern.
 */

export { shopifyPreset } from './preset.js';
export { SHOPIFY_FIELDS } from './fields.js';
export { SHOPIFY_TAGS } from './tags.js';
export type { ShopifyFieldSchema, ShopifyFieldNames } from './fields.js';
export type { ShopifyTagSchema, ShopifyTagNames } from './tags.js';

// Abandoned-cart template.
export { createAbandonedCartTemplate } from './templates/abandoned-cart/abandoned-cart.js';
export type {
  AbandonedCartRenderOptions,
  AbandonedCartTemplate,
  AbandonedCartTemplateContext,
  AbandonedCartTemplateCopy,
} from './templates/abandoned-cart/abandoned-cart.js';

// Order-cancellation template.
export { createOrderCancellationTemplate } from './templates/order-cancellation/order-cancellation.js';
export type {
  OrderCancellationRenderOptions,
  OrderCancellationTemplate,
  OrderCancellationTemplateContext,
  OrderCancellationTemplateCopy,
} from './templates/order-cancellation/order-cancellation.js';

// Order-confirmation template.
export { createOrderConfirmationTemplate } from './templates/order-confirmation/order-confirmation.js';
export type {
  OrderConfirmationRenderOptions,
  OrderConfirmationTemplate,
  OrderConfirmationTemplateContext,
  OrderConfirmationTemplateCopy,
} from './templates/order-confirmation/order-confirmation.js';

// Shipping-update template.
export { createShippingUpdateTemplate } from './templates/shipping-update/shipping-update.js';
export type {
  ShippingUpdateRenderOptions,
  ShippingUpdateTemplate,
  ShippingUpdateTemplateContext,
  ShippingUpdateTemplateCopy,
} from './templates/shipping-update/shipping-update.js';

// Welcome template (vertical-agnostic).
export { createWelcomeTemplate } from './templates/welcome/welcome.js';
export type {
  WelcomeRenderOptions,
  WelcomeTemplate,
  WelcomeTemplateContext,
  WelcomeTemplateCopy,
} from './templates/welcome/welcome.js';
