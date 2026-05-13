/**
 * Shopify Automation Definitions
 *
 * Placeholder. The pre-built shopify automations have been retired —
 * downstream code now builds template contexts explicitly (via
 * `customField` / `loopValue` from `@rule-io/templates`) and calls
 * the template factories (`createOrderConfirmationTemplate`,
 * `createShippingUpdateTemplate`, `createOrderCancellationTemplate`,
 * `createAbandonedCartTemplate`, `createWelcomeTemplate`) directly
 * when wiring automations through `@rule-io/client`.
 *
 * @see https://help.rule.io/en/articles/349484-shopify-integration
 */

import type { VendorAutomation } from '@rule-io/core';

/**
 * Shopify automation definitions. Currently empty; see module JSDoc.
 */
export function createShopifyAutomations(): VendorAutomation[] {
  return [];
}
