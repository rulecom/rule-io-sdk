/**
 * Automation Configuration Definitions
 *
 * Defines all Rule.io automations for the booking system.
 * These configurations are used by setup and verification scripts.
 *
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
  /**
   * Rule.io brand style ID (required for editor compatibility).
   * Get this from Rule.io Settings → Brand.
   */
  brandStyleId: string;
  /** Website base URL */
  websiteUrl: string;
  /** Contact email address */
  contactEmail: string;
  /** Contact phone number */
  contactPhone: string;
  /** URL to the logo image */
  logoUrl: string;
  /** Venue name for display */
  venueName: string;
  /** Primary color for headings and buttons (default: brand green) */
  primaryColor?: string;
  /** Accent color for links and dividers (default: brand gold) */
  accentColor?: string;
  /** Background color for details sections (default: brand cream) */
  backgroundColor?: string;
}

/**
 * Condition for automation execution
 */
export interface AutomationCondition {
  /** Subscriber must have these tags */
  hasTag?: string[];
  /** Subscriber must NOT have these tags */
  notHasTag?: string[];
}

/**
 * Full automation configuration
 */
export interface AutomationConfig {
  /** Unique identifier for this automation */
  id: string;
  /** Display name in Rule.io */
  name: string;
  /** Description of what this automation does */
  description: string;
  /** Tag that triggers this automation */
  triggerTag: string;
  /** Delay before sending (seconds as string) */
  delayInSeconds?: string;
  /** Optional conditions for execution */
  conditions?: AutomationCondition;
  /** Email subject (can include merge fields like {{Booking.BookingRef}}) */
  subject: string;
  /** Preview text shown in inbox */
  preheader?: string;
  /** Function to build the RCML template */
  templateBuilder: (config: TemplateConfig) => RCMLDocument;
}

// ============================================================================
// Swedish Translations
// ============================================================================

/**
 * Swedish translations for booking confirmation email
 */
export const BOOKING_CONFIRMATION_TEXT: BookingConfirmationTemplateConfig['text'] = {
  preheader: 'Tack för din bokning {ref}',
  heading: 'Hej {name}!',
  intro: 'Tack för din bokning hos Blacksta Vingård. Vi ser fram emot att välkomna dig!',
  detailsHeading: 'Bokningsinformation',
  labels: {
    bookingRef: 'Bokningsreferens',
    service: 'Tjänst',
    room: 'Rum',
    checkIn: 'Incheckning',
    checkOut: 'Utcheckning',
    dateTime: 'Datum och tid',
    date: 'Datum',
    guests: 'Antal gäster',
    totalPrice: 'Totalt pris',
    requests: 'Önskemål',
  },
  viewBookingButton: 'Visa bokning',
  questionsHeading: 'Frågor?',
  contactText: 'Kontakta oss på {email} eller ring {phone}',
  footer: 'Blacksta Vingård',
};

/**
 * Swedish translations for booking cancellation email
 */
export const BOOKING_CANCELLATION_TEXT: BookingCancellationTemplateConfig['text'] = {
  preheader: 'Din bokning {ref} har avbokats',
  heading: 'Bokning avbokad',
  greeting: 'Hej {name},',
  message: 'Din bokning {ref} för {service} den {date} har avbokats enligt din begäran.',
  followUp:
    'Om detta var ett misstag eller om du vill boka om, är du varmt välkommen att göra en ny bokning.',
  newBookingButton: 'Gör en ny bokning',
  contactHeading: 'Frågor?',
  footer: 'Blacksta Vingård',
};

/**
 * Swedish translations for booking reminder email
 */
export const BOOKING_REMINDER_TEXT: BookingReminderTemplateConfig['text'] = {
  preheader: 'Din vistelse på {venue} börjar {arrivalText}',
  heading: 'Välkommen {name}!',
  intro: 'Din vistelse på {venue} börjar {arrivalText}.',
  arrivalTomorrow: 'imorgon',
  arrivalInDays: 'om {days} dagar',
  detailsHeading: 'Din bokning',
  labels: {
    bookingRef: 'Bokningsreferens',
    service: 'Tjänst',
    room: 'Rum',
    date: 'Datum',
    guests: 'Antal gäster',
  },
  practicalInfoHeading: 'Praktisk information',
  practicalInfoAccommodation:
    'Incheckning från kl. 15:00. Utcheckning senast kl. 11:00. Receptionen finns i huvudbyggnaden.',
  practicalInfoOther:
    'Vi rekommenderar att du anländer i god tid. Parkering finns tillgänglig vid entrén.',
  viewBookingButton: 'Visa bokning',
  questionsHeading: 'Frågor?',
  contactText: 'Kontakta oss på {email} eller ring {phone}',
  footer: 'Blacksta Vingård',
  venueName: 'Blacksta Vingård',
};

/**
 * Swedish translations for abandoned booking email
 */
export const ABANDONED_BOOKING_TEXT = {
  preheader: 'Glömde du något?',
  heading: 'Hej {name}!',
  intro: 'Vi såg att du påbörjade en bokning hos Blacksta Vingård men inte slutförde den.',
  ctaText:
    'Vill du fortsätta? Din bokning väntar på dig och vi håller gärna din plats tillgänglig.',
  continueButton: 'Slutför bokning',
  helpText: 'Har du frågor eller behöver hjälp? Kontakta oss så hjälper vi dig gärna.',
  contactHeading: 'Kontakta oss',
  contactText: 'Ring {phone} eller mejla {email}',
  footer: 'Blacksta Vingård',
};

/**
 * Swedish translations for post-stay feedback email
 */
export const POST_STAY_FEEDBACK_TEXT = {
  preheader: 'Tack för ditt besök på Blacksta Vingård!',
  heading: 'Tack för ditt besök, {name}!',
  intro: 'Vi hoppas att du hade en fantastisk upplevelse hos oss på Blacksta Vingård.',
  feedbackRequest:
    'Vi skulle uppskatta om du tog en stund att berätta om din upplevelse. Din feedback hjälper oss att bli ännu bättre!',
  feedbackButton: 'Lämna feedback',
  returnVisit:
    'Vi ser fram emot att få välkomna dig tillbaka. Som ett tack för din feedback får du 10% rabatt på din nästa bokning!',
  contactHeading: 'Frågor?',
  contactText: 'Kontakta oss på {email} eller ring {phone}',
  footer: 'Blacksta Vingård',
};

// ============================================================================
// Automation Configurations
// ============================================================================

/**
 * All booking automations for Rule.io
 *
 * @example
 * ```typescript
 * import { BOOKING_AUTOMATIONS } from 'rule-io-sdk';
 *
 * for (const automation of BOOKING_AUTOMATIONS) {
 *   console.log(`${automation.name} → trigger: ${automation.triggerTag}`);
 * }
 * ```
 */
export const BOOKING_AUTOMATIONS: AutomationConfig[] = [
  {
    id: 'booking-confirmation',
    name: 'Bokningsbekräftelse',
    description: 'Skickas när en bokning bekräftas',
    triggerTag: RuleTags.BOOKING_CONFIRMED,
    subject: 'Bokningsbekräftelse - {{Booking.BookingRef}}',
    preheader: 'Tack för din bokning {{Booking.BookingRef}}',
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
        // Merge fields - Rule.io will replace these
        guestName: '{{Booking.FirstName}}',
        bookingRef: '{{Booking.BookingRef}}',
        serviceName: '{{Booking.ServiceName}}',
        serviceType: 'accommodation', // Default, can be overridden via merge field logic
        checkInDate: '{{Booking.CheckInDate}}',
        checkOutDate: '{{Booking.CheckOutDate}}',
        totalGuests: 0, // Will be replaced by merge field
        totalPrice: '{{Booking.TotalPrice}} kr',
        roomName: '{{Booking.RoomName}}',
        specialRequests: '{{Booking.SpecialRequests}}',
        text: BOOKING_CONFIRMATION_TEXT,
      }),
  },
  {
    id: 'booking-request-confirmation',
    name: 'Förfrågningsbekräftelse',
    description: 'Skickas när en bokningsförfrågan tas emot (lågsäsong)',
    triggerTag: RuleTags.BOOKING_REQUEST,
    subject: 'Förfrågningsbekräftelse - {{Booking.BookingRef}}',
    preheader: 'Vi har mottagit din förfrågan {{Booking.BookingRef}}',
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
        totalPrice: '{{Booking.TotalPrice}} kr',
        roomName: '{{Booking.RoomName}}',
        specialRequests: '{{Booking.SpecialRequests}}',
        text: {
          ...BOOKING_CONFIRMATION_TEXT,
          preheader: 'Vi har mottagit din förfrågan {ref}',
          heading: 'Tack för din förfrågan, {name}!',
          intro: 'Vi har mottagit din bokningsförfrågan och återkommer inom kort med bekräftelse.',
        },
      }),
  },
  {
    id: 'booking-cancellation',
    name: 'Avbokning',
    description: 'Skickas när en bokning avbokas',
    triggerTag: RuleTags.BOOKING_CANCELLED,
    subject: 'Bokning avbokad - {{Booking.BookingRef}}',
    preheader: 'Din bokning {{Booking.BookingRef}} har avbokats',
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
    id: 'booking-reminder',
    name: 'Påminnelse',
    description: 'Skickas 1 dag före incheckning',
    triggerTag: RuleTags.BOOKING_REMINDER,
    subject: 'Påminnelse: Din vistelse börjar snart!',
    preheader: 'Din vistelse på Blacksta Vingård börjar imorgon',
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
        roomName: '{{Booking.RoomName}}',
        daysUntilArrival: 1, // Default to 1 day reminder
        text: BOOKING_REMINDER_TEXT,
      }),
  },
  {
    id: 'abandoned-booking',
    name: 'Övergiven bokning',
    description: 'Skickas 2 timmar efter att en bokning påbörjats men inte slutförts',
    triggerTag: RuleTags.BOOKING_STARTED,
    delayInSeconds: '7200', // 2 hours
    conditions: {
      notHasTag: [RuleTags.BOOKING_CONFIRMED, RuleTags.BOOKING_REQUEST],
    },
    subject: 'Glömde du något?',
    preheader: 'Din bokning väntar på dig',
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
        bookingRef: '',
        serviceName: '{{Booking.ServiceName}}',
        serviceType: 'accommodation',
        checkInDate: '{{Booking.CheckInDate}}',
        totalGuests: 0,
        daysUntilArrival: 0, // Not applicable for abandoned booking
        text: {
          ...BOOKING_REMINDER_TEXT,
          preheader: 'Glömde du något?',
          heading: 'Hej {name}!',
          intro:
            'Vi såg att du påbörjade en bokning men inte slutförde den. Din bokning väntar fortfarande på dig!',
          practicalInfoHeading: 'Behöver du hjälp?',
          practicalInfoAccommodation:
            'Om du har frågor eller behöver hjälp med din bokning, kontakta oss gärna.',
          practicalInfoOther:
            'Om du har frågor eller behöver hjälp med din bokning, kontakta oss gärna.',
          viewBookingButton: 'Slutför bokning',
        },
      }),
  },
  {
    id: 'post-stay-feedback',
    name: 'Feedback efter vistelse',
    description: 'Skickas dagen efter utcheckning',
    triggerTag: RuleTags.BOOKING_COMPLETED,
    subject: 'Tack för ditt besök!',
    preheader: 'Vi hoppas att du hade en fantastisk upplevelse',
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
        totalGuests: 0,
        daysUntilArrival: 0,
        text: {
          ...BOOKING_REMINDER_TEXT,
          preheader: 'Tack för ditt besök på {venue}!',
          heading: 'Tack för ditt besök, {name}!',
          intro: 'Vi hoppas att du hade en fantastisk upplevelse hos oss på {venue}.',
          detailsHeading: 'Berätta för oss',
          practicalInfoHeading: 'Din feedback är värdefull',
          practicalInfoAccommodation:
            'Vi skulle uppskatta om du tog en stund att berätta om din upplevelse. Din feedback hjälper oss att bli ännu bättre!',
          practicalInfoOther:
            'Vi skulle uppskatta om du tog en stund att berätta om din upplevelse. Din feedback hjälper oss att bli ännu bättre!',
          viewBookingButton: 'Lämna feedback',
        },
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
 * Tag to automation mapping for quick reference
 */
export const TAG_AUTOMATION_MAP: Record<string, string> = {
  [RuleTags.BOOKING_CONFIRMED]: 'Bokningsbekräftelse',
  [RuleTags.BOOKING_REQUEST]: 'Förfrågningsbekräftelse',
  [RuleTags.BOOKING_CANCELLED]: 'Avbokning',
  [RuleTags.BOOKING_REMINDER]: 'Påminnelse',
  [RuleTags.BOOKING_STARTED]: 'Övergiven bokning (2h fördröjning)',
  [RuleTags.BOOKING_COMPLETED]: 'Feedback efter vistelse',
};
