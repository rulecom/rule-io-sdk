/**
 * Pre-built Email Templates
 *
 * Ready-to-use email templates for common booking scenarios.
 */

import { DefaultBrandColors } from '../constants';
import type { RCMLDocument } from '../types';
import {
  createRCMLDocument,
  createCenteredSection,
  createHeading,
  createText,
  createButton,
  createLogo,
  createDivider,
} from './elements';
import { escapeHtml, sanitizeUrl } from './utils';

// ============================================================================
// Booking Confirmation Template
// ============================================================================

export interface BookingConfirmationTemplateConfig {
  /**
   * Rule.io brand style ID (optional, defaults to empty string).
   * Get this from Rule.io Settings → Brand.
   */
  brandStyleId?: string;
  logoUrl: string;
  websiteUrl: string;
  guestName: string;
  bookingRef: string;
  serviceName: string;
  serviceType: 'accommodation' | 'restaurant' | 'wine_tasting';
  checkInDate: string;
  checkOutDate?: string;
  totalGuests: number;
  totalPrice: string;
  roomName?: string;
  specialRequests?: string;
  contactEmail: string;
  contactPhone: string;
  /** Primary color for headings (default: brand green) */
  primaryColor?: string;
  /** Accent color for links and dividers (default: brand gold) */
  accentColor?: string;
  /** Background color (default: brand cream) */
  backgroundColor?: string;
  text: {
    preheader: string;
    heading: string;
    intro: string;
    detailsHeading: string;
    labels: {
      bookingRef: string;
      service: string;
      room: string;
      checkIn: string;
      checkOut: string;
      dateTime: string;
      date: string;
      guests: string;
      totalPrice: string;
      requests: string;
    };
    viewBookingButton: string;
    questionsHeading: string;
    contactText: string;
    footer: string;
  };
}

/**
 * Create a booking confirmation email template
 *
 * @example
 * ```typescript
 * const template = createBookingConfirmationTemplate({
 *   guestName: 'Anna',
 *   bookingRef: 'BV-123',
 *   serviceName: 'Hotellpaket',
 *   serviceType: 'accommodation',
 *   checkInDate: '2026-03-15',
 *   checkOutDate: '2026-03-17',
 *   totalGuests: 2,
 *   totalPrice: '4 500 kr',
 *   // ... other config
 * });
 * ```
 */
export function createBookingConfirmationTemplate(
  config: BookingConfirmationTemplateConfig
): RCMLDocument {
  const isAccommodation = config.serviceType === 'accommodation';
  const isRestaurant = config.serviceType === 'restaurant';
  const t = config.text;

  // Escape user-provided values
  const safeGuestName = escapeHtml(config.guestName);
  const safeBookingRef = escapeHtml(config.bookingRef);
  const safeServiceName = escapeHtml(config.serviceName);
  const safeRoomName = config.roomName ? escapeHtml(config.roomName) : undefined;
  const safeCheckInDate = escapeHtml(config.checkInDate);
  const safeCheckOutDate = config.checkOutDate ? escapeHtml(config.checkOutDate) : undefined;
  const safeTotalPrice = escapeHtml(config.totalPrice);
  const safeSpecialRequests = config.specialRequests
    ? escapeHtml(config.specialRequests)
    : undefined;
  const safeContactEmail = escapeHtml(config.contactEmail);
  const safeContactPhone = escapeHtml(config.contactPhone);
  const safeWebsiteUrl = sanitizeUrl(config.websiteUrl);

  // Build booking details content
  const detailsContent: string[] = [
    `<strong>${escapeHtml(t.labels.bookingRef)}:</strong> ${safeBookingRef}`,
    `<strong>${escapeHtml(t.labels.service)}:</strong> ${safeServiceName}`,
  ];

  if (safeRoomName) {
    detailsContent.push(`<strong>${escapeHtml(t.labels.room)}:</strong> ${safeRoomName}`);
  }

  if (isAccommodation && safeCheckOutDate) {
    detailsContent.push(`<strong>${escapeHtml(t.labels.checkIn)}:</strong> ${safeCheckInDate}`);
    detailsContent.push(`<strong>${escapeHtml(t.labels.checkOut)}:</strong> ${safeCheckOutDate}`);
  } else {
    const dateLabel = isRestaurant ? t.labels.dateTime : t.labels.date;
    detailsContent.push(`<strong>${escapeHtml(dateLabel)}:</strong> ${safeCheckInDate}`);
  }

  detailsContent.push(`<strong>${escapeHtml(t.labels.guests)}:</strong> ${config.totalGuests}`);
  detailsContent.push(`<strong>${escapeHtml(t.labels.totalPrice)}:</strong> ${safeTotalPrice}`);

  if (safeSpecialRequests) {
    detailsContent.push(
      `<strong>${escapeHtml(t.labels.requests)}:</strong> ${safeSpecialRequests}`
    );
  }

  // Get colors (with fallbacks)
  const primaryColor = config.primaryColor || DefaultBrandColors.primary;
  const accentColor = config.accentColor || DefaultBrandColors.accent;
  const bgColor = config.backgroundColor || DefaultBrandColors.background;

  // Format contact text
  const contactHtml = escapeHtml(t.contactText)
    .replace(
      '{email}',
      `<a href="mailto:${safeContactEmail}" style="color: ${accentColor};">${safeContactEmail}</a>`
    )
    .replace(
      '{phone}',
      `<a href="tel:${safeContactPhone}" style="color: ${accentColor};">${safeContactPhone}</a>`
    );

  return createRCMLDocument({
    preheader: escapeHtml(t.preheader).replace('{ref}', safeBookingRef),
    styles: {
      brandStyleId: config.brandStyleId || '',
      logoUrl: config.logoUrl,
      primaryColor,
      accentColor,
      backgroundColor: bgColor,
    },
    sections: [
      // Header with logo
      createCenteredSection({
        backgroundColor: DefaultBrandColors.white,
        padding: '30px 0',
        children: [createLogo({ href: safeWebsiteUrl })],
      }),

      // Main content
      createCenteredSection({
        backgroundColor: DefaultBrandColors.white,
        padding: '0 0 30px 0',
        children: [
          createHeading(escapeHtml(t.heading).replace('{name}', safeGuestName), {
            color: primaryColor,
          }),
          createText(escapeHtml(t.intro), { align: 'center' }),
          createDivider({ borderColor: accentColor }),
        ],
      }),

      // Booking details
      createCenteredSection({
        backgroundColor: bgColor,
        padding: '30px 0',
        children: [
          createHeading(escapeHtml(t.detailsHeading), {
            fontSize: '22px',
            padding: '0 0 16px 0',
            color: primaryColor,
          }),
          createText(detailsContent.join('<br/>'), {
            align: 'left',
            lineHeight: '2',
          }),
        ],
      }),

      // CTA Button
      ...(safeWebsiteUrl
        ? [
            createCenteredSection({
              backgroundColor: DefaultBrandColors.white,
              padding: '30px 0',
              children: [
                createButton(
                  escapeHtml(t.viewBookingButton),
                  `${safeWebsiteUrl}/booking/${encodeURIComponent(config.bookingRef)}`,
                  { backgroundColor: primaryColor }
                ),
              ],
            }),
          ]
        : []),

      // Contact info
      createCenteredSection({
        backgroundColor: primaryColor,
        padding: '30px 0',
        children: [
          createHeading(escapeHtml(t.questionsHeading), {
            color: DefaultBrandColors.white,
            fontSize: '20px',
            padding: '0 0 12px 0',
          }),
          createText(contactHtml, {
            align: 'center',
            color: DefaultBrandColors.white,
          }),
        ],
      }),

      // Footer
      createCenteredSection({
        backgroundColor: DefaultBrandColors.white,
        padding: '20px 0',
        children: [
          createText(`© ${new Date().getFullYear()} ${escapeHtml(t.footer)}`, {
            align: 'center',
            color: DefaultBrandColors.textLight,
            fontSize: '12px',
          }),
        ],
      }),
    ],
  });
}

// ============================================================================
// Booking Cancellation Template
// ============================================================================

export interface BookingCancellationTemplateConfig {
  /**
   * Rule.io brand style ID (optional, defaults to empty string).
   * Get this from Rule.io Settings → Brand.
   */
  brandStyleId?: string;
  logoUrl: string;
  websiteUrl: string;
  guestName: string;
  bookingRef: string;
  serviceName: string;
  checkInDate: string;
  contactEmail: string;
  contactPhone: string;
  /** Primary color for headings (default: brand green) */
  primaryColor?: string;
  /** Accent color for links (default: brand gold) */
  accentColor?: string;
  text: {
    preheader: string;
    heading: string;
    greeting: string;
    message: string;
    followUp: string;
    newBookingButton: string;
    contactHeading: string;
    footer: string;
  };
}

/**
 * Create a booking cancellation email template
 */
export function createBookingCancellationTemplate(
  config: BookingCancellationTemplateConfig
): RCMLDocument {
  const t = config.text;

  const safeGuestName = escapeHtml(config.guestName);
  const safeBookingRef = escapeHtml(config.bookingRef);
  const safeServiceName = escapeHtml(config.serviceName);
  const safeCheckInDate = escapeHtml(config.checkInDate);
  const safeContactEmail = escapeHtml(config.contactEmail);
  const safeContactPhone = escapeHtml(config.contactPhone);
  const safeWebsiteUrl = sanitizeUrl(config.websiteUrl);

  // Get colors (with fallbacks)
  const primaryColor = config.primaryColor || DefaultBrandColors.primary;
  const accentColor = config.accentColor || DefaultBrandColors.accent;

  const formattedMessage = escapeHtml(t.message)
    .replace('{ref}', safeBookingRef)
    .replace('{service}', safeServiceName)
    .replace('{date}', safeCheckInDate);

  return createRCMLDocument({
    preheader: escapeHtml(t.preheader).replace('{ref}', safeBookingRef),
    styles: {
      brandStyleId: config.brandStyleId || '',
      logoUrl: config.logoUrl,
      primaryColor,
      accentColor,
    },
    sections: [
      // Header with logo
      createCenteredSection({
        backgroundColor: DefaultBrandColors.white,
        padding: '30px 0',
        children: [createLogo({ href: safeWebsiteUrl })],
      }),

      // Main content
      createCenteredSection({
        backgroundColor: DefaultBrandColors.white,
        padding: '0 0 30px 0',
        children: [
          createHeading(escapeHtml(t.heading), { color: primaryColor }),
          createText(escapeHtml(t.greeting).replace('{name}', safeGuestName), { align: 'left' }),
          createText(formattedMessage, { align: 'left' }),
          createText(escapeHtml(t.followUp), { align: 'left' }),
          createDivider({ borderColor: accentColor }),
        ],
      }),

      // CTA Button
      ...(safeWebsiteUrl
        ? [
            createCenteredSection({
              backgroundColor: DefaultBrandColors.white,
              padding: '20px 0',
              children: [
                createButton(escapeHtml(t.newBookingButton), safeWebsiteUrl, {
                  backgroundColor: primaryColor,
                }),
              ],
            }),
          ]
        : []),

      // Contact info
      createCenteredSection({
        backgroundColor: primaryColor,
        padding: '30px 0',
        children: [
          createHeading(escapeHtml(t.contactHeading), {
            color: DefaultBrandColors.white,
            fontSize: '20px',
            padding: '0 0 12px 0',
          }),
          createText(
            `<a href="mailto:${safeContactEmail}" style="color: ${accentColor};">${safeContactEmail}</a> | <a href="tel:${safeContactPhone}" style="color: ${accentColor};">${safeContactPhone}</a>`,
            {
              align: 'center',
              color: DefaultBrandColors.white,
            }
          ),
        ],
      }),

      // Footer
      createCenteredSection({
        backgroundColor: DefaultBrandColors.white,
        padding: '20px 0',
        children: [
          createText(`© ${new Date().getFullYear()} ${escapeHtml(t.footer)}`, {
            align: 'center',
            color: DefaultBrandColors.textLight,
            fontSize: '12px',
          }),
        ],
      }),
    ],
  });
}

// ============================================================================
// Booking Reminder Template
// ============================================================================

export interface BookingReminderTemplateConfig {
  /**
   * Rule.io brand style ID (optional, defaults to empty string).
   * Get this from Rule.io Settings → Brand.
   */
  brandStyleId?: string;
  logoUrl: string;
  websiteUrl: string;
  guestName: string;
  bookingRef: string;
  serviceName: string;
  serviceType: 'accommodation' | 'restaurant' | 'wine_tasting';
  checkInDate: string;
  checkOutDate?: string;
  totalGuests: number;
  roomName?: string;
  contactEmail: string;
  contactPhone: string;
  daysUntilArrival: number;
  /** Primary color for headings (default: brand green) */
  primaryColor?: string;
  /** Accent color for links and dividers (default: brand gold) */
  accentColor?: string;
  /** Background color (default: brand cream) */
  backgroundColor?: string;
  text: {
    preheader: string;
    heading: string;
    intro: string;
    arrivalTomorrow: string;
    arrivalInDays: string;
    detailsHeading: string;
    labels: {
      bookingRef: string;
      service: string;
      room: string;
      date: string;
      guests: string;
    };
    practicalInfoHeading: string;
    practicalInfoAccommodation: string;
    practicalInfoOther: string;
    viewBookingButton: string;
    questionsHeading: string;
    contactText: string;
    footer: string;
    venueName: string;
  };
}

/**
 * Create a booking reminder email template
 */
export function createBookingReminderTemplate(config: BookingReminderTemplateConfig): RCMLDocument {
  const t = config.text;

  const safeGuestName = escapeHtml(config.guestName);
  const safeBookingRef = escapeHtml(config.bookingRef);
  const safeServiceName = escapeHtml(config.serviceName);
  const safeRoomName = config.roomName ? escapeHtml(config.roomName) : undefined;
  const safeCheckInDate = escapeHtml(config.checkInDate);
  const safeCheckOutDate = config.checkOutDate ? escapeHtml(config.checkOutDate) : undefined;
  const safeContactEmail = escapeHtml(config.contactEmail);
  const safeContactPhone = escapeHtml(config.contactPhone);
  const safeWebsiteUrl = sanitizeUrl(config.websiteUrl);
  const safeVenueName = escapeHtml(t.venueName);

  // Get colors (with fallbacks)
  const primaryColor = config.primaryColor || DefaultBrandColors.primary;
  const accentColor = config.accentColor || DefaultBrandColors.accent;
  const bgColor = config.backgroundColor || DefaultBrandColors.background;

  const arrivalText =
    config.daysUntilArrival === 1
      ? escapeHtml(t.arrivalTomorrow)
      : escapeHtml(t.arrivalInDays).replace('{days}', String(config.daysUntilArrival));

  const contactHtml = escapeHtml(t.contactText)
    .replace(
      '{email}',
      `<a href="mailto:${safeContactEmail}" style="color: ${accentColor};">${safeContactEmail}</a>`
    )
    .replace(
      '{phone}',
      `<a href="tel:${safeContactPhone}" style="color: ${accentColor};">${safeContactPhone}</a>`
    );

  return createRCMLDocument({
    preheader: escapeHtml(t.preheader)
      .replace('{venue}', safeVenueName)
      .replace('{arrivalText}', arrivalText),
    styles: {
      brandStyleId: config.brandStyleId || '',
      logoUrl: config.logoUrl,
      primaryColor,
      accentColor,
      backgroundColor: bgColor,
    },
    sections: [
      // Header with logo
      createCenteredSection({
        backgroundColor: DefaultBrandColors.white,
        padding: '30px 0',
        children: [createLogo({ href: safeWebsiteUrl })],
      }),

      // Main content
      createCenteredSection({
        backgroundColor: DefaultBrandColors.white,
        padding: '0 0 30px 0',
        children: [
          createHeading(escapeHtml(t.heading).replace('{name}', safeGuestName), {
            color: primaryColor,
          }),
          createText(
            escapeHtml(t.intro)
              .replace('{venue}', safeVenueName)
              .replace('{arrivalText}', arrivalText),
            { align: 'center' }
          ),
          createDivider({ borderColor: accentColor }),
        ],
      }),

      // Booking details
      createCenteredSection({
        backgroundColor: bgColor,
        padding: '30px 0',
        children: [
          createHeading(escapeHtml(t.detailsHeading), {
            fontSize: '22px',
            padding: '0 0 16px 0',
            color: primaryColor,
          }),
          createText(
            [
              `<strong>${escapeHtml(t.labels.bookingRef)}:</strong> ${safeBookingRef}`,
              `<strong>${escapeHtml(t.labels.service)}:</strong> ${safeServiceName}`,
              safeRoomName ? `<strong>${escapeHtml(t.labels.room)}:</strong> ${safeRoomName}` : '',
              `<strong>${escapeHtml(t.labels.date)}:</strong> ${safeCheckInDate}${safeCheckOutDate ? ` - ${safeCheckOutDate}` : ''}`,
              `<strong>${escapeHtml(t.labels.guests)}:</strong> ${config.totalGuests}`,
            ]
              .filter(Boolean)
              .join('<br/>'),
            {
              align: 'left',
              lineHeight: '2',
            }
          ),
        ],
      }),

      // Practical info
      createCenteredSection({
        backgroundColor: DefaultBrandColors.white,
        padding: '30px 0',
        children: [
          createHeading(escapeHtml(t.practicalInfoHeading), {
            fontSize: '20px',
            padding: '0 0 16px 0',
            color: primaryColor,
          }),
          createText(
            config.serviceType === 'accommodation'
              ? escapeHtml(t.practicalInfoAccommodation)
              : escapeHtml(t.practicalInfoOther),
            { align: 'left' }
          ),
          ...(safeWebsiteUrl
            ? [
                createButton(
                  escapeHtml(t.viewBookingButton),
                  `${safeWebsiteUrl}/booking/${encodeURIComponent(config.bookingRef)}`,
                  { backgroundColor: primaryColor }
                ),
              ]
            : []),
        ],
      }),

      // Contact info
      createCenteredSection({
        backgroundColor: primaryColor,
        padding: '30px 0',
        children: [
          createHeading(escapeHtml(t.questionsHeading), {
            color: DefaultBrandColors.white,
            fontSize: '20px',
            padding: '0 0 12px 0',
          }),
          createText(contactHtml, {
            align: 'center',
            color: DefaultBrandColors.white,
          }),
        ],
      }),

      // Footer
      createCenteredSection({
        backgroundColor: DefaultBrandColors.white,
        padding: '20px 0',
        children: [
          createText(`© ${new Date().getFullYear()} ${escapeHtml(t.footer)}`, {
            align: 'center',
            color: DefaultBrandColors.textLight,
            fontSize: '12px',
          }),
        ],
      }),
    ],
  });
}
