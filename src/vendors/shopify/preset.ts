/**
 * Shopify Vendor Preset
 *
 * Reference e-commerce preset for Shopify integrations with Rule.io.
 *
 * @example
 * ```typescript
 * import { shopifyPreset, SHOPIFY_FIELDS } from 'rule-io-sdk';
 *
 * const config = {
 *   brandStyle: myBrandStyle,
 *   customFields: {
 *     [SHOPIFY_FIELDS.customerFirstName]: 169233,
 *     [SHOPIFY_FIELDS.orderRef]: 169234,
 *     // ...
 *   },
 *   websiteUrl: 'https://myshop.com',
 * };
 *
 * shopifyPreset.validateConfig(config);
 * const automations = shopifyPreset.getAutomations(config);
 * ```
 */

import type { VendorPreset, VendorConsumerConfig, VendorFieldInfo } from '../types';
import { resolveVendorAutomations } from '../types';
import type { AutomationConfigV2 } from '../../automation-configs-v2';
import type { ShopifyFieldSchema, ShopifyFieldNames } from './fields';
import type { ShopifyTagSchema } from './tags';
import { SHOPIFY_FIELDS } from './fields';
import { SHOPIFY_TAGS } from './tags';
import { createShopifyAutomations } from './automations';
import { RuleConfigError } from '../../errors';

const FIELD_DESCRIPTIONS: Record<ShopifyFieldNames, string> = {
  customerFirstName: 'Customer first name from Shopify order',
  customerEmail: 'Customer email address',
  orderRef: 'Shopify order reference number',
  totalPrice: 'Order total price',
  items: 'Order line items',
  shippingAddress: 'Shipping address',
  trackingNumber: 'Shipment tracking number',
  estimatedDelivery: 'Estimated delivery date',
  currency: 'Order currency code',
};

/** Fields actually used by the shipped automations (required in customFields). */
const REQUIRED_FIELDS: readonly ShopifyFieldNames[] = [
  'customerFirstName',
  'orderRef',
  'totalPrice',
  'items',
  'shippingAddress',
  'trackingNumber',
  'estimatedDelivery',
];

function validateShopifyConfig(config: VendorConsumerConfig): void {
  const missingFields: string[] = [];
  for (const logicalName of REQUIRED_FIELDS) {
    const fieldName = SHOPIFY_FIELDS[logicalName];
    if (config.customFields[fieldName] === undefined) {
      missingFields.push(`${logicalName} ("${fieldName}")`);
    }
  }
  if (missingFields.length > 0) {
    throw new RuleConfigError(
      `shopifyPreset: missing customFields entries for: ${missingFields.join(', ')}`
    );
  }
}

function resolveAutomations(config: VendorConsumerConfig): AutomationConfigV2[] {
  return resolveVendorAutomations(createShopifyAutomations(), config);
}

/**
 * Shopify vendor preset for Rule.io.
 *
 * Provides pre-configured automations for the standard Shopify e-commerce
 * flows: order confirmation, shipping update, abandoned cart, and
 * order cancellation.
 */
export const shopifyPreset: VendorPreset<ShopifyFieldSchema, ShopifyTagSchema> = {
  vendor: 'shopify',
  displayName: 'Shopify',
  vertical: 'ecommerce',
  fields: SHOPIFY_FIELDS,
  tags: SHOPIFY_TAGS,

  getAutomations(config: VendorConsumerConfig): AutomationConfigV2[] {
    validateShopifyConfig(config);
    return resolveAutomations(config);
  },

  getAutomation(id: string, config: VendorConsumerConfig): AutomationConfigV2 | undefined {
    validateShopifyConfig(config);
    return resolveAutomations(config).find((a) => a.id === id);
  },

  validateConfig: validateShopifyConfig,

  getRequiredFields(): readonly VendorFieldInfo[] {
    return REQUIRED_FIELDS.map((logicalName) => ({
      logicalName,
      fieldName: SHOPIFY_FIELDS[logicalName],
      description: FIELD_DESCRIPTIONS[logicalName],
    }));
  },
};
