/**
 * Hospitality Email Templates
 *
 * Pre-built templates for hotels, restaurants, and experiences.
 * These templates use the brand style system and placeholder nodes
 * for merge fields.
 *
 * All text and configuration must be provided by the consumer —
 * no hardcoded defaults for any specific business.
 *
 * Note: The footer section defaults to English link text ("View in browser",
 * "Unsubscribe") when no `footer` config is provided. Pass a `footer` object
 * to override with your own locale.
 */

import { type BrandStyleConfig, type CustomFieldMap, type FooterConfig } from '@rule-io/core';
import { createBrandTemplate, createBrandHeading, createBrandText, createBrandButton, createContentSection, createFooterSection, createPlaceholder, createTextNode, createDocWithPlaceholders, createLogoSection, createGreetingSection, createCtaSection, validateCustomFields, withTemplateContext, type RcmlDocument } from '@rule-io/rcml';

// ============================================================================
// Template Configuration
// ============================================================================

export interface ReservationTemplateConfig {
  /** Brand style configuration (required) */
  brandStyle: BrandStyleConfig;
  /** Custom field ID mapping (required) */
  customFields: CustomFieldMap;
  /** Website URL for buttons */
  websiteUrl: string;
  /** Footer configuration for localization */
  footer?: FooterConfig;
  /** All display text — fully configurable for localization */
  text: {
    preheader: string;
    greeting: string;
    intro: string;
    detailsHeading: string;
    referenceLabel: string;
    serviceLabel: string;
    roomLabel?: string;
    checkInLabel: string;
    checkOutLabel?: string;
    guestsLabel: string;
    totalPriceLabel?: string;
    currency?: string;
    ctaButton: string;
  };
  /** Field names used in your Rule.io custom fields */
  fieldNames: {
    firstName: string;
    bookingRef: string;
    serviceType: string;
    checkInDate: string;
    checkOutDate?: string;
    totalGuests: string;
    totalPrice?: string;
    roomName?: string;
  };
}

// ============================================================================
// Reservation Confirmation Template
// ============================================================================

/**
 * Create a reservation confirmation email template.
 *
 * @example
 * ```typescript
 * const email = createReservationConfirmationEmail({
 *   brandStyle: myBrandStyle,
 *   customFields: myFields,
 *   websiteUrl: 'https://example.com',
 *   text: {
 *     preheader: 'Thank you for your reservation!',
 *     greeting: 'Hello',
 *     intro: 'Thank you for your reservation. We look forward to welcoming you!',
 *     detailsHeading: 'Reservation Details',
 *     referenceLabel: 'Reference',
 *     serviceLabel: 'Service',
 *     roomLabel: 'Room',
 *     checkInLabel: 'Check-in',
 *     checkOutLabel: 'Check-out',
 *     guestsLabel: 'Guests',
 *     totalPriceLabel: 'Total',
 *     ctaButton: 'View Reservation',
 *   },
 *   fieldNames: {
 *     firstName: 'Booking.FirstName',
 *     bookingRef: 'Booking.BookingRef',
 *     serviceType: 'Booking.ServiceType',
 *     checkInDate: 'Booking.CheckInDate',
 *     checkOutDate: 'Booking.CheckOutDate',
 *     totalGuests: 'Booking.TotalGuests',
 *     totalPrice: 'Booking.TotalPrice',
 *     roomName: 'Booking.RoomName',
 *   },
 * });
 * ```
 */
export function createReservationConfirmationEmail(config: ReservationTemplateConfig): RcmlDocument {
  const templateName = 'createReservationConfirmationEmail';
  return withTemplateContext(templateName, () => {
    const { customFields, fieldNames, text } = config;
    validateCustomFields(customFields, fieldNames);

    const detailRows: ReturnType<typeof createBrandText>[] = [
      // Reference
      createBrandText(
        createDocWithPlaceholders([
          createTextNode(`${text.referenceLabel}: `),
          createPlaceholder(fieldNames.bookingRef, customFields[fieldNames.bookingRef]),
        ])
      ),
      // Service type
      createBrandText(
        createDocWithPlaceholders([
          createTextNode(`${text.serviceLabel}: `),
          createPlaceholder(fieldNames.serviceType, customFields[fieldNames.serviceType]),
        ])
      ),
    ];

    // Room (optional)
    if (fieldNames.roomName && text.roomLabel) {
      detailRows.push(
        createBrandText(
          createDocWithPlaceholders([
            createTextNode(`${text.roomLabel}: `),
            createPlaceholder(fieldNames.roomName, customFields[fieldNames.roomName]),
          ])
        )
      );
    }

    // Check-in
    detailRows.push(
      createBrandText(
        createDocWithPlaceholders([
          createTextNode(`${text.checkInLabel}: `),
          createPlaceholder(fieldNames.checkInDate, customFields[fieldNames.checkInDate]),
        ])
      )
    );

    // Check-out (optional)
    if (fieldNames.checkOutDate && text.checkOutLabel) {
      detailRows.push(
        createBrandText(
          createDocWithPlaceholders([
            createTextNode(`${text.checkOutLabel}: `),
            createPlaceholder(fieldNames.checkOutDate, customFields[fieldNames.checkOutDate]),
          ])
        )
      );
    }

    // Guests
    detailRows.push(
      createBrandText(
        createDocWithPlaceholders([
          createTextNode(`${text.guestsLabel}: `),
          createPlaceholder(fieldNames.totalGuests, customFields[fieldNames.totalGuests]),
        ])
      )
    );

    // Total price (optional)
    if (fieldNames.totalPrice && text.totalPriceLabel) {
      const priceContent = text.currency
        ? [
            createTextNode(`${text.totalPriceLabel}: `),
            createPlaceholder(fieldNames.totalPrice, customFields[fieldNames.totalPrice]),
            createTextNode(` ${text.currency}`),
          ]
        : [
            createTextNode(`${text.totalPriceLabel}: `),
            createPlaceholder(fieldNames.totalPrice, customFields[fieldNames.totalPrice]),
          ];
      detailRows.push(createBrandText(createDocWithPlaceholders(priceContent)));
    }

    return createBrandTemplate({
      brandStyle: config.brandStyle,
      preheader: text.preheader,
      sections: [
        // Logo
        ...createLogoSection(config.brandStyle.logoUrl),

        // Greeting
        createGreetingSection(text.greeting, text.intro, fieldNames.firstName, customFields[fieldNames.firstName]),

        // Details
        createContentSection(
          [
            createBrandHeading(createDocWithPlaceholders([createTextNode(text.detailsHeading)]), 2),
            ...detailRows,
          ],
          { padding: '20px 0', backgroundColor: config.brandStyle.brandColor }
        ),

        // CTA
        createCtaSection(text.ctaButton, config.websiteUrl),

        // Footer
        createFooterSection(config.footer),
      ],
    });
  });
}

// ============================================================================
// Reservation Cancellation Template
// ============================================================================

export interface ReservationCancellationConfig {
  brandStyle: BrandStyleConfig;
  customFields: CustomFieldMap;
  websiteUrl: string;
  footer?: FooterConfig;
  text: {
    preheader: string;
    heading: string;
    greeting: string;
    message: string;
    referenceLabel: string;
    followUp: string;
    ctaButton: string;
  };
  fieldNames: {
    firstName: string;
    bookingRef: string;
  };
}

/**
 * Create a reservation cancellation email template.
 */
export function createReservationCancellationEmail(config: ReservationCancellationConfig): RcmlDocument {
  const templateName = 'createReservationCancellationEmail';
  return withTemplateContext(templateName, () => {
    const { customFields, fieldNames, text } = config;
    validateCustomFields(customFields, fieldNames);

    return createBrandTemplate({
      brandStyle: config.brandStyle,
      preheader: text.preheader,
      sections: [
        ...createLogoSection(config.brandStyle.logoUrl),

        createContentSection(
          [
            createBrandHeading(createDocWithPlaceholders([createTextNode(text.heading)])),

            createBrandText(
              createDocWithPlaceholders([
                createTextNode(`${text.greeting} `),
                createPlaceholder(fieldNames.firstName, customFields[fieldNames.firstName]),
                createTextNode(','),
              ])
            ),

            createBrandText(
              createDocWithPlaceholders([
                createTextNode(text.message),
              ])
            ),

            createBrandText(
              createDocWithPlaceholders([
                createTextNode(`${text.referenceLabel}: `),
                createPlaceholder(fieldNames.bookingRef, customFields[fieldNames.bookingRef]),
              ])
            ),

            createBrandText(
              createDocWithPlaceholders([createTextNode(text.followUp)])
            ),
          ],
          { padding: '20px 0' }
        ),

        createCtaSection(text.ctaButton, config.websiteUrl),

        createFooterSection(config.footer),
      ],
    });
  });
}

// ============================================================================
// Reservation Reminder Template
// ============================================================================

export interface ReservationReminderConfig {
  brandStyle: BrandStyleConfig;
  customFields: CustomFieldMap;
  websiteUrl: string;
  footer?: FooterConfig;
  text: {
    preheader: string;
    greeting: string;
    intro: string;
    detailsHeading: string;
    dateLabel: string;
    roomLabel?: string;
    practicalInfoHeading?: string;
    practicalInfo?: string;
    ctaButton: string;
  };
  fieldNames: {
    firstName: string;
    checkInDate: string;
    checkOutDate?: string;
    roomName?: string;
  };
}

/**
 * Create a reservation reminder email template.
 */
export function createReservationReminderEmail(config: ReservationReminderConfig): RcmlDocument {
  const templateName = 'createReservationReminderEmail';
  return withTemplateContext(templateName, () => {
    const { customFields, fieldNames, text } = config;
    validateCustomFields(customFields, fieldNames);

    const detailRows: ReturnType<typeof createBrandText>[] = [];

    // Dates
    if (fieldNames.checkOutDate) {
      detailRows.push(
        createBrandText(
          createDocWithPlaceholders([
            createTextNode(`${text.dateLabel}: `),
            createPlaceholder(fieldNames.checkInDate, customFields[fieldNames.checkInDate]),
            createTextNode(' - '),
            createPlaceholder(fieldNames.checkOutDate, customFields[fieldNames.checkOutDate]),
          ])
        )
      );
    } else {
      detailRows.push(
        createBrandText(
          createDocWithPlaceholders([
            createTextNode(`${text.dateLabel}: `),
            createPlaceholder(fieldNames.checkInDate, customFields[fieldNames.checkInDate]),
          ])
        )
      );
    }

    // Room (optional)
    if (fieldNames.roomName && text.roomLabel) {
      detailRows.push(
        createBrandText(
          createDocWithPlaceholders([
            createTextNode(`${text.roomLabel}: `),
            createPlaceholder(fieldNames.roomName, customFields[fieldNames.roomName]),
          ])
        )
      );
    }

    const sections: RcmlDocument['children'][1]['children'] = [
      ...createLogoSection(config.brandStyle.logoUrl),

      createGreetingSection(text.greeting, text.intro, fieldNames.firstName, customFields[fieldNames.firstName]),

      createContentSection(
        [
          createBrandHeading(createDocWithPlaceholders([createTextNode(text.detailsHeading)]), 2),
          ...detailRows,
        ],
        { padding: '20px 0', backgroundColor: config.brandStyle.brandColor }
      ),
    ];

    // Practical info (optional)
    if (text.practicalInfoHeading && text.practicalInfo) {
      sections.push(
        createContentSection(
          [
            createBrandHeading(
              createDocWithPlaceholders([createTextNode(text.practicalInfoHeading)]),
              3
            ),
            createBrandText(createDocWithPlaceholders([createTextNode(text.practicalInfo)])),
            createBrandButton(
              createDocWithPlaceholders([createTextNode(text.ctaButton)]),
              config.websiteUrl
            ),
          ],
          { padding: '20px 0' }
        )
      );
    } else {
      sections.push(createCtaSection(text.ctaButton, config.websiteUrl));
    }

    sections.push(createFooterSection(config.footer));

    return createBrandTemplate({
      brandStyle: config.brandStyle,
      preheader: text.preheader,
      sections,
    });
  });
}

// ============================================================================
// Feedback Request Template
// ============================================================================

export interface FeedbackRequestConfig {
  brandStyle: BrandStyleConfig;
  customFields: CustomFieldMap;
  feedbackUrl: string;
  footer?: FooterConfig;
  text: {
    preheader: string;
    greeting: string;
    message: string;
    ctaButton: string;
  };
  fieldNames: {
    firstName: string;
  };
}

/**
 * Create a feedback/review request email template.
 * Works for post-stay, post-purchase, or any review request.
 */
export function createFeedbackRequestEmail(config: FeedbackRequestConfig): RcmlDocument {
  const templateName = 'createFeedbackRequestEmail';
  return withTemplateContext(templateName, () => {
    const { customFields, fieldNames, text } = config;
    validateCustomFields(customFields, fieldNames);

    return createBrandTemplate({
      brandStyle: config.brandStyle,
      preheader: text.preheader,
      sections: [
        ...createLogoSection(config.brandStyle.logoUrl),

        createGreetingSection(text.greeting, text.message, fieldNames.firstName, customFields[fieldNames.firstName]),

        createCtaSection(text.ctaButton, config.feedbackUrl),

        createFooterSection(config.footer),
      ],
    });
  });
}

// ============================================================================
// Reservation Request (Pending) Template
// ============================================================================

export interface ReservationRequestConfig {
  brandStyle: BrandStyleConfig;
  customFields: CustomFieldMap;
  footer?: FooterConfig;
  text: {
    preheader: string;
    greeting: string;
    message: string;
    detailsHeading: string;
    referenceLabel: string;
    dateLabel: string;
    guestsLabel: string;
  };
  fieldNames: {
    firstName: string;
    bookingRef: string;
    checkInDate: string;
    checkOutDate?: string;
    totalGuests: string;
  };
}

/**
 * Create a reservation request confirmation email (for pending/manual approval flows).
 */
export function createReservationRequestEmail(config: ReservationRequestConfig): RcmlDocument {
  const templateName = 'createReservationRequestEmail';
  return withTemplateContext(templateName, () => {
    const { customFields, fieldNames, text } = config;
    validateCustomFields(customFields, fieldNames);

    const dateContent = fieldNames.checkOutDate
      ? [
          createTextNode(`${text.dateLabel}: `),
          createPlaceholder(fieldNames.checkInDate, customFields[fieldNames.checkInDate]),
          createTextNode(' - '),
          createPlaceholder(fieldNames.checkOutDate, customFields[fieldNames.checkOutDate]),
        ]
      : [
          createTextNode(`${text.dateLabel}: `),
          createPlaceholder(fieldNames.checkInDate, customFields[fieldNames.checkInDate]),
        ];

    return createBrandTemplate({
      brandStyle: config.brandStyle,
      preheader: text.preheader,
      sections: [
        ...createLogoSection(config.brandStyle.logoUrl),

        createGreetingSection(text.greeting, text.message, fieldNames.firstName, customFields[fieldNames.firstName]),

        createContentSection(
          [
            createBrandHeading(createDocWithPlaceholders([createTextNode(text.detailsHeading)]), 2),

            createBrandText(
              createDocWithPlaceholders([
                createTextNode(`${text.referenceLabel}: `),
                createPlaceholder(fieldNames.bookingRef, customFields[fieldNames.bookingRef]),
              ])
            ),

            createBrandText(createDocWithPlaceholders(dateContent)),

            createBrandText(
              createDocWithPlaceholders([
                createTextNode(`${text.guestsLabel}: `),
                createPlaceholder(fieldNames.totalGuests, customFields[fieldNames.totalGuests]),
              ])
            ),
          ],
          { padding: '20px 0', backgroundColor: config.brandStyle.brandColor }
        ),

        createFooterSection(config.footer),
      ],
    });
  });
}
