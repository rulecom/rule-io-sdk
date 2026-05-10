/**
 * Samfora Vendor Preset Tests
 */

import { describe, it, expect } from 'vitest';
import type { CustomFieldMap } from '@rule-io/core';
import type { VendorConsumerConfig } from '@rule-io/core';
import { RuleConfigError } from '@rule-io/core';
import { samforaPreset, SAMFORA_FIELDS, SAMFORA_TAGS } from '../src/index.js';
import { TEST_THEME } from '../src/test-fixtures.js';

// ============================================================================
// Shared fixtures
// ============================================================================

const TEST_CUSTOM_FIELDS: CustomFieldMap = {
  [SAMFORA_FIELDS.donorFirstName]: 200001,
  [SAMFORA_FIELDS.donationAmount]: 200002,
  [SAMFORA_FIELDS.donationDate]: 200003,
  [SAMFORA_FIELDS.donationRef]: 200004,
  [SAMFORA_FIELDS.causeName]: 200005,
  [SAMFORA_FIELDS.totalLifetimeAmount]: 200008,
  [SAMFORA_FIELDS.taxYear]: 200009,
  [SAMFORA_FIELDS.taxDeductibleAmount]: 200010,
};

const TEST_CONFIG: VendorConsumerConfig = {
  theme: TEST_THEME,
  customFields: TEST_CUSTOM_FIELDS,
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
  });

  // ==========================================================================
  // getAutomations
  // ==========================================================================

  describe('getAutomations', () => {
    // The pre-built automation entries have been retired. Template
    // authors now build contexts directly via the factory functions
    // (createDonationConfirmationFirstTemplate, etc.) and wire
    // automations through @rule-io/client. See
    // packages/templates/README.md for the authoring pattern.
    it('returns an empty list (pre-built automations retired)', () => {
      const automations = samforaPreset.getAutomations(TEST_CONFIG);

      expect(automations).toHaveLength(0);
    });
  });

  // ==========================================================================
  // getAutomation
  // ==========================================================================

  describe('getAutomation', () => {
    it('returns undefined for any ID (no automations defined)', () => {
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

  it('splits fields between the flat Subscriber group and the historical Donation group', () => {
    // Rule.io praxis: donor identity on the flat Subscriber.* group
    // (overwritten per sync); per-donation event data on the historical
    // Donation.* group (appended per sync).
    const subscriberFields = [
      SAMFORA_FIELDS.donorFirstName,
      SAMFORA_FIELDS.donorLastName,
      SAMFORA_FIELDS.donorAddress1,
      SAMFORA_FIELDS.donorAddress2,
      SAMFORA_FIELDS.donorZipcode,
      SAMFORA_FIELDS.donorCity,
      SAMFORA_FIELDS.donorCountry,
      SAMFORA_FIELDS.donorPhone,
      SAMFORA_FIELDS.donorSource,
    ];

    for (const value of subscriberFields) {
      expect(value.startsWith('Subscriber.')).toBe(true);
    }

    const donationFields = [
      SAMFORA_FIELDS.donationAmount,
      SAMFORA_FIELDS.donationCurrency,
      SAMFORA_FIELDS.donationDate,
      SAMFORA_FIELDS.donationRef,
      SAMFORA_FIELDS.causeName,
      SAMFORA_FIELDS.donationType,
      SAMFORA_FIELDS.totalLifetimeAmount,
      SAMFORA_FIELDS.taxYear,
      SAMFORA_FIELDS.taxDeductibleAmount,
    ];

    for (const value of donationFields) {
      expect(value.startsWith('Donation.')).toBe(true);
    }
  });

  it('uses Rule.io standard Subscriber field names exactly', () => {
    // These must match Rule.io's pre-seeded standard subscriber field
    // names so consumers don't have to create new custom fields.
    expect(SAMFORA_FIELDS.donorFirstName).toBe('Subscriber.FirstName');
    expect(SAMFORA_FIELDS.donorLastName).toBe('Subscriber.LastName');
    expect(SAMFORA_FIELDS.donorAddress1).toBe('Subscriber.Address1');
    expect(SAMFORA_FIELDS.donorAddress2).toBe('Subscriber.Address2');
    expect(SAMFORA_FIELDS.donorZipcode).toBe('Subscriber.Zipcode');
    expect(SAMFORA_FIELDS.donorCity).toBe('Subscriber.City');
    expect(SAMFORA_FIELDS.donorCountry).toBe('Subscriber.Country');
    expect(SAMFORA_FIELDS.donorPhone).toBe('Subscriber.Number');
    expect(SAMFORA_FIELDS.donorSource).toBe('Subscriber.Source');
  });

  it('every field uses either a Subscriber.* or Donation.* prefix', () => {
    for (const value of Object.values(SAMFORA_FIELDS)) {
      expect(/^(Subscriber|Donation)\./.test(value)).toBe(true);
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
