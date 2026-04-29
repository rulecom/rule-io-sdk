/**
 * Unit tests for the hospitality email template builders.
 *
 * These tests used to live in `@rule-io/rcml`'s `tests/templates.test.ts`
 * alongside brand-template tests. They moved here when the hospitality
 * templates moved into `vendor-bookzen/src/hospitality-templates.ts`.
 */

import { describe, expect, it } from 'vitest'
import type { CustomFieldMap } from '@rule-io/rcml'
import { RuleConfigError } from '@rule-io/core'
import {
  createFeedbackRequestEmail,
  createReservationCancellationEmail,
  createReservationConfirmationEmail,
  createReservationReminderEmail,
  createReservationRequestEmail,
} from '../src/hospitality-templates.js'
import { TEST_BRAND_STYLE, assertValidRCMLDocument, docToString } from './helpers.js'

const TEST_CUSTOM_FIELDS: CustomFieldMap = {
  'Booking.FirstName': 100001,
  'Booking.BookingRef': 100002,
  'Booking.ServiceType': 100003,
  'Booking.CheckInDate': 100004,
  'Booking.CheckOutDate': 100005,
  'Booking.TotalGuests': 100006,
  'Booking.TotalPrice': 100007,
  'Booking.RoomName': 100008,
}

describe('Hospitality Templates', () => {
  describe('createReservationConfirmationEmail', () => {
    it('should produce valid RCML', () => {
      const doc = createReservationConfirmationEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://example.com',
        text: {
          preheader: 'Thank you for your reservation!',
          greeting: 'Hello',
          intro: 'We look forward to welcoming you!',
          detailsHeading: 'Reservation Details',
          referenceLabel: 'Reference',
          serviceLabel: 'Service',
          roomLabel: 'Room',
          checkInLabel: 'Check-in',
          checkOutLabel: 'Check-out',
          guestsLabel: 'Guests',
          totalPriceLabel: 'Total',
          ctaButton: 'View Reservation',
        },
        fieldNames: {
          firstName: 'Booking.FirstName',
          bookingRef: 'Booking.BookingRef',
          serviceType: 'Booking.ServiceType',
          checkInDate: 'Booking.CheckInDate',
          checkOutDate: 'Booking.CheckOutDate',
          totalGuests: 'Booking.TotalGuests',
          totalPrice: 'Booking.TotalPrice',
          roomName: 'Booking.RoomName',
        },
      })

      assertValidRCMLDocument(doc)
      const json = docToString(doc)
      expect(json).toContain('Reservation Details')
      expect(json).toContain('100001') // FirstName field ID
      expect(json).toContain('100002') // BookingRef field ID
    })

    it('should work without optional fields (room, checkout, price)', () => {
      const doc = createReservationConfirmationEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://example.com',
        text: {
          preheader: 'Confirmed!',
          greeting: 'Hi',
          intro: 'Your reservation is confirmed.',
          detailsHeading: 'Details',
          referenceLabel: 'Ref',
          serviceLabel: 'Type',
          checkInLabel: 'Date',
          guestsLabel: 'Guests',
          ctaButton: 'View',
        },
        fieldNames: {
          firstName: 'Booking.FirstName',
          bookingRef: 'Booking.BookingRef',
          serviceType: 'Booking.ServiceType',
          checkInDate: 'Booking.CheckInDate',
          totalGuests: 'Booking.TotalGuests',
        },
      })

      assertValidRCMLDocument(doc)
      const json = docToString(doc)
      expect(json).not.toContain('Room')
      expect(json).not.toContain('Check-out')
    })
  })

  describe('createReservationCancellationEmail', () => {
    it('should produce valid RCML', () => {
      const doc = createReservationCancellationEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://example.com',
        text: {
          preheader: 'Your reservation has been cancelled',
          heading: 'Reservation Cancelled',
          greeting: 'Hello',
          message: 'Your reservation has been cancelled as requested.',
          referenceLabel: 'Reference',
          followUp: 'We hope to see you again!',
          ctaButton: 'Make a New Reservation',
        },
        fieldNames: {
          firstName: 'Booking.FirstName',
          bookingRef: 'Booking.BookingRef',
        },
      })

      assertValidRCMLDocument(doc)
      const json = docToString(doc)
      expect(json).toContain('Reservation Cancelled')
      expect(json).toContain('Make a New Reservation')
    })
  })

  describe('createReservationReminderEmail', () => {
    it('should produce valid RCML with all optional fields', () => {
      const doc = createReservationReminderEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://example.com',
        text: {
          preheader: 'Your stay starts soon!',
          greeting: 'Welcome',
          intro: 'Your stay begins soon. We look forward to seeing you!',
          detailsHeading: 'Your Reservation',
          dateLabel: 'Dates',
          roomLabel: 'Room',
          practicalInfoHeading: 'Practical Information',
          practicalInfo: 'Check-in from 3:00 PM. Check-out by 11:00 AM.',
          ctaButton: 'View Reservation',
        },
        fieldNames: {
          firstName: 'Booking.FirstName',
          checkInDate: 'Booking.CheckInDate',
          checkOutDate: 'Booking.CheckOutDate',
          roomName: 'Booking.RoomName',
        },
      })

      assertValidRCMLDocument(doc)
      const json = docToString(doc)
      expect(json).toContain('Practical Information')
      expect(json).toContain('Check-in from 3:00 PM')
    })

    it('should work without optional practical info', () => {
      const doc = createReservationReminderEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://example.com',
        text: {
          preheader: 'Reminder',
          greeting: 'Hi',
          intro: 'Your reservation is coming up.',
          detailsHeading: 'Details',
          dateLabel: 'Date',
          ctaButton: 'View',
        },
        fieldNames: {
          firstName: 'Booking.FirstName',
          checkInDate: 'Booking.CheckInDate',
        },
      })

      assertValidRCMLDocument(doc)
      const json = docToString(doc)
      expect(json).not.toContain('Practical Information')
    })

    it('should handle single date (no check-out)', () => {
      const doc = createReservationReminderEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://example.com',
        text: {
          preheader: 'Reminder',
          greeting: 'Hi',
          intro: 'See you soon.',
          detailsHeading: 'Details',
          dateLabel: 'Date',
          ctaButton: 'View',
        },
        fieldNames: {
          firstName: 'Booking.FirstName',
          checkInDate: 'Booking.CheckInDate',
        },
      })

      assertValidRCMLDocument(doc)
    })
  })

  describe('createFeedbackRequestEmail', () => {
    it('should produce valid RCML', () => {
      const doc = createFeedbackRequestEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        feedbackUrl: 'https://example.com/feedback',
        text: {
          preheader: 'Thank you for your visit!',
          greeting: 'Thank you',
          message: 'We would love to hear about your experience.',
          ctaButton: 'Leave Feedback',
        },
        fieldNames: {
          firstName: 'Booking.FirstName',
        },
      })

      assertValidRCMLDocument(doc)
      const json = docToString(doc)
      expect(json).toContain('Leave Feedback')
      expect(json).toContain('https://example.com/feedback')
    })
  })

  describe('createReservationRequestEmail', () => {
    it('should produce valid RCML', () => {
      const doc = createReservationRequestEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        text: {
          preheader: 'We received your request',
          greeting: 'Thank you',
          message: 'We have received your reservation request and will confirm shortly.',
          detailsHeading: 'Your Request',
          referenceLabel: 'Reference',
          dateLabel: 'Dates',
          guestsLabel: 'Guests',
        },
        fieldNames: {
          firstName: 'Booking.FirstName',
          bookingRef: 'Booking.BookingRef',
          checkInDate: 'Booking.CheckInDate',
          checkOutDate: 'Booking.CheckOutDate',
          totalGuests: 'Booking.TotalGuests',
        },
      })

      assertValidRCMLDocument(doc)
      const json = docToString(doc)
      expect(json).toContain('Your Request')
      expect(json).toContain('100006') // TotalGuests field ID
    })

    it('should handle single date (no checkout)', () => {
      const doc = createReservationRequestEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        text: {
          preheader: 'Request received',
          greeting: 'Hi',
          message: 'We got your request.',
          detailsHeading: 'Details',
          referenceLabel: 'Ref',
          dateLabel: 'Date',
          guestsLabel: 'Guests',
        },
        fieldNames: {
          firstName: 'Booking.FirstName',
          bookingRef: 'Booking.BookingRef',
          checkInDate: 'Booking.CheckInDate',
          totalGuests: 'Booking.TotalGuests',
        },
      })

      assertValidRCMLDocument(doc)
    })
  })
})

describe('Template Footer Localization (hospitality)', () => {
  it('should pass footer config through to templates', () => {
    const doc = createReservationConfirmationEmail({
      brandStyle: TEST_BRAND_STYLE,
      customFields: TEST_CUSTOM_FIELDS,
      websiteUrl: 'https://example.com',
      footer: {
        viewInBrowserText: 'Voir dans le navigateur',
        unsubscribeText: 'Se désabonner',
      },
      text: {
        preheader: 'Merci!',
        greeting: 'Bonjour',
        intro: 'Merci pour votre réservation.',
        detailsHeading: 'Détails',
        referenceLabel: 'Réf',
        serviceLabel: 'Service',
        checkInLabel: 'Arrivée',
        guestsLabel: 'Personnes',
        ctaButton: 'Voir',
      },
      fieldNames: {
        firstName: 'Booking.FirstName',
        bookingRef: 'Booking.BookingRef',
        serviceType: 'Booking.ServiceType',
        checkInDate: 'Booking.CheckInDate',
        totalGuests: 'Booking.TotalGuests',
      },
    })

    const json = docToString(doc)
    expect(json).toContain('Voir dans le navigateur')
    expect(json).toContain('Se désabonner')
    expect(json).not.toContain('View in browser')
  })
})

describe('template error context (hospitality)', () => {
  it('should include template name when createBrandButton throws inside a template', () => {
    expect(() =>
      createReservationConfirmationEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'javascript:alert(1)',
        text: {
          preheader: 'Test',
          greeting: 'Hello',
          intro: 'Intro',
          detailsHeading: 'Details',
          referenceLabel: 'Ref',
          serviceLabel: 'Service',
          checkInLabel: 'Check-in',
          guestsLabel: 'Guests',
          ctaButton: 'Click',
        },
        fieldNames: {
          firstName: 'Booking.FirstName',
          bookingRef: 'Booking.BookingRef',
          serviceType: 'Booking.ServiceType',
          checkInDate: 'Booking.CheckInDate',
          totalGuests: 'Booking.TotalGuests',
        },
      }),
    ).toThrow('createReservationConfirmationEmail > createBrandButton: invalid or unsafe URL')
  })

  it('wraps validateCustomFields errors with template prefix exactly once', () => {
    // Regression: hospitality templates previously prefixed validation errors
    // with their templateName arg AND called validateCustomFields outside
    // withTemplateContext. Moving the call inside the wrapper lets the
    // wrapper provide the prefix, matching the e-commerce pattern and
    // preventing duplicated prefixes if someone later rearranges the code.
    try {
      createReservationConfirmationEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: {},
        websiteUrl: 'https://example.com',
        text: {
          preheader: 'Test',
          greeting: 'Hi',
          intro: 'Intro',
          detailsHeading: 'Details',
          referenceLabel: 'Ref',
          serviceLabel: 'Service',
          checkInLabel: 'Check-in',
          guestsLabel: 'Guests',
          ctaButton: 'Click',
        },
        fieldNames: {
          firstName: 'Booking.FirstName',
          bookingRef: 'Booking.BookingRef',
          serviceType: 'Booking.ServiceType',
          checkInDate: 'Booking.CheckInDate',
          totalGuests: 'Booking.TotalGuests',
        },
      })
      throw new Error('expected createReservationConfirmationEmail to throw')
    } catch (error) {
      expect(error).toBeInstanceOf(RuleConfigError)
      const message = (error as RuleConfigError).message
      const occurrences = message.split('createReservationConfirmationEmail').length - 1
      expect(occurrences).toBe(1)
      expect(message).toContain('missing customFields entry for fieldNames.')
    }
  })
})
