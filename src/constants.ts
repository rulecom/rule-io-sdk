/**
 * Rule.io SDK Constants
 */

/**
 * Default API base URLs
 */
export const RULE_API_V2_BASE_URL = 'https://app.rule.io/api/v2';
export const RULE_API_V3_BASE_URL = 'https://app.rule.io/api/v3';

/**
 * Common Rule.io tags for booking systems
 */
export const RuleTags = {
  // Booking lifecycle events
  BOOKING_STARTED: 'booking-started',
  BOOKING_REQUEST: 'booking-request',
  BOOKING_CONFIRMED: 'booking-confirmed',
  BOOKING_CANCELLED: 'booking-cancelled',
  BOOKING_REMINDER: 'booking-reminder',
  BOOKING_COMPLETED: 'booking-completed',

  // Service type segmentation
  ACCOMMODATION: 'accommodation',
  RESTAURANT: 'restaurant',
  WINE_TASTING: 'wine-tasting',

  // Guest segmentation
  RETURNING_GUEST: 'returning-guest',
  NEW_GUEST: 'new-guest',
} as const;

export type RuleTag = (typeof RuleTags)[keyof typeof RuleTags];

/**
 * Brand colors for email templates
 */
export const DefaultBrandColors = {
  primary: '#2D5016',
  secondary: '#8B4513',
  accent: '#D4AF37',
  background: '#FDF5E6',
  text: '#333333',
  textLight: '#666666',
  white: '#FFFFFF',
} as const;
