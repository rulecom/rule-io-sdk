/**
 * Bookzen Vendor Preset Tests
 */

import { describe, it, expect } from 'vitest';
import type { CustomFieldMap } from '@rule-io/core';
import type { VendorConsumerConfig } from '@rule-io/core';
import { RuleConfigError } from '@rule-io/core';
import { bookzenPreset, BOOKZEN_FIELDS, BOOKZEN_TAGS } from '../src/index.js';
import { TEST_THEME } from './helpers.js';

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
  theme: TEST_THEME,
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
    // The pre-built automation entries have been retired. Template
    // authors now build contexts directly via the factory functions
    // (createReservationConfirmationTemplate, etc.) and wire
    // automations through @rule-io/client. See
    // packages/templates/README.md for the authoring pattern.
    it('returns an empty list (pre-built automations retired)', () => {
      const automations = bookzenPreset.getAutomations(TEST_CONFIG);

      expect(automations).toHaveLength(0);
    });
  });

  // ============================================================================
  // getAutomation
  // ============================================================================

  describe('getAutomation', () => {
    it('returns undefined for any ID (no automations defined)', () => {
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
