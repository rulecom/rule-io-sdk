/**
 * Bookzen Custom Field Definitions
 *
 * Field names used by the Bookzen hospitality integration.
 * Covers accommodation, restaurant, and experience bookings.
 */

import type { VendorFieldSchema } from '../types';

/**
 * Bookzen field names for Rule.io custom fields.
 *
 * @example
 * ```typescript
 * import { BOOKZEN_FIELDS } from 'rule-io-sdk';
 *
 * const customFields = {
 *   [BOOKZEN_FIELDS.guestFirstName]: 100001,
 *   [BOOKZEN_FIELDS.bookingRef]: 100002,
 *   // ... map all fields to your Rule.io numeric IDs
 * };
 * ```
 */
export const BOOKZEN_FIELDS = {
  guestFirstName: 'Booking.FirstName',
  bookingRef: 'Booking.BookingRef',
  serviceType: 'Booking.ServiceType',
  checkInDate: 'Booking.CheckInDate',
  checkOutDate: 'Booking.CheckOutDate',
  totalGuests: 'Booking.TotalGuests',
  totalPrice: 'Booking.TotalPrice',
  roomName: 'Booking.RoomName',
} as const satisfies VendorFieldSchema;

export type BookzenFieldNames = typeof BOOKZEN_FIELDS;
