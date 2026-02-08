/**
 * Hospitality Email Templates
 *
 * Pre-built templates for hotels, restaurants, and experiences.
 * These templates use the brand style system and placeholder nodes
 * for merge fields.
 *
 * All text and configuration must be provided by the consumer —
 * no hardcoded defaults for any specific business.
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
  type BrandStyleConfig,
  type CustomFieldMap,
  type FooterConfig,
} from './brand-template';

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
export function createReservationConfirmationEmail(config: ReservationTemplateConfig): RCMLDocument {
  const { customFields, fieldNames, text } = config;

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
      createBrandLogo(),

      // Greeting
      createContentSection(
        [
          createBrandHeading(
            createDocWithPlaceholders([
              createTextNode(`${text.greeting} `),
              createPlaceholder(fieldNames.firstName, customFields[fieldNames.firstName]),
              createTextNode('!'),
            ])
          ),
          createBrandText(
            createDocWithPlaceholders([createTextNode(text.intro)]),
            { align: 'center' }
          ),
        ],
        { padding: '20px 0' }
      ),

      // Details
      createContentSection(
        [
          createBrandHeading(createDocWithPlaceholders([createTextNode(text.detailsHeading)]), 2),
          ...detailRows,
        ],
        { padding: '20px 0', backgroundColor: '#f6f8f9' }
      ),

      // CTA
      createContentSection(
        [
          createBrandButton(
            createDocWithPlaceholders([createTextNode(text.ctaButton)]),
            config.websiteUrl
          ),
        ],
        { padding: '20px 0' }
      ),

      // Footer
      createFooterSection(config.footer),
    ],
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
export function createReservationCancellationEmail(config: ReservationCancellationConfig): RCMLDocument {
  const { customFields, fieldNames, text } = config;

  return createBrandTemplate({
    brandStyle: config.brandStyle,
    preheader: text.preheader,
    sections: [
      createBrandLogo(),

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
            createDocWithPlaceholders([createTextNode(text.followUp)])
          ),
        ],
        { padding: '20px 0' }
      ),

      createContentSection(
        [
          createBrandButton(
            createDocWithPlaceholders([createTextNode(text.ctaButton)]),
            config.websiteUrl
          ),
        ],
        { padding: '20px 0' }
      ),

      createFooterSection(config.footer),
    ],
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
export function createReservationReminderEmail(config: ReservationReminderConfig): RCMLDocument {
  const { customFields, fieldNames, text } = config;

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

  const sections: RCMLDocument['children'][1]['children'] = [
    createBrandLogo(),

    createContentSection(
      [
        createBrandHeading(
          createDocWithPlaceholders([
            createTextNode(`${text.greeting} `),
            createPlaceholder(fieldNames.firstName, customFields[fieldNames.firstName]),
            createTextNode('!'),
          ])
        ),
        createBrandText(
          createDocWithPlaceholders([createTextNode(text.intro)]),
          { align: 'center' }
        ),
      ],
      { padding: '20px 0' }
    ),

    createContentSection(
      [
        createBrandHeading(createDocWithPlaceholders([createTextNode(text.detailsHeading)]), 2),
        ...detailRows,
      ],
      { padding: '20px 0', backgroundColor: '#f6f8f9' }
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
    sections.push(
      createContentSection(
        [
          createBrandButton(
            createDocWithPlaceholders([createTextNode(text.ctaButton)]),
            config.websiteUrl
          ),
        ],
        { padding: '20px 0' }
      )
    );
  }

  sections.push(createFooterSection(config.footer));

  return createBrandTemplate({
    brandStyle: config.brandStyle,
    preheader: text.preheader,
    sections,
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
export function createFeedbackRequestEmail(config: FeedbackRequestConfig): RCMLDocument {
  const { customFields, fieldNames, text } = config;

  return createBrandTemplate({
    brandStyle: config.brandStyle,
    preheader: text.preheader,
    sections: [
      createBrandLogo(),

      createContentSection(
        [
          createBrandHeading(
            createDocWithPlaceholders([
              createTextNode(`${text.greeting} `),
              createPlaceholder(fieldNames.firstName, customFields[fieldNames.firstName]),
              createTextNode('!'),
            ])
          ),
          createBrandText(
            createDocWithPlaceholders([createTextNode(text.message)]),
            { align: 'center' }
          ),
        ],
        { padding: '20px 0' }
      ),

      createContentSection(
        [
          createBrandButton(
            createDocWithPlaceholders([createTextNode(text.ctaButton)]),
            config.feedbackUrl
          ),
        ],
        { padding: '20px 0' }
      ),

      createFooterSection(config.footer),
    ],
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
export function createReservationRequestEmail(config: ReservationRequestConfig): RCMLDocument {
  const { customFields, fieldNames, text } = config;

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
      createBrandLogo(),

      createContentSection(
        [
          createBrandHeading(
            createDocWithPlaceholders([
              createTextNode(`${text.greeting} `),
              createPlaceholder(fieldNames.firstName, customFields[fieldNames.firstName]),
              createTextNode('!'),
            ])
          ),
          createBrandText(
            createDocWithPlaceholders([createTextNode(text.message)]),
            { align: 'center' }
          ),
        ],
        { padding: '20px 0' }
      ),

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
        { padding: '20px 0', backgroundColor: '#f6f8f9' }
      ),

      createFooterSection(config.footer),
    ],
  });
}
