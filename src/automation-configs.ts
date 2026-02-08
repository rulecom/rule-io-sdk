/**
 * Automation Configuration Definitions (Legacy v1)
 *
 * Legacy automation configurations using the template-based system.
 * These use the legacy booking templates and are kept for backward compatibility.
 *
 * For new projects, use the v2 automation system with brand-based templates.
 *
 * @deprecated Use AutomationConfigV2 from automation-configs-v2 instead.
 * @module automation-configs
 */

import { RuleTags } from './constants';
import type { RCMLDocument } from './types';
import type {
  BookingConfirmationTemplateConfig,
  BookingCancellationTemplateConfig,
  BookingReminderTemplateConfig,
} from './rcml';
import {
  createBookingConfirmationTemplate,
  createBookingCancellationTemplate,
  createBookingReminderTemplate,
} from './rcml';

// ============================================================================
// Types
// ============================================================================

/**
 * Configuration for building templates with brand-specific values
 */
export interface TemplateConfig {
  /** Rule.io brand style ID */
  brandStyleId: string;
  /** Website base URL */
  websiteUrl: string;
  /** Contact email address */
  contactEmail: string;
  /** Contact phone number */
  contactPhone: string;
  /** URL to the logo image */
  logoUrl: string;
  /** Business/venue name for display */
  venueName: string;
  /** Primary color for headings and buttons */
  primaryColor?: string;
  /** Accent color for links and dividers */
  accentColor?: string;
  /** Background color for details sections */
  backgroundColor?: string;
}

/**
 * Condition for automation execution
 */
export interface AutomationCondition {
  hasTag?: string[];
  notHasTag?: string[];
}

/**
 * Full automation configuration
 */
export interface AutomationConfig {
  id: string;
  name: string;
  description: string;
  triggerTag: string;
  delayInSeconds?: string;
  conditions?: AutomationCondition;
  subject: string;
  preheader?: string;
  templateBuilder: (config: TemplateConfig) => RCMLDocument;
}

// ============================================================================
// Example Text Configurations
// ============================================================================

/**
 * Example text for booking confirmation email.
 * Consumers should provide their own localized text.
 */
export const BOOKING_CONFIRMATION_TEXT: BookingConfirmationTemplateConfig['text'] = {
  preheader: 'Thank you for your reservation {ref}',
  heading: 'Hello {name}!',
  intro: 'Thank you for your reservation. We look forward to welcoming you!',
  detailsHeading: 'Reservation Details',
  labels: {
    bookingRef: 'Reference',
    service: 'Service',
    room: 'Room',
    checkIn: 'Check-in',
    checkOut: 'Check-out',
    dateTime: 'Date and time',
    date: 'Date',
    guests: 'Guests',
    totalPrice: 'Total',
    requests: 'Special requests',
  },
  viewBookingButton: 'View Reservation',
  questionsHeading: 'Questions?',
  contactText: 'Contact us at {email} or call {phone}',
  footer: 'Your Company Name',
};

/**
 * Example text for booking cancellation email.
 */
export const BOOKING_CANCELLATION_TEXT: BookingCancellationTemplateConfig['text'] = {
  preheader: 'Your reservation {ref} has been cancelled',
  heading: 'Reservation Cancelled',
  greeting: 'Hello {name},',
  message: 'Your reservation {ref} for {service} on {date} has been cancelled as requested.',
  followUp: 'If this was a mistake or you would like to rebook, you are welcome to make a new reservation.',
  newBookingButton: 'Make a New Reservation',
  contactHeading: 'Questions?',
  footer: 'Your Company Name',
};

/**
 * Example text for booking reminder email.
 */
export const BOOKING_REMINDER_TEXT: BookingReminderTemplateConfig['text'] = {
  preheader: 'Your stay at {venue} starts {arrivalText}',
  heading: 'Welcome {name}!',
  intro: 'Your stay at {venue} starts {arrivalText}.',
  arrivalTomorrow: 'tomorrow',
  arrivalInDays: 'in {days} days',
  detailsHeading: 'Your Reservation',
  labels: {
    bookingRef: 'Reference',
    service: 'Service',
    room: 'Room',
    date: 'Date',
    guests: 'Guests',
  },
  practicalInfoHeading: 'Practical Information',
  practicalInfoAccommodation: 'Check-in from 3:00 PM. Check-out by 11:00 AM.',
  practicalInfoOther: 'We recommend arriving in good time. Parking is available at the entrance.',
  viewBookingButton: 'View Reservation',
  questionsHeading: 'Questions?',
  contactText: 'Contact us at {email} or call {phone}',
  footer: 'Your Company Name',
  venueName: 'Your Venue',
};

/**
 * Example text for abandoned booking email.
 */
export const ABANDONED_BOOKING_TEXT = {
  preheader: 'Did you forget something?',
  heading: 'Hello {name}!',
  intro: 'We noticed you started a reservation but did not complete it.',
  ctaText: 'Would you like to continue? Your reservation is still waiting for you.',
  continueButton: 'Complete Reservation',
  helpText: 'If you have questions or need help, contact us and we will be happy to assist.',
  contactHeading: 'Contact Us',
  contactText: 'Call {phone} or email {email}',
  footer: 'Your Company Name',
};

/**
 * Example text for post-stay feedback email.
 */
export const POST_STAY_FEEDBACK_TEXT = {
  preheader: 'Thank you for your visit!',
  heading: 'Thank you for your visit, {name}!',
  intro: 'We hope you had a wonderful experience with us.',
  feedbackRequest: 'We would appreciate if you took a moment to share your experience. Your feedback helps us improve!',
  feedbackButton: 'Leave Feedback',
  returnVisit: 'We look forward to welcoming you back!',
  contactHeading: 'Questions?',
  contactText: 'Contact us at {email} or call {phone}',
  footer: 'Your Company Name',
};

// ============================================================================
// Automation Configurations
// ============================================================================

/**
 * Example booking automations.
 * Uses the new generic tag names.
 *
 * @deprecated Create your own automation configs with your localized text.
 */
export const BOOKING_AUTOMATIONS: AutomationConfig[] = [
  {
    id: 'order-confirmation',
    name: 'Order Confirmation',
    description: 'Sent when an order/reservation is confirmed',
    triggerTag: RuleTags.ORDER_CONFIRMED,
    subject: 'Confirmation - {{Booking.BookingRef}}',
    templateBuilder: (config) =>
      createBookingConfirmationTemplate({
        brandStyleId: config.brandStyleId,
        logoUrl: config.logoUrl,
        websiteUrl: config.websiteUrl,
        primaryColor: config.primaryColor,
        accentColor: config.accentColor,
        backgroundColor: config.backgroundColor,
        contactEmail: config.contactEmail,
        contactPhone: config.contactPhone,
        guestName: '{{Booking.FirstName}}',
        bookingRef: '{{Booking.BookingRef}}',
        serviceName: '{{Booking.ServiceName}}',
        serviceType: 'accommodation',
        checkInDate: '{{Booking.CheckInDate}}',
        checkOutDate: '{{Booking.CheckOutDate}}',
        totalGuests: 0,
        totalPrice: '{{Booking.TotalPrice}}',
        text: BOOKING_CONFIRMATION_TEXT,
      }),
  },
  {
    id: 'order-cancellation',
    name: 'Order Cancellation',
    description: 'Sent when an order/reservation is cancelled',
    triggerTag: RuleTags.ORDER_CANCELLED,
    subject: 'Cancellation - {{Booking.BookingRef}}',
    templateBuilder: (config) =>
      createBookingCancellationTemplate({
        brandStyleId: config.brandStyleId,
        logoUrl: config.logoUrl,
        websiteUrl: config.websiteUrl,
        primaryColor: config.primaryColor,
        accentColor: config.accentColor,
        contactEmail: config.contactEmail,
        contactPhone: config.contactPhone,
        guestName: '{{Booking.FirstName}}',
        bookingRef: '{{Booking.BookingRef}}',
        serviceName: '{{Booking.ServiceName}}',
        checkInDate: '{{Booking.CheckInDate}}',
        text: BOOKING_CANCELLATION_TEXT,
      }),
  },
  {
    id: 'order-reminder',
    name: 'Order Reminder',
    description: 'Sent before the scheduled date',
    triggerTag: RuleTags.ORDER_REMINDER,
    subject: 'Reminder: Your visit is coming up!',
    templateBuilder: (config) =>
      createBookingReminderTemplate({
        brandStyleId: config.brandStyleId,
        logoUrl: config.logoUrl,
        websiteUrl: config.websiteUrl,
        primaryColor: config.primaryColor,
        accentColor: config.accentColor,
        backgroundColor: config.backgroundColor,
        contactEmail: config.contactEmail,
        contactPhone: config.contactPhone,
        guestName: '{{Booking.FirstName}}',
        bookingRef: '{{Booking.BookingRef}}',
        serviceName: '{{Booking.ServiceName}}',
        serviceType: 'accommodation',
        checkInDate: '{{Booking.CheckInDate}}',
        checkOutDate: '{{Booking.CheckOutDate}}',
        totalGuests: 0,
        daysUntilArrival: 1,
        text: { ...BOOKING_REMINDER_TEXT, venueName: config.venueName },
      }),
  },
];

/**
 * Get automation by ID
 */
export function getAutomationById(id: string): AutomationConfig | undefined {
  return BOOKING_AUTOMATIONS.find((a) => a.id === id);
}

/**
 * Get automation by trigger tag
 */
export function getAutomationByTrigger(tag: string): AutomationConfig | undefined {
  return BOOKING_AUTOMATIONS.find((a) => a.triggerTag === tag);
}

/**
 * Tag to automation mapping
 */
export const TAG_AUTOMATION_MAP: Record<string, string> = {
  [RuleTags.ORDER_CONFIRMED]: 'Order Confirmation',
  [RuleTags.ORDER_CANCELLED]: 'Order Cancellation',
  [RuleTags.ORDER_REMINDER]: 'Order Reminder',
};
