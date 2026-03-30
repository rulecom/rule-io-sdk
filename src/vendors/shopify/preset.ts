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
  // Customer
  customerFirstName: 'Customer first name from Shopify order',
  customerFullName: 'Customer full name for legal identification',
  customerEmail: 'Customer email address',

  // Order
  orderRef: 'Shopify order reference number',
  orderDate: 'Order/transaction date',
  currency: 'Order currency code (e.g., USD, EUR)',
  paymentMethod: 'Payment method used (e.g., credit card, PayPal)',

  // Financials
  subtotal: 'Pre-tax subtotal',
  discountAmount: 'Discount amount applied',
  taxAmount: 'Tax amount',
  shippingCost: 'Shipping cost',
  totalPrice: 'Order total price',

  // Shipping
  shippingAddress: 'Shipping address',
  billingAddress: 'Billing address',
  trackingNumber: 'Shipment tracking number',
  estimatedDelivery: 'Estimated delivery date',
  shippingCarrier: 'Shipping carrier name (e.g., UPS, FedEx)',

  // Seller
  companyName: 'Seller company name',
  vatNumber: 'VAT/tax registration number',

  // Line items
  items: 'Order line items (repeatable field)',
  itemName: 'Line item product name',
  itemQuantity: 'Line item quantity',
  itemUnitPrice: 'Line item unit price',
  itemTotal: 'Line item total (qty × unit price)',
  itemSku: 'Line item SKU/product code',
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
