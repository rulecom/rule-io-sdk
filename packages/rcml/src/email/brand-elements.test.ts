/**
 * Tests for the brand-element helpers that need explicit coverage on top
 * of what the larger end-to-end suites exercise. Keep this file tightly
 * scoped: targeted contract checks only.
 */

import { describe, expect, it } from 'vitest';
import { RuleConfigError, type CustomFieldMap } from '@rule-io/core';

import { validateRequiredFields } from './brand-elements.js';

describe('validateRequiredFields', () => {
  const customFields: CustomFieldMap = {
    'Booking.FirstName': 1,
    'Booking.OrderRef': 2,
  };

  it('passes when every mapping resolves', () => {
    expect(() =>
      validateRequiredFields(customFields, {
        firstName: 'Booking.FirstName',
        orderRef: 'Booking.OrderRef',
      }),
    ).not.toThrow();
  });

  it('reports a configured field name that is absent from customFields', () => {
    expect(() =>
      validateRequiredFields(customFields, {
        firstName: 'Booking.MissingField',
      }),
    ).toThrow(RuleConfigError);

    expect(() =>
      validateRequiredFields(customFields, {
        firstName: 'Booking.MissingField',
      }),
    ).toThrow(/firstName \(mapped to "Booking\.MissingField"\)/);
  });

  it('reports an undefined mapping as missing — silent skips would let downstream non-null assertions fail later', () => {
    expect(() =>
      validateRequiredFields(customFields, {
        firstName: undefined,
      }),
    ).toThrow(RuleConfigError);

    expect(() =>
      validateRequiredFields(customFields, {
        firstName: undefined,
      }),
    ).toThrow(/firstName \(no field mapping configured\)/);
  });

  it('combines undefined mappings and unresolved field names in one error', () => {
    let caught: unknown;

    try {
      validateRequiredFields(customFields, {
        firstName: undefined,
        orderRef: 'Booking.MissingField',
      });
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(RuleConfigError);
    const message = (caught as Error).message;

    expect(message).toContain('firstName (no field mapping configured)');
    expect(message).toContain('orderRef (mapped to "Booking.MissingField")');
  });

  it('passes on an empty fieldNames object', () => {
    expect(() => validateRequiredFields(customFields, {})).not.toThrow();
  });
});
