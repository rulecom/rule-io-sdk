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
import type { AutomationConfigV2 } from '../../automation-configs-v2';
import type { ShopifyFieldNames } from './fields';
import type { ShopifyTagNames } from './tags';
import { SHOPIFY_FIELDS } from './fields';
import { SHOPIFY_TAGS } from './tags';
import { createShopifyAutomations } from './automations';
import { RuleConfigError } from '../../errors';

const FIELD_DESCRIPTIONS: Record<keyof ShopifyFieldNames, string> = {
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

function resolveAutomations(config: VendorConsumerConfig): AutomationConfigV2[] {
  return createShopifyAutomations().map((a) => ({
    id: a.id,
    name: a.name,
    description: a.description,
    triggerTag: a.triggerTag,
    delayInSeconds: a.delayInSeconds,
    conditions: a.conditions,
    subject: a.subject,
    preheader: a.preheader,
    templateBuilder: () => a.templateBuilder(config),
  }));
}

/**
 * Shopify vendor preset for Rule.io.
 *
 * Provides pre-configured automations for the standard Shopify e-commerce
 * flows: order confirmation, shipping update, abandoned cart, and
 * order cancellation.
 */
export const shopifyPreset: VendorPreset<ShopifyFieldNames, ShopifyTagNames> = {
  vendor: 'shopify',
  displayName: 'Shopify',
  vertical: 'ecommerce',
  fields: SHOPIFY_FIELDS,
  tags: SHOPIFY_TAGS,

  getAutomations(config: VendorConsumerConfig): AutomationConfigV2[] {
    this.validateConfig(config);
    return resolveAutomations(config);
  },

  getAutomation(id: string, config: VendorConsumerConfig): AutomationConfigV2 | undefined {
    this.validateConfig(config);
    return resolveAutomations(config).find((a) => a.id === id);
  },

  validateConfig(config: VendorConsumerConfig): void {
    const missingFields: string[] = [];
    for (const [logicalName, fieldName] of Object.entries(SHOPIFY_FIELDS)) {
      if (config.customFields[fieldName] === undefined) {
        missingFields.push(`${logicalName} ("${fieldName}")`);
      }
    }
    if (missingFields.length > 0) {
      throw new RuleConfigError(
        `shopifyPreset: missing customFields entries for: ${missingFields.join(', ')}`
      );
    }
  },

  getRequiredFields(): readonly VendorFieldInfo[] {
    return Object.entries(SHOPIFY_FIELDS).map(([logicalName, fieldName]) => ({
      logicalName,
      fieldName,
      description: FIELD_DESCRIPTIONS[logicalName as keyof ShopifyFieldNames],
    }));
  },
};
