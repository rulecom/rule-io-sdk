/**
 * Bookzen Automation Definitions
 *
 * Pre-configured automations for Bookzen hospitality flows.
 * Each automation wires Bookzen-specific field names and default
 * English text into the generic hospitality template builders.
 */

import type { VendorAutomation, VendorConsumerConfig } from '@rule-io/core';
import { BOOKZEN_FIELDS } from './fields.js';
import {
  createReservationConfirmationEmail,
  createReservationCancellationEmail,
  createReservationReminderEmail,
  createFeedbackRequestEmail,
  createReservationRequestEmail,
} from './hospitality-templates.js';
import { BOOKZEN_TAGS } from './tags.js';

/** Default English text for reservation confirmation emails. */
const RESERVATION_CONFIRMATION_TEXT = {
  preheader: 'Your reservation is confirmed!',
  greeting: 'Hello',
  intro: 'Thank you for your reservation. We look forward to welcoming you!',
  detailsHeading: 'Reservation Details',
  referenceLabel: 'Reference',
  serviceLabel: 'Service',
  roomLabel: 'Room',
  checkInLabel: 'Check-in',
  checkOutLabel: 'Check-out',
  guestsLabel: 'Guests',
  totalPriceLabel: 'Total',
  ctaButton: 'View Reservation',
} as const;

/** Default English text for reservation cancellation emails. */
const RESERVATION_CANCELLATION_TEXT = {
  preheader: 'Your reservation has been cancelled',
  heading: 'Reservation Cancelled',
  greeting: 'Hi',
  message: 'Your reservation has been cancelled as requested.',
  referenceLabel: 'Reference',
  followUp: 'If you have any questions, please don\'t hesitate to contact us.',
  ctaButton: 'Book Again',
} as const;

/** Default English text for reservation reminder emails. */
const RESERVATION_REMINDER_TEXT = {
  preheader: 'Your stay is coming up!',
  greeting: 'Hi',
  intro: 'Just a friendly reminder that your stay is coming up soon!',
  detailsHeading: 'Your Stay',
  dateLabel: 'Dates',
  roomLabel: 'Room',
  practicalInfoHeading: 'Good to Know',
  practicalInfo: 'Check-in is from 15:00. If you need anything before your arrival, just let us know.',
  ctaButton: 'View Details',
} as const;

/** Default English text for feedback request emails. */
const FEEDBACK_REQUEST_TEXT = {
  preheader: 'How was your stay?',
  greeting: 'Hi',
  message: 'We hope you had a wonderful experience. We\'d love to hear your feedback!',
  ctaButton: 'Leave Feedback',
} as const;

/** Default English text for reservation request (pending) emails. */
const RESERVATION_REQUEST_TEXT = {
  preheader: 'We received your reservation request',
  greeting: 'Hi',
  message: 'We have received your reservation request and will get back to you shortly.',
  detailsHeading: 'Request Details',
  referenceLabel: 'Reference',
  dateLabel: 'Dates',
  guestsLabel: 'Guests',
} as const;

/**
 * Create the full set of Bookzen automation definitions.
 */
export function createBookzenAutomations(): VendorAutomation[] {
  return [
    {
      id: 'bookzen-reservation-confirmation',
      name: 'Bookzen Reservation Confirmation',
      description: 'Sent when a reservation is confirmed',
      triggerTag: BOOKZEN_TAGS.reservationConfirmed,
      subject: 'Reservation Confirmed!',
      preheader: RESERVATION_CONFIRMATION_TEXT.preheader,
      templateBuilder: (config: VendorConsumerConfig) =>
        createReservationConfirmationEmail({
          theme: config.theme,
          customFields: config.customFields,
          websiteUrl: config.websiteUrl,
          footer: config.footer,
          text: RESERVATION_CONFIRMATION_TEXT,
          fieldNames: {
            firstName: BOOKZEN_FIELDS.guestFirstName,
            bookingRef: BOOKZEN_FIELDS.bookingRef,
            serviceType: BOOKZEN_FIELDS.serviceType,
            checkInDate: BOOKZEN_FIELDS.checkInDate,
            checkOutDate: BOOKZEN_FIELDS.checkOutDate,
            totalGuests: BOOKZEN_FIELDS.totalGuests,
            totalPrice: BOOKZEN_FIELDS.totalPrice,
            roomName: BOOKZEN_FIELDS.roomName,
          },
        }),
    },
    {
      id: 'bookzen-reservation-cancellation',
      name: 'Bookzen Reservation Cancellation',
      description: 'Sent when a reservation is cancelled',
      triggerTag: BOOKZEN_TAGS.reservationCancelled,
      subject: 'Reservation Cancelled',
      preheader: RESERVATION_CANCELLATION_TEXT.preheader,
      templateBuilder: (config: VendorConsumerConfig) =>
        createReservationCancellationEmail({
          theme: config.theme,
          customFields: config.customFields,
          websiteUrl: config.websiteUrl,
          footer: config.footer,
          text: RESERVATION_CANCELLATION_TEXT,
          fieldNames: {
            firstName: BOOKZEN_FIELDS.guestFirstName,
            bookingRef: BOOKZEN_FIELDS.bookingRef,
          },
        }),
    },
    {
      id: 'bookzen-reservation-reminder',
      name: 'Bookzen Reservation Reminder',
      description: 'Sent before a reservation check-in date',
      triggerTag: BOOKZEN_TAGS.reservationReminder,
      delayInSeconds: '86400',
      subject: 'Your Stay Is Coming Up!',
      preheader: RESERVATION_REMINDER_TEXT.preheader,
      templateBuilder: (config: VendorConsumerConfig) =>
        createReservationReminderEmail({
          theme: config.theme,
          customFields: config.customFields,
          websiteUrl: config.websiteUrl,
          footer: config.footer,
          text: RESERVATION_REMINDER_TEXT,
          fieldNames: {
            firstName: BOOKZEN_FIELDS.guestFirstName,
            checkInDate: BOOKZEN_FIELDS.checkInDate,
            checkOutDate: BOOKZEN_FIELDS.checkOutDate,
            roomName: BOOKZEN_FIELDS.roomName,
          },
        }),
    },
    {
      id: 'bookzen-feedback-request',
      name: 'Bookzen Feedback Request',
      description: 'Sent after a guest checks out to request feedback',
      triggerTag: BOOKZEN_TAGS.feedbackRequest,
      delayInSeconds: '172800',
      subject: 'How Was Your Stay?',
      preheader: FEEDBACK_REQUEST_TEXT.preheader,
      templateBuilder: (config: VendorConsumerConfig) =>
        createFeedbackRequestEmail({
          theme: config.theme,
          customFields: config.customFields,
          feedbackUrl: config.websiteUrl,
          footer: config.footer,
          text: FEEDBACK_REQUEST_TEXT,
          fieldNames: {
            firstName: BOOKZEN_FIELDS.guestFirstName,
          },
        }),
    },
    {
      id: 'bookzen-reservation-request',
      name: 'Bookzen Reservation Request',
      description: 'Sent when a reservation request is received (pending approval)',
      triggerTag: BOOKZEN_TAGS.reservationRequest,
      subject: 'Reservation Request Received',
      preheader: RESERVATION_REQUEST_TEXT.preheader,
      templateBuilder: (config: VendorConsumerConfig) =>
        createReservationRequestEmail({
          theme: config.theme,
          customFields: config.customFields,
          footer: config.footer,
          text: RESERVATION_REQUEST_TEXT,
          fieldNames: {
            firstName: BOOKZEN_FIELDS.guestFirstName,
            bookingRef: BOOKZEN_FIELDS.bookingRef,
            checkInDate: BOOKZEN_FIELDS.checkInDate,
            checkOutDate: BOOKZEN_FIELDS.checkOutDate,
            totalGuests: BOOKZEN_FIELDS.totalGuests,
          },
        }),
    },
  ];
}
