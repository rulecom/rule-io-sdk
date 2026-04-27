/**
 * Bookzen Vendor Preset Tests
 */

import { describe, it, expect } from 'vitest';
import type { CustomFieldMap } from '../../src/rcml/index.js';
import type { VendorConsumerConfig } from '../../src/vendors/types.js';
import { RuleConfigError } from '../../src/errors.js';
import { bookzenPreset, BOOKZEN_FIELDS, BOOKZEN_TAGS } from '../../src/vendors/bookzen/index.js';
import { TEST_BRAND_STYLE, assertValidRCMLDocument } from '../helpers.js';

// ============================================================================
// Shared fixtures
// ============================================================================

const TEST_CUSTOM_FIELDS: CustomFieldMap = {
  [BOOKZEN_FIELDS.guestFirstName]: 100001,
  [BOOKZEN_FIELDS.bookingRef]: 100002,
  [BOOKZEN_FIELDS.serviceType]: 100003,
  [BOOKZEN_FIELDS.checkInDate]: 100004,
  [BOOKZEN_FIELDS.checkOutDate]: 100005,
  [BOOKZEN_FIELDS.totalGuests]: 100006,
  [BOOKZEN_FIELDS.totalPrice]: 100007,
  [BOOKZEN_FIELDS.roomName]: 100008,
};

const TEST_CONFIG: VendorConsumerConfig = {
  brandStyle: TEST_BRAND_STYLE,
  customFields: TEST_CUSTOM_FIELDS,
  websiteUrl: 'https://myhotel.example.com',
};

// ============================================================================
// Preset metadata
// ============================================================================

describe('bookzenPreset', () => {
  it('has correct vendor metadata', () => {
    expect(bookzenPreset.vendor).toBe('bookzen');
    expect(bookzenPreset.displayName).toBe('Bookzen');
    expect(bookzenPreset.vertical).toBe('hospitality');
  });

  it('exposes field and tag schemas', () => {
    expect(bookzenPreset.fields).toBe(BOOKZEN_FIELDS);
    expect(bookzenPreset.tags).toBe(BOOKZEN_TAGS);
  });

  // ============================================================================
  // Validation
  // ============================================================================

  describe('validateConfig', () => {
    it('passes with all required fields', () => {
      expect(() => bookzenPreset.validateConfig(TEST_CONFIG)).not.toThrow();
    });

    it('throws RuleConfigError when fields are missing', () => {
      const incompleteConfig: VendorConsumerConfig = {
        ...TEST_CONFIG,
        customFields: {
          [BOOKZEN_FIELDS.guestFirstName]: 100001,
        },
      };

      expect(() => bookzenPreset.validateConfig(incompleteConfig)).toThrow(RuleConfigError);
    });

    it('error message lists the missing fields', () => {
      const incompleteConfig: VendorConsumerConfig = {
        ...TEST_CONFIG,
        customFields: {},
      };

      expect(() => bookzenPreset.validateConfig(incompleteConfig)).toThrow(
        /bookzenPreset.*guestFirstName/
      );
    });
  });

  // ============================================================================
  // getRequiredFields
  // ============================================================================

  describe('getRequiredFields', () => {
    it('returns all fields with descriptions', () => {
      const fields = bookzenPreset.getRequiredFields();

      expect(fields.length).toBe(Object.keys(BOOKZEN_FIELDS).length);

      for (const field of fields) {
        expect(field.logicalName).toBeTruthy();
        expect(field.fieldName).toBeTruthy();
        expect(field.description).toBeTruthy();
        expect(BOOKZEN_FIELDS[field.logicalName as keyof typeof BOOKZEN_FIELDS]).toBe(
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
      const automations = bookzenPreset.getAutomations(TEST_CONFIG);
      expect(automations).toHaveLength(5);
    });

    it('returns automations with unique IDs', () => {
      const automations = bookzenPreset.getAutomations(TEST_CONFIG);
      const ids = automations.map((a) => a.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('returns automations with unique trigger tags', () => {
      const automations = bookzenPreset.getAutomations(TEST_CONFIG);
      const triggerTags = automations.map((a) => a.triggerTag);
      expect(new Set(triggerTags).size).toBe(triggerTags.length);
    });

    it('all automations have trigger tags from BOOKZEN_TAGS', () => {
      const automations = bookzenPreset.getAutomations(TEST_CONFIG);
      const validTags = new Set(Object.values(BOOKZEN_TAGS));

      for (const automation of automations) {
        expect(validTags.has(automation.triggerTag)).toBe(true);
      }
    });

    it('all automations produce valid RCML documents', () => {
      const automations = bookzenPreset.getAutomations(TEST_CONFIG);

      for (const automation of automations) {
        const doc = automation.templateBuilder({
          brandStyle: TEST_BRAND_STYLE,
          customFields: TEST_CUSTOM_FIELDS,
          websiteUrl: 'https://myhotel.example.com',
        });
        assertValidRCMLDocument(doc);
      }
    });

    it('templateBuilder honors TemplateConfigV2 overrides', () => {
      const automations = bookzenPreset.getAutomations(TEST_CONFIG);
      const confirmation = automations.find(
        (a) => a.id === 'bookzen-reservation-confirmation'
      )!;

      const overriddenFields: CustomFieldMap = {
        ...TEST_CUSTOM_FIELDS,
        [BOOKZEN_FIELDS.bookingRef]: 999999,
      };

      const doc = confirmation.templateBuilder({
        brandStyle: TEST_BRAND_STYLE,
        customFields: overriddenFields,
        websiteUrl: 'https://override.example.com',
      });
      const json = JSON.stringify(doc);

      // Should use the overridden field ID, not the original
      expect(json).toContain('[CustomField:999999]');
      expect(json).not.toContain('[CustomField:100002]');
    });

    it('RCML contains Bookzen field placeholders', () => {
      const automations = bookzenPreset.getAutomations(TEST_CONFIG);
      const confirmation = automations.find(
        (a) => a.id === 'bookzen-reservation-confirmation'
      )!;

      const doc = confirmation.templateBuilder({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://myhotel.example.com',
      });
      const json = JSON.stringify(doc);

      expect(json).toContain('[CustomField:100002]'); // bookingRef
      expect(json).toContain('[CustomField:100004]'); // checkInDate
    });

    it('throws RuleConfigError for incomplete config', () => {
      expect(() =>
        bookzenPreset.getAutomations({
          ...TEST_CONFIG,
          customFields: {},
        })
      ).toThrow(RuleConfigError);
    });

    it('reminder has a delay', () => {
      const automations = bookzenPreset.getAutomations(TEST_CONFIG);
      const reminder = automations.find((a) => a.id === 'bookzen-reservation-reminder')!;

      expect(reminder.delayInSeconds).toBe('86400');
    });

    it('feedback request has a delay', () => {
      const automations = bookzenPreset.getAutomations(TEST_CONFIG);
      const feedback = automations.find((a) => a.id === 'bookzen-feedback-request')!;

      expect(feedback.delayInSeconds).toBe('172800');
    });
  });

  // ============================================================================
  // getAutomation
  // ============================================================================

  describe('getAutomation', () => {
    it('returns a single automation by ID', () => {
      const automation = bookzenPreset.getAutomation(
        'bookzen-reservation-confirmation',
        TEST_CONFIG
      );
      expect(automation).toBeDefined();
      expect(automation!.id).toBe('bookzen-reservation-confirmation');
    });

    it('returns undefined for unknown ID', () => {
      const automation = bookzenPreset.getAutomation('nonexistent', TEST_CONFIG);
      expect(automation).toBeUndefined();
    });
  });
});

// ============================================================================
// Field and tag constants
// ============================================================================

describe('BOOKZEN_FIELDS', () => {
  it('all values are non-empty strings', () => {
    for (const value of Object.values(BOOKZEN_FIELDS)) {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it('splits fields between the flat Subscriber group and the historical Booking group', () => {
    // Rule.io praxis: guest identity on the flat Subscriber.* group
    // (overwritten per sync); per-booking event data on the historical
    // Booking.* group (appended per sync).
    expect(BOOKZEN_FIELDS.guestFirstName).toBe('Subscriber.FirstName');

    const bookingFields = [
      BOOKZEN_FIELDS.bookingRef,
      BOOKZEN_FIELDS.serviceType,
      BOOKZEN_FIELDS.checkInDate,
      BOOKZEN_FIELDS.checkOutDate,
      BOOKZEN_FIELDS.totalGuests,
      BOOKZEN_FIELDS.totalPrice,
      BOOKZEN_FIELDS.roomName,
    ];
    for (const value of bookingFields) {
      expect(value.startsWith('Booking.')).toBe(true);
    }
  });

  it('every field uses either a Subscriber.* or Booking.* prefix', () => {
    for (const value of Object.values(BOOKZEN_FIELDS)) {
      expect(/^(Subscriber|Booking)\./.test(value)).toBe(true);
    }
  });
});

describe('BOOKZEN_TAGS', () => {
  it('all values are non-empty strings', () => {
    for (const value of Object.values(BOOKZEN_TAGS)) {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    }
  });
});
