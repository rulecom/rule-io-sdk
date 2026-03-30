/**
 * Shopify Vendor Preset Tests
 */

import { describe, it, expect } from 'vitest';
import type { RCMLDocument } from '../../src/types';
import type { BrandStyleConfig, CustomFieldMap } from '../../src/rcml';
import type { VendorConsumerConfig } from '../../src/vendors/types';
import { RuleConfigError } from '../../src/errors';
import { shopifyPreset, SHOPIFY_FIELDS, SHOPIFY_TAGS } from '../../src/vendors/shopify';

// ============================================================================
// Shared fixtures
// ============================================================================

const TEST_BRAND_STYLE: BrandStyleConfig = {
  brandStyleId: '99999',
  logoUrl: 'https://example.com/logo.png',
  buttonColor: '#0066CC',
  bodyBackgroundColor: '#f3f3f3',
  sectionBackgroundColor: '#ffffff',
  brandColor: '#f6f8f9',
  headingFont: "'Helvetica Neue', sans-serif",
  headingFontUrl: 'https://app.rule.io/brand-style/99999/font/1/css',
  bodyFont: "'Arial', sans-serif",
  bodyFontUrl: 'https://app.rule.io/brand-style/99999/font/2/css',
  textColor: '#1A1A1A',
};

const TEST_CUSTOM_FIELDS: CustomFieldMap = {
  // Customer
  [SHOPIFY_FIELDS.customerFirstName]: 200001,
  [SHOPIFY_FIELDS.customerFullName]: 200002,
  [SHOPIFY_FIELDS.customerEmail]: 200003,
  // Order
  [SHOPIFY_FIELDS.orderRef]: 200004,
  [SHOPIFY_FIELDS.orderDate]: 200005,
  [SHOPIFY_FIELDS.currency]: 200006,
  [SHOPIFY_FIELDS.paymentMethod]: 200007,
  // Financials
  [SHOPIFY_FIELDS.subtotal]: 200008,
  [SHOPIFY_FIELDS.discountAmount]: 200009,
  [SHOPIFY_FIELDS.taxAmount]: 200010,
  [SHOPIFY_FIELDS.shippingCost]: 200011,
  [SHOPIFY_FIELDS.totalPrice]: 200012,
  // Shipping
  [SHOPIFY_FIELDS.shippingAddress]: 200013,
  [SHOPIFY_FIELDS.billingAddress]: 200014,
  [SHOPIFY_FIELDS.trackingNumber]: 200015,
  [SHOPIFY_FIELDS.estimatedDelivery]: 200016,
  [SHOPIFY_FIELDS.shippingCarrier]: 200017,
  // Seller
  [SHOPIFY_FIELDS.companyName]: 200018,
  [SHOPIFY_FIELDS.vatNumber]: 200019,
  // Line items
  [SHOPIFY_FIELDS.items]: 200020,
  [SHOPIFY_FIELDS.itemName]: 200021,
  [SHOPIFY_FIELDS.itemQuantity]: 200022,
  [SHOPIFY_FIELDS.itemUnitPrice]: 200023,
  [SHOPIFY_FIELDS.itemTotal]: 200024,
  [SHOPIFY_FIELDS.itemSku]: 200025,
};

const TEST_CONFIG: VendorConsumerConfig = {
  brandStyle: TEST_BRAND_STYLE,
  customFields: TEST_CUSTOM_FIELDS,
  websiteUrl: 'https://myshop.example.com',
};

function assertValidRCMLDocument(doc: RCMLDocument): void {
  expect(doc.tagName).toBe('rcml');
  expect(doc.children).toHaveLength(2);
  expect(doc.children[0].tagName).toBe('rc-head');
  expect(doc.children[1].tagName).toBe('rc-body');
  expect(doc.children[1].children.length).toBeGreaterThan(0);
}

// ============================================================================
// Preset metadata
// ============================================================================

describe('shopifyPreset', () => {
  it('has correct vendor metadata', () => {
    expect(shopifyPreset.vendor).toBe('shopify');
    expect(shopifyPreset.displayName).toBe('Shopify');
    expect(shopifyPreset.vertical).toBe('ecommerce');
  });

  it('exposes field and tag schemas', () => {
    expect(shopifyPreset.fields).toBe(SHOPIFY_FIELDS);
    expect(shopifyPreset.tags).toBe(SHOPIFY_TAGS);
  });

  // ============================================================================
  // Validation
  // ============================================================================

  describe('validateConfig', () => {
    it('passes with all required fields', () => {
      expect(() => shopifyPreset.validateConfig(TEST_CONFIG)).not.toThrow();
    });

    it('passes without new optional fields (backward compat)', () => {
      const minimalConfig: VendorConsumerConfig = {
        ...TEST_CONFIG,
        customFields: {
          [SHOPIFY_FIELDS.customerFirstName]: 1,
          [SHOPIFY_FIELDS.orderRef]: 2,
          [SHOPIFY_FIELDS.totalPrice]: 3,
          [SHOPIFY_FIELDS.items]: 4,
          [SHOPIFY_FIELDS.shippingAddress]: 5,
          [SHOPIFY_FIELDS.trackingNumber]: 6,
          [SHOPIFY_FIELDS.estimatedDelivery]: 7,
          // All new fields omitted
        },
      };
      expect(() => shopifyPreset.validateConfig(minimalConfig)).not.toThrow();
    });

    it('passes without optional fields (customerEmail, currency)', () => {
      const configWithoutOptional: VendorConsumerConfig = {
        ...TEST_CONFIG,
        customFields: {
          [SHOPIFY_FIELDS.customerFirstName]: 200001,
          [SHOPIFY_FIELDS.orderRef]: 200003,
          [SHOPIFY_FIELDS.totalPrice]: 200004,
          [SHOPIFY_FIELDS.items]: 200005,
          [SHOPIFY_FIELDS.shippingAddress]: 200006,
          [SHOPIFY_FIELDS.trackingNumber]: 200007,
          [SHOPIFY_FIELDS.estimatedDelivery]: 200008,
          // customerEmail and currency omitted
        },
      };
      expect(() => shopifyPreset.validateConfig(configWithoutOptional)).not.toThrow();
    });

    it('throws RuleConfigError when fields are missing', () => {
      const incompleteConfig: VendorConsumerConfig = {
        ...TEST_CONFIG,
        customFields: {
          [SHOPIFY_FIELDS.customerFirstName]: 200001,
          // missing all others
        },
      };

      expect(() => shopifyPreset.validateConfig(incompleteConfig)).toThrow(RuleConfigError);
    });

    it('error message lists the missing fields', () => {
      const incompleteConfig: VendorConsumerConfig = {
        ...TEST_CONFIG,
        customFields: {},
      };

      expect(() => shopifyPreset.validateConfig(incompleteConfig)).toThrow(
        /shopifyPreset.*customerFirstName/
      );
    });
  });

  // ============================================================================
  // getRequiredFields
  // ============================================================================

  describe('getRequiredFields', () => {
    it('returns all fields with descriptions', () => {
      const fields = shopifyPreset.getRequiredFields();

      // Only fields used by automations are required (excludes customerEmail, currency)
      expect(fields.length).toBe(7);

      for (const field of fields) {
        expect(field.logicalName).toBeTruthy();
        expect(field.fieldName).toBeTruthy();
        expect(field.description).toBeTruthy();
        // fieldName should match what's in the schema
        expect(SHOPIFY_FIELDS[field.logicalName as keyof typeof SHOPIFY_FIELDS]).toBe(
          field.fieldName
        );
      }
    });
  });

  // ============================================================================
  // getAutomations
  // ============================================================================

  describe('getAutomations', () => {
    it('returns 4 automations', () => {
      const automations = shopifyPreset.getAutomations(TEST_CONFIG);
      expect(automations).toHaveLength(4);
    });

    it('returns automations with unique IDs', () => {
      const automations = shopifyPreset.getAutomations(TEST_CONFIG);
      const ids = automations.map((a) => a.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('all automations have trigger tags from SHOPIFY_TAGS', () => {
      const automations = shopifyPreset.getAutomations(TEST_CONFIG);
      const validTags = new Set(Object.values(SHOPIFY_TAGS));

      for (const automation of automations) {
        expect(validTags.has(automation.triggerTag)).toBe(true);
      }
    });

    it('all automations produce valid RCML documents', () => {
      const automations = shopifyPreset.getAutomations(TEST_CONFIG);

      for (const automation of automations) {
        const doc = automation.templateBuilder({
          brandStyle: TEST_BRAND_STYLE,
          customFields: TEST_CUSTOM_FIELDS,
          websiteUrl: 'https://myshop.example.com',
        });
        assertValidRCMLDocument(doc);
      }
    });

    it('templateBuilder honors TemplateConfigV2 overrides', () => {
      const automations = shopifyPreset.getAutomations(TEST_CONFIG);
      const orderConfirmation = automations.find(
        (a) => a.id === 'shopify-order-confirmation'
      )!;

      const overriddenFields: CustomFieldMap = {
        ...TEST_CUSTOM_FIELDS,
        [SHOPIFY_FIELDS.orderRef]: 999999,
      };

      const doc = orderConfirmation.templateBuilder({
        brandStyle: TEST_BRAND_STYLE,
        customFields: overriddenFields,
        websiteUrl: 'https://override.example.com',
      });
      const json = JSON.stringify(doc);

      // Should use the overridden field ID, not the original
      expect(json).toContain('[CustomField:999999]');
      expect(json).not.toContain('[CustomField:200004]');
    });

    it('RCML contains Shopify field placeholders', () => {
      const automations = shopifyPreset.getAutomations(TEST_CONFIG);
      const orderConfirmation = automations.find(
        (a) => a.id === 'shopify-order-confirmation'
      )!;

      const doc = orderConfirmation.templateBuilder({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://myshop.example.com',
      });
      const json = JSON.stringify(doc);

      // Should contain field ID placeholders
      expect(json).toContain('[CustomField:200004]'); // orderRef
      expect(json).toContain('[CustomField:200012]'); // totalPrice
    });

    it('throws RuleConfigError for incomplete config', () => {
      expect(() =>
        shopifyPreset.getAutomations({
          ...TEST_CONFIG,
          customFields: {},
        })
      ).toThrow(RuleConfigError);
    });

    it('order confirmation contains rc-loop for line items', () => {
      const automations = shopifyPreset.getAutomations(TEST_CONFIG);
      const orderConfirmation = automations.find(
        (a) => a.id === 'shopify-order-confirmation'
      )!;

      const doc = orderConfirmation.templateBuilder({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://myshop.example.com',
      });
      const json = JSON.stringify(doc);

      expect(json).toContain('rc-loop');
      expect(json).toContain('custom-field');
      expect(json).toContain('200020'); // Items field ID
      expect(json).toContain('200021'); // Item Name
    });

    it('shipping update contains rc-loop and receipt fields', () => {
      const automations = shopifyPreset.getAutomations(TEST_CONFIG);
      const shippingUpdate = automations.find(
        (a) => a.id === 'shopify-shipping-update'
      )!;

      const doc = shippingUpdate.templateBuilder({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://myshop.example.com',
      });
      const json = JSON.stringify(doc);

      // Loop
      expect(json).toContain('rc-loop');
      expect(json).toContain('200020'); // Items loop

      // Receipt fields
      expect(json).toContain('200008'); // Subtotal
      expect(json).toContain('200010'); // Tax
      expect(json).toContain('200012'); // Total
      expect(json).toContain('200018'); // CompanyName
      expect(json).toContain('200019'); // VATNumber

      // Legal text
      expect(json).toContain('official receipt');
    });

    it('abandoned cart has delay and conditions', () => {
      const automations = shopifyPreset.getAutomations(TEST_CONFIG);
      const abandonedCart = automations.find((a) => a.id === 'shopify-abandoned-cart')!;

      expect(abandonedCart.delayInSeconds).toBe('3600');
      expect(abandonedCart.conditions?.notHasTag).toContain(SHOPIFY_TAGS.orderCompleted);
    });
  });

  // ============================================================================
  // getAutomation
  // ============================================================================

  describe('getAutomation', () => {
    it('returns a single automation by ID', () => {
      const automation = shopifyPreset.getAutomation(
        'shopify-order-confirmation',
        TEST_CONFIG
      );
      expect(automation).toBeDefined();
      expect(automation!.id).toBe('shopify-order-confirmation');
    });

    it('returns undefined for unknown ID', () => {
      const automation = shopifyPreset.getAutomation('nonexistent', TEST_CONFIG);
      expect(automation).toBeUndefined();
    });
  });
});

// ============================================================================
// Field and tag constants
// ============================================================================

describe('SHOPIFY_FIELDS', () => {
  it('all values are non-empty strings', () => {
    for (const value of Object.values(SHOPIFY_FIELDS)) {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it('has 25 fields (9 original + 16 new)', () => {
    expect(Object.keys(SHOPIFY_FIELDS)).toHaveLength(25);
  });
});

describe('SHOPIFY_TAGS', () => {
  it('all values are non-empty strings', () => {
    for (const value of Object.values(SHOPIFY_TAGS)) {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    }
  });
});
