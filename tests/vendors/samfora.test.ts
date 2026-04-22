/**
 * Samfora Vendor Preset Tests
 */

import { describe, it, expect } from 'vitest';
import type { CustomFieldMap } from '../../src/rcml';
import type { VendorConsumerConfig } from '../../src/vendors/types';
import { RuleConfigError } from '../../src/errors';
import { samforaPreset, SAMFORA_FIELDS, SAMFORA_TAGS } from '../../src/vendors/samfora';
import { TEST_BRAND_STYLE, assertValidRCMLDocument, docToString } from '../helpers';

// ============================================================================
// Shared fixtures
// ============================================================================

/** Core fields required by all automations except the tax summary. */
const TEST_CUSTOM_FIELDS: CustomFieldMap = {
  [SAMFORA_FIELDS.donorFirstName]: 200001,
  [SAMFORA_FIELDS.donationAmount]: 200002,
  [SAMFORA_FIELDS.donationDate]: 200003,
  [SAMFORA_FIELDS.donationRef]: 200004,
  [SAMFORA_FIELDS.causeName]: 200005,
};

/** Extended map that also covers the tax-summary automation. */
const TEST_CUSTOM_FIELDS_FULL: CustomFieldMap = {
  ...TEST_CUSTOM_FIELDS,
  [SAMFORA_FIELDS.donationCurrency]: 200006,
  [SAMFORA_FIELDS.donationType]: 200007,
  [SAMFORA_FIELDS.totalLifetimeAmount]: 200008,
  [SAMFORA_FIELDS.taxYear]: 200009,
  [SAMFORA_FIELDS.taxDeductibleAmount]: 200010,
};

const TEST_CONFIG: VendorConsumerConfig = {
  brandStyle: TEST_BRAND_STYLE,
  customFields: TEST_CUSTOM_FIELDS,
  websiteUrl: 'https://samfora.org',
};

const TEST_CONFIG_FULL: VendorConsumerConfig = {
  brandStyle: TEST_BRAND_STYLE,
  customFields: TEST_CUSTOM_FIELDS_FULL,
  websiteUrl: 'https://samfora.org',
};

// ============================================================================
// Preset metadata
// ============================================================================

describe('samforaPreset', () => {
  it('has correct vendor metadata', () => {
    expect(samforaPreset.vendor).toBe('samfora');
    expect(samforaPreset.displayName).toBe('Samfora');
    expect(samforaPreset.vertical).toBe('donation');
  });

  it('exposes field and tag schemas', () => {
    expect(samforaPreset.fields).toBe(SAMFORA_FIELDS);
    expect(samforaPreset.tags).toBe(SAMFORA_TAGS);
  });

  // ==========================================================================
  // Validation
  // ==========================================================================

  describe('validateConfig', () => {
    it('passes with all required fields', () => {
      expect(() => samforaPreset.validateConfig(TEST_CONFIG)).not.toThrow();
    });

    it('throws RuleConfigError when any required field is missing', () => {
      const incomplete: VendorConsumerConfig = {
        ...TEST_CONFIG,
        customFields: {
          [SAMFORA_FIELDS.donorFirstName]: 200001,
        },
      };
      expect(() => samforaPreset.validateConfig(incomplete)).toThrow(RuleConfigError);
    });

    it('error message lists the missing fields', () => {
      const empty: VendorConsumerConfig = { ...TEST_CONFIG, customFields: {} };
      expect(() => samforaPreset.validateConfig(empty)).toThrow(
        /samforaPreset.*donorFirstName/,
      );
    });

    it('does not require tax-summary fields', () => {
      // Tax fields aren't mapped in TEST_CUSTOM_FIELDS — validateConfig passes.
      expect(() => samforaPreset.validateConfig(TEST_CONFIG)).not.toThrow();
    });
  });

  // ==========================================================================
  // getRequiredFields
  // ==========================================================================

  describe('getRequiredFields', () => {
    it('returns the core required fields with descriptions', () => {
      const fields = samforaPreset.getRequiredFields();
      expect(fields.length).toBeGreaterThan(0);
      for (const field of fields) {
        expect(field.logicalName).toBeTruthy();
        expect(field.fieldName).toBeTruthy();
        expect(field.description).toBeTruthy();
        expect(
          SAMFORA_FIELDS[field.logicalName as keyof typeof SAMFORA_FIELDS],
        ).toBe(field.fieldName);
      }
    });

    it('includes the core donation fields', () => {
      const logicalNames = samforaPreset.getRequiredFields().map((f) => f.logicalName);
      expect(logicalNames).toContain('donorFirstName');
      expect(logicalNames).toContain('donationAmount');
      expect(logicalNames).toContain('donationDate');
      expect(logicalNames).toContain('donationRef');
      expect(logicalNames).toContain('causeName');
    });
  });

  // ==========================================================================
  // getAutomations
  // ==========================================================================

  describe('getAutomations', () => {
    it('returns 6 automations', () => {
      const automations = samforaPreset.getAutomations(TEST_CONFIG_FULL);
      expect(automations).toHaveLength(6);
    });

    it('returns automations with unique IDs', () => {
      const automations = samforaPreset.getAutomations(TEST_CONFIG_FULL);
      const ids = automations.map((a) => a.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('all automations have trigger tags from SAMFORA_TAGS', () => {
      const automations = samforaPreset.getAutomations(TEST_CONFIG_FULL);
      const validTags = new Set(Object.values(SAMFORA_TAGS));
      for (const automation of automations) {
        expect(validTags.has(automation.triggerTag)).toBe(true);
      }
    });

    it('the three confirmation variants share a trigger but differ by condition', () => {
      const automations = samforaPreset.getAutomations(TEST_CONFIG_FULL);
      const confirmations = automations.filter(
        (a) => a.triggerTag === SAMFORA_TAGS.donationReceived,
      );
      expect(confirmations).toHaveLength(3);

      const conditionSignatures = confirmations.map((a) =>
        JSON.stringify(a.conditions ?? {}),
      );
      expect(new Set(conditionSignatures).size).toBe(3);

      const ids = confirmations.map((a) => a.id);
      expect(ids).toContain('samfora-donation-confirmation-first');
      expect(ids).toContain('samfora-donation-confirmation-second');
      expect(ids).toContain('samfora-donation-confirmation-returning');
    });

    it('confirmation variants gate on donor-lifecycle tags', () => {
      const automations = samforaPreset.getAutomations(TEST_CONFIG_FULL);
      const first = automations.find(
        (a) => a.id === 'samfora-donation-confirmation-first',
      )!;
      const second = automations.find(
        (a) => a.id === 'samfora-donation-confirmation-second',
      )!;
      const returning = automations.find(
        (a) => a.id === 'samfora-donation-confirmation-returning',
      )!;

      expect(first.conditions?.hasTag).toEqual([SAMFORA_TAGS.donorFirstGift]);
      expect(second.conditions?.hasTag).toEqual([SAMFORA_TAGS.donorSecondGift]);
      expect(returning.conditions?.hasTag).toEqual([SAMFORA_TAGS.donorReturning]);
    });

    it('all automations produce valid RCML documents (with full fields)', () => {
      const automations = samforaPreset.getAutomations(TEST_CONFIG_FULL);
      for (const automation of automations) {
        const doc = automation.templateBuilder({
          brandStyle: TEST_BRAND_STYLE,
          customFields: TEST_CUSTOM_FIELDS_FULL,
          websiteUrl: 'https://samfora.org',
        });
        assertValidRCMLDocument(doc);
      }
    });

    it('core automations produce valid RCML without the optional tax fields', () => {
      // Skip the tax-summary automation, which legitimately requires tax fields.
      const automations = samforaPreset
        .getAutomations(TEST_CONFIG)
        .filter((a) => a.id !== 'samfora-annual-tax-summary');

      for (const automation of automations) {
        const doc = automation.templateBuilder({
          brandStyle: TEST_BRAND_STYLE,
          customFields: TEST_CUSTOM_FIELDS,
          websiteUrl: 'https://samfora.org',
        });
        assertValidRCMLDocument(doc);
      }
    });

    it('tax-summary template throws when its extra fields are missing', () => {
      const automations = samforaPreset.getAutomations(TEST_CONFIG);
      const taxSummary = automations.find(
        (a) => a.id === 'samfora-annual-tax-summary',
      )!;

      expect(() =>
        taxSummary.templateBuilder({
          brandStyle: TEST_BRAND_STYLE,
          customFields: TEST_CUSTOM_FIELDS,
          websiteUrl: 'https://samfora.org',
        }),
      ).toThrow(/taxYear|totalLifetimeAmount|taxDeductibleAmount/);
    });

    it('templateBuilder honors TemplateConfigV2 overrides', () => {
      const automations = samforaPreset.getAutomations(TEST_CONFIG_FULL);
      const first = automations.find(
        (a) => a.id === 'samfora-donation-confirmation-first',
      )!;

      const doc = first.templateBuilder({
        brandStyle: TEST_BRAND_STYLE,
        customFields: {
          ...TEST_CUSTOM_FIELDS_FULL,
          [SAMFORA_FIELDS.donationAmount]: 999999,
        },
        websiteUrl: 'https://override.example.com',
      });
      const json = docToString(doc);

      expect(json).toContain('[CustomField:999999]');
      expect(json).not.toContain('[CustomField:200002]');
    });

    it('RCML contains Samfora field placeholders', () => {
      const automations = samforaPreset.getAutomations(TEST_CONFIG_FULL);
      const first = automations.find(
        (a) => a.id === 'samfora-donation-confirmation-first',
      )!;

      const doc = first.templateBuilder({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS_FULL,
        websiteUrl: 'https://samfora.org',
      });
      const json = docToString(doc);

      expect(json).toContain('[CustomField:200001]'); // donorFirstName
      expect(json).toContain('[CustomField:200002]'); // donationAmount
      expect(json).toContain('[CustomField:200005]'); // causeName
    });

    it('default copy is in Swedish', () => {
      const automations = samforaPreset.getAutomations(TEST_CONFIG_FULL);
      const first = automations.find(
        (a) => a.id === 'samfora-donation-confirmation-first',
      )!;

      expect(first.subject).toContain('Tack');
      const doc = first.templateBuilder({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS_FULL,
        websiteUrl: 'https://samfora.org',
      });
      const json = docToString(doc);
      expect(json).toContain('Tack för din första gåva');
      expect(json).toContain('Ändamål');
    });

    it('throws RuleConfigError for an incomplete config', () => {
      expect(() =>
        samforaPreset.getAutomations({ ...TEST_CONFIG, customFields: {} }),
      ).toThrow(RuleConfigError);
    });
  });

  // ==========================================================================
  // getAutomation
  // ==========================================================================

  describe('getAutomation', () => {
    it('returns a single automation by ID', () => {
      const automation = samforaPreset.getAutomation(
        'samfora-welcome',
        TEST_CONFIG,
      );
      expect(automation).toBeDefined();
      expect(automation!.id).toBe('samfora-welcome');
    });

    it('returns undefined for an unknown ID', () => {
      const automation = samforaPreset.getAutomation('nonexistent', TEST_CONFIG);
      expect(automation).toBeUndefined();
    });
  });
});

// ============================================================================
// Field and tag constants
// ============================================================================

describe('SAMFORA_FIELDS', () => {
  it('all values are non-empty strings', () => {
    for (const value of Object.values(SAMFORA_FIELDS)) {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it('all values use the Donation.* prefix', () => {
    for (const value of Object.values(SAMFORA_FIELDS)) {
      expect(value.startsWith('Donation.')).toBe(true);
    }
  });
});

describe('SAMFORA_TAGS', () => {
  it('all values are non-empty strings', () => {
    for (const value of Object.values(SAMFORA_TAGS)) {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it('all values are unique', () => {
    const values = Object.values(SAMFORA_TAGS);
    expect(new Set(values).size).toBe(values.length);
  });
});
