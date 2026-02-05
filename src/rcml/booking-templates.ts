/**
 * Booking Email Templates
 *
 * Pre-built templates using the brand style system.
 * These templates use proper placeholder nodes for merge fields.
 */

import type { RCMLDocument } from '../types';
import {
  createBrandTemplate,
  createBrandLogo,
  createBrandHeading,
  createBrandText,
  createBrandButton,
  createContentSection,
  createFooterSection,
  createPlaceholder,
  createTextNode,
  createDocWithPlaceholders,
  BLACKSTA_CUSTOM_FIELDS,
  BLACKSTA_BRAND_STYLE,
  type BrandStyleConfig,
  type CustomFieldMap,
} from './brand-template';

// ============================================================================
// Template Configuration
// ============================================================================

export interface BookingTemplateConfig {
  /** Brand style configuration */
  brandStyle?: BrandStyleConfig;
  /** Custom field ID mapping */
  customFields?: CustomFieldMap;
  /** Website URL for buttons */
  websiteUrl?: string;
}

// ============================================================================
// Booking Confirmation Template
// ============================================================================

/**
 * Create a booking confirmation email template
 *
 * Uses merge fields:
 * - Booking.FirstName
 * - Booking.BookingRef
 * - Booking.ServiceType
 * - Booking.CheckInDate
 * - Booking.CheckOutDate
 * - Booking.TotalGuests
 * - Booking.TotalPrice
 * - Booking.RoomName
 */
export function createBookingConfirmationEmail(config: BookingTemplateConfig = {}): RCMLDocument {
  const fields = config.customFields || BLACKSTA_CUSTOM_FIELDS;
  const websiteUrl = config.websiteUrl || 'https://blackstavingard.se';

  return createBrandTemplate({
    brandStyle: config.brandStyle || BLACKSTA_BRAND_STYLE,
    preheader: 'Tack för din bokning hos Blacksta Vingård!',
    sections: [
      // Logo
      createBrandLogo(),

      // Main content
      createContentSection(
        [
          // Greeting with name placeholder
          createBrandHeading(
            createDocWithPlaceholders([
              createTextNode('Hej '),
              createPlaceholder('Booking.FirstName', fields['Booking.FirstName']),
              createTextNode('!'),
            ])
          ),

          // Intro text
          createBrandText(
            createDocWithPlaceholders([
              createTextNode(
                'Tack för din bokning hos Blacksta Vingård. Vi ser fram emot att välkomna dig!'
              ),
            ]),
            { align: 'center' }
          ),
        ],
        { padding: '20px 0' }
      ),

      // Booking details
      createContentSection(
        [
          createBrandHeading(createDocWithPlaceholders([createTextNode('Bokningsinformation')]), 2),

          // Booking ref
          createBrandText(
            createDocWithPlaceholders([
              createTextNode('Bokningsreferens: '),
              createPlaceholder('Booking.BookingRef', fields['Booking.BookingRef']),
            ])
          ),

          // Service type
          createBrandText(
            createDocWithPlaceholders([
              createTextNode('Tjänst: '),
              createPlaceholder('Booking.ServiceType', fields['Booking.ServiceType']),
            ])
          ),

          // Room
          createBrandText(
            createDocWithPlaceholders([
              createTextNode('Rum: '),
              createPlaceholder('Booking.RoomName', fields['Booking.RoomName']),
            ])
          ),

          // Check-in date
          createBrandText(
            createDocWithPlaceholders([
              createTextNode('Incheckning: '),
              createPlaceholder('Booking.CheckInDate', fields['Booking.CheckInDate']),
            ])
          ),

          // Check-out date
          createBrandText(
            createDocWithPlaceholders([
              createTextNode('Utcheckning: '),
              createPlaceholder('Booking.CheckOutDate', fields['Booking.CheckOutDate']),
            ])
          ),

          // Guests
          createBrandText(
            createDocWithPlaceholders([
              createTextNode('Antal gäster: '),
              createPlaceholder('Booking.TotalGuests', fields['Booking.TotalGuests']),
            ])
          ),

          // Total price
          createBrandText(
            createDocWithPlaceholders([
              createTextNode('Totalt pris: '),
              createPlaceholder('Booking.TotalPrice', fields['Booking.TotalPrice']),
              createTextNode(' kr'),
            ])
          ),
        ],
        { padding: '20px 0', backgroundColor: '#f6f8f9' }
      ),

      // CTA Button
      createContentSection(
        [
          createBrandButton(
            createDocWithPlaceholders([createTextNode('Visa bokning')]),
            websiteUrl
          ),
        ],
        { padding: '20px 0' }
      ),

      // Footer
      createFooterSection(),
    ],
  });
}

// ============================================================================
// Booking Cancellation Template
// ============================================================================

/**
 * Create a booking cancellation email template
 */
export function createBookingCancellationEmail(config: BookingTemplateConfig = {}): RCMLDocument {
  const fields = config.customFields || BLACKSTA_CUSTOM_FIELDS;
  const websiteUrl = config.websiteUrl || 'https://blackstavingard.se';

  return createBrandTemplate({
    brandStyle: config.brandStyle || BLACKSTA_BRAND_STYLE,
    preheader: 'Din bokning har avbokats',
    sections: [
      createBrandLogo(),

      createContentSection(
        [
          createBrandHeading(createDocWithPlaceholders([createTextNode('Bokning avbokad')])),

          createBrandText(
            createDocWithPlaceholders([
              createTextNode('Hej '),
              createPlaceholder('Booking.FirstName', fields['Booking.FirstName']),
              createTextNode(','),
            ])
          ),

          createBrandText(
            createDocWithPlaceholders([
              createTextNode('Din bokning '),
              createPlaceholder('Booking.BookingRef', fields['Booking.BookingRef']),
              createTextNode(' har avbokats enligt din begäran.'),
            ])
          ),

          createBrandText(
            createDocWithPlaceholders([
              createTextNode('Vi hoppas att få välkomna dig en annan gång!'),
            ])
          ),
        ],
        { padding: '20px 0' }
      ),

      createContentSection(
        [
          createBrandButton(
            createDocWithPlaceholders([createTextNode('Gör en ny bokning')]),
            websiteUrl
          ),
        ],
        { padding: '20px 0' }
      ),

      createFooterSection(),
    ],
  });
}

// ============================================================================
// Booking Reminder Template
// ============================================================================

/**
 * Create a booking reminder email template
 */
export function createBookingReminderEmail(config: BookingTemplateConfig = {}): RCMLDocument {
  const fields = config.customFields || BLACKSTA_CUSTOM_FIELDS;
  const websiteUrl = config.websiteUrl || 'https://blackstavingard.se';

  return createBrandTemplate({
    brandStyle: config.brandStyle || BLACKSTA_BRAND_STYLE,
    preheader: 'Din vistelse börjar snart!',
    sections: [
      createBrandLogo(),

      createContentSection(
        [
          createBrandHeading(
            createDocWithPlaceholders([
              createTextNode('Välkommen '),
              createPlaceholder('Booking.FirstName', fields['Booking.FirstName']),
              createTextNode('!'),
            ])
          ),

          createBrandText(
            createDocWithPlaceholders([
              createTextNode(
                'Din vistelse på Blacksta Vingård börjar snart. Vi ser fram emot att träffa dig!'
              ),
            ]),
            { align: 'center' }
          ),
        ],
        { padding: '20px 0' }
      ),

      createContentSection(
        [
          createBrandHeading(createDocWithPlaceholders([createTextNode('Din bokning')]), 2),

          createBrandText(
            createDocWithPlaceholders([
              createTextNode('Datum: '),
              createPlaceholder('Booking.CheckInDate', fields['Booking.CheckInDate']),
              createTextNode(' - '),
              createPlaceholder('Booking.CheckOutDate', fields['Booking.CheckOutDate']),
            ])
          ),

          createBrandText(
            createDocWithPlaceholders([
              createTextNode('Rum: '),
              createPlaceholder('Booking.RoomName', fields['Booking.RoomName']),
            ])
          ),
        ],
        { padding: '20px 0', backgroundColor: '#f6f8f9' }
      ),

      createContentSection(
        [
          createBrandHeading(
            createDocWithPlaceholders([createTextNode('Praktisk information')]),
            3
          ),

          createBrandText(
            createDocWithPlaceholders([
              createTextNode('Incheckning från kl. 15:00. Utcheckning senast kl. 11:00.'),
            ])
          ),

          createBrandButton(
            createDocWithPlaceholders([createTextNode('Visa bokning')]),
            websiteUrl
          ),
        ],
        { padding: '20px 0' }
      ),

      createFooterSection(),
    ],
  });
}

// ============================================================================
// Abandoned Booking Template
// ============================================================================

/**
 * Create an abandoned booking email template
 */
export function createAbandonedBookingEmail(config: BookingTemplateConfig = {}): RCMLDocument {
  const fields = config.customFields || BLACKSTA_CUSTOM_FIELDS;
  const websiteUrl = config.websiteUrl || 'https://blackstavingard.se';

  return createBrandTemplate({
    brandStyle: config.brandStyle || BLACKSTA_BRAND_STYLE,
    preheader: 'Glömde du något?',
    sections: [
      createBrandLogo(),

      createContentSection(
        [
          createBrandHeading(
            createDocWithPlaceholders([
              createTextNode('Hej '),
              createPlaceholder('Booking.FirstName', fields['Booking.FirstName']),
              createTextNode('!'),
            ])
          ),

          createBrandText(
            createDocWithPlaceholders([
              createTextNode(
                'Vi såg att du påbörjade en bokning hos Blacksta Vingård men inte slutförde den.'
              ),
            ]),
            { align: 'center' }
          ),

          createBrandText(
            createDocWithPlaceholders([createTextNode('Din bokning väntar fortfarande på dig!')]),
            { align: 'center' }
          ),
        ],
        { padding: '20px 0' }
      ),

      createContentSection(
        [
          createBrandButton(
            createDocWithPlaceholders([createTextNode('Slutför bokning')]),
            websiteUrl
          ),
        ],
        { padding: '20px 0' }
      ),

      createFooterSection(),
    ],
  });
}

// ============================================================================
// Post-Stay Feedback Template
// ============================================================================

/**
 * Create a post-stay feedback email template
 */
export function createPostStayFeedbackEmail(config: BookingTemplateConfig = {}): RCMLDocument {
  const fields = config.customFields || BLACKSTA_CUSTOM_FIELDS;
  const websiteUrl = config.websiteUrl || 'https://blackstavingard.se';

  return createBrandTemplate({
    brandStyle: config.brandStyle || BLACKSTA_BRAND_STYLE,
    preheader: 'Tack för ditt besök!',
    sections: [
      createBrandLogo(),

      createContentSection(
        [
          createBrandHeading(
            createDocWithPlaceholders([
              createTextNode('Tack för ditt besök, '),
              createPlaceholder('Booking.FirstName', fields['Booking.FirstName']),
              createTextNode('!'),
            ])
          ),

          createBrandText(
            createDocWithPlaceholders([
              createTextNode(
                'Vi hoppas att du hade en fantastisk upplevelse hos oss på Blacksta Vingård.'
              ),
            ]),
            { align: 'center' }
          ),

          createBrandText(
            createDocWithPlaceholders([
              createTextNode(
                'Vi skulle uppskatta om du tog en stund att berätta om din upplevelse.'
              ),
            ]),
            { align: 'center' }
          ),
        ],
        { padding: '20px 0' }
      ),

      createContentSection(
        [
          createBrandButton(
            createDocWithPlaceholders([createTextNode('Lämna feedback')]),
            `${websiteUrl}/feedback`
          ),
        ],
        { padding: '20px 0' }
      ),

      createFooterSection(),
    ],
  });
}

// ============================================================================
// Booking Request Confirmation Template
// ============================================================================

/**
 * Create a booking request confirmation email template (for low season)
 */
export function createBookingRequestEmail(config: BookingTemplateConfig = {}): RCMLDocument {
  const fields = config.customFields || BLACKSTA_CUSTOM_FIELDS;

  return createBrandTemplate({
    brandStyle: config.brandStyle || BLACKSTA_BRAND_STYLE,
    preheader: 'Vi har mottagit din förfrågan',
    sections: [
      createBrandLogo(),

      createContentSection(
        [
          createBrandHeading(
            createDocWithPlaceholders([
              createTextNode('Tack för din förfrågan, '),
              createPlaceholder('Booking.FirstName', fields['Booking.FirstName']),
              createTextNode('!'),
            ])
          ),

          createBrandText(
            createDocWithPlaceholders([
              createTextNode(
                'Vi har mottagit din bokningsförfrågan och återkommer inom kort med bekräftelse.'
              ),
            ]),
            { align: 'center' }
          ),
        ],
        { padding: '20px 0' }
      ),

      createContentSection(
        [
          createBrandHeading(createDocWithPlaceholders([createTextNode('Din förfrågan')]), 2),

          createBrandText(
            createDocWithPlaceholders([
              createTextNode('Referens: '),
              createPlaceholder('Booking.BookingRef', fields['Booking.BookingRef']),
            ])
          ),

          createBrandText(
            createDocWithPlaceholders([
              createTextNode('Datum: '),
              createPlaceholder('Booking.CheckInDate', fields['Booking.CheckInDate']),
              createTextNode(' - '),
              createPlaceholder('Booking.CheckOutDate', fields['Booking.CheckOutDate']),
            ])
          ),

          createBrandText(
            createDocWithPlaceholders([
              createTextNode('Antal gäster: '),
              createPlaceholder('Booking.TotalGuests', fields['Booking.TotalGuests']),
            ])
          ),
        ],
        { padding: '20px 0', backgroundColor: '#f6f8f9' }
      ),

      createFooterSection(),
    ],
  });
}
