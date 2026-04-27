/**
 * Shopify Vendor Preset Tests
 */

import { describe, it, expect } from 'vitest';
import type { CustomFieldMap } from '@rule-io/rcml';
import type { VendorConsumerConfig } from '@rule-io/rcml';
import { RuleConfigError } from '@rule-io/core';
import { shopifyPreset, SHOPIFY_FIELDS, SHOPIFY_TAGS } from '../src/index.js';
import { TEST_BRAND_STYLE, assertValidRCMLDocument } from './helpers.js';

// ============================================================================
// Shared fixtures
// ============================================================================

const TEST_CUSTOM_FIELDS: CustomFieldMap = {
  // Subscriber fields
  [SHOPIFY_FIELDS.firstName]: 200001,
  [SHOPIFY_FIELDS.lastName]: 200002,
  // Order fields
  [SHOPIFY_FIELDS.orderNumber]: 200003,
  [SHOPIFY_FIELDS.orderDate]: 200004,
  [SHOPIFY_FIELDS.totalPrice]: 200005,
  [SHOPIFY_FIELDS.totalTax]: 200006,
  [SHOPIFY_FIELDS.totalWeight]: 200007,
  [SHOPIFY_FIELDS.discount]: 200008,
  [SHOPIFY_FIELDS.currency]: 200009,
  [SHOPIFY_FIELDS.gateway]: 200010,
  [SHOPIFY_FIELDS.productCount]: 200011,
  [SHOPIFY_FIELDS.names]: 200012,
  [SHOPIFY_FIELDS.skus]: 200013,
  [SHOPIFY_FIELDS.products]: 200014,
  [SHOPIFY_FIELDS.cartUrl]: 200015,
  // Shipping address
  [SHOPIFY_FIELDS.shippingAddress1]: 200016,
  [SHOPIFY_FIELDS.shippingAddress2]: 200017,
  [SHOPIFY_FIELDS.shippingCity]: 200018,
  [SHOPIFY_FIELDS.shippingZip]: 200019,
  [SHOPIFY_FIELDS.shippingCountryCode]: 200020,
};

const TEST_CONFIG: VendorConsumerConfig = {
  brandStyle: TEST_BRAND_STYLE,
  customFields: TEST_CUSTOM_FIELDS,
  websiteUrl: 'https://myshop.example.com',
};

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

    it('passes without optional fields and builds all templates', () => {
      const minimalConfig: VendorConsumerConfig = {
        ...TEST_CONFIG,
        customFields: {
          [SHOPIFY_FIELDS.firstName]: 1,
          [SHOPIFY_FIELDS.orderNumber]: 2,
          [SHOPIFY_FIELDS.totalPrice]: 3,
        },
      };
      expect(() => {
        shopifyPreset.validateConfig(minimalConfig);
        // Ensure automations (and their templates) build with minimal config
        shopifyPreset.getAutomations(minimalConfig);
      }).not.toThrow();
    });

    it('throws RuleConfigError when fields are missing', () => {
      const incompleteConfig: VendorConsumerConfig = {
        ...TEST_CONFIG,
        customFields: {
          [SHOPIFY_FIELDS.firstName]: 200001,
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
        /shopifyPreset.*firstName/
      );
    });
  });

  // ============================================================================
  // getRequiredFields
  // ============================================================================

  describe('getRequiredFields', () => {
    it('returns all required fields with descriptions', () => {
      const fields = shopifyPreset.getRequiredFields();

      expect(fields.length).toBe(3);

      for (const field of fields) {
        expect(field.logicalName).toBeTruthy();
        expect(field.fieldName).toBeTruthy();
        expect(field.description).toBeTruthy();
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
    it('returns 5 automations', () => {
      const automations = shopifyPreset.getAutomations(TEST_CONFIG);
      expect(automations).toHaveLength(5);
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
        [SHOPIFY_FIELDS.orderNumber]: 999999,
      };

      const doc = orderConfirmation.templateBuilder({
        brandStyle: TEST_BRAND_STYLE,
        customFields: overriddenFields,
        websiteUrl: 'https://override.example.com',
      });
      const json = JSON.stringify(doc);

      // Should use the overridden field ID, not the original
      expect(json).toContain('[CustomField:999999]');
      expect(json).not.toContain('[CustomField:200003]');
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
      expect(json).toContain('[CustomField:200003]'); // orderNumber
      expect(json).toContain('[CustomField:200005]'); // totalPrice
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
      expect(json).toContain('200014'); // Products field ID
      expect(json).toContain('[LoopValue:name]'); // loop sub-field
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
      expect(json).toContain('200014'); // Products loop

      // Receipt fields
      expect(json).toContain('200008'); // Discount
      expect(json).toContain('200006'); // TotalTax
      expect(json).toContain('200005'); // TotalPrice

      // Legal text
      expect(json).toContain('official receipt');
    });

    it('order cancellation produces valid RCML with field placeholders', () => {
      const automations = shopifyPreset.getAutomations(TEST_CONFIG);
      const cancellation = automations.find(
        (a) => a.id === 'shopify-order-cancellation'
      )!;

      expect(cancellation).toBeDefined();
      expect(cancellation.triggerTag).toBe(SHOPIFY_TAGS.orderCancelled);

      const doc = cancellation.templateBuilder({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://myshop.example.com',
      });
      assertValidRCMLDocument(doc);

      const json = JSON.stringify(doc);
      expect(json).toContain('[CustomField:200001]'); // firstName
      expect(json).toContain('[CustomField:200003]'); // orderNumber
    });

    it('welcome automation uses newsletter trigger tag', () => {
      const automations = shopifyPreset.getAutomations(TEST_CONFIG);
      const welcome = automations.find((a) => a.id === 'shopify-welcome');

      expect(welcome).toBeDefined();
      expect(welcome!.triggerTag).toBe(SHOPIFY_TAGS.newsletter);
      expect(welcome!.delayInSeconds).toBeUndefined();

      const doc = welcome!.templateBuilder({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://myshop.example.com',
      });
      assertValidRCMLDocument(doc);

      const json = JSON.stringify(doc);
      expect(json).toContain('Welcome!');
      expect(json).toContain('[CustomField:200001]'); // Subscriber.FirstName
      expect(json).toContain('https://myshop.example.com');
    });

    it('welcome automation builds with the preset-required fields only', () => {
      // shopifyPreset.validateConfig requires firstName + orderNumber +
      // totalPrice — orderNumber and totalPrice are for the order-flow
      // automations; the welcome template itself only uses firstName.
      const minimal: VendorConsumerConfig = {
        brandStyle: TEST_BRAND_STYLE,
        customFields: {
          [SHOPIFY_FIELDS.firstName]: 1,
          [SHOPIFY_FIELDS.orderNumber]: 2,
          [SHOPIFY_FIELDS.totalPrice]: 3,
        },
        websiteUrl: 'https://myshop.example.com',
      };
      const welcome = shopifyPreset.getAutomations(minimal).find(
        (a) => a.id === 'shopify-welcome'
      )!;
      expect(() => welcome.templateBuilder(minimal)).not.toThrow();
    });

    it('abandoned cart has delay and conditions', () => {
      const automations = shopifyPreset.getAutomations(TEST_CONFIG);
      const abandonedCart = automations.find((a) => a.id === 'shopify-abandoned-cart')!;

      expect(abandonedCart.delayInSeconds).toBe('3600');
      expect(abandonedCart.conditions?.notHasTag).toContain(SHOPIFY_TAGS.orderCompleted);
      expect(abandonedCart.conditions?.notHasTag).toContain(SHOPIFY_TAGS.orderCancelled);
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

  it('has 31 fields', () => {
    expect(Object.keys(SHOPIFY_FIELDS)).toHaveLength(31);
  });
});

describe('SHOPIFY_TAGS', () => {
  it('all values are non-empty strings', () => {
    for (const value of Object.values(SHOPIFY_TAGS)) {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it('has 5 tags', () => {
    expect(Object.keys(SHOPIFY_TAGS)).toHaveLength(5);
  });
});
