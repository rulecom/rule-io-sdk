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
  [SHOPIFY_FIELDS.customerFirstName]: 200001,
  [SHOPIFY_FIELDS.customerEmail]: 200002,
  [SHOPIFY_FIELDS.orderRef]: 200003,
  [SHOPIFY_FIELDS.totalPrice]: 200004,
  [SHOPIFY_FIELDS.items]: 200005,
  [SHOPIFY_FIELDS.shippingAddress]: 200006,
  [SHOPIFY_FIELDS.trackingNumber]: 200007,
  [SHOPIFY_FIELDS.estimatedDelivery]: 200008,
  [SHOPIFY_FIELDS.currency]: 200009,
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

      expect(fields.length).toBe(Object.keys(SHOPIFY_FIELDS).length);

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
      expect(json).toContain('[CustomField:200003]'); // orderRef
      expect(json).toContain('[CustomField:200004]'); // totalPrice
    });

    it('throws RuleConfigError for incomplete config', () => {
      expect(() =>
        shopifyPreset.getAutomations({
          ...TEST_CONFIG,
          customFields: {},
        })
      ).toThrow(RuleConfigError);
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
});

describe('SHOPIFY_TAGS', () => {
  it('all values are non-empty strings', () => {
    for (const value of Object.values(SHOPIFY_TAGS)) {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    }
  });
});
