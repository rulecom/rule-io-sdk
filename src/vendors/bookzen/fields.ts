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
 * Follows Rule.io praxis for custom-field groups:
 * - **Subscriber group (flat)** — guest identity fields that get
 *   overwritten on each sync (e.g. `Subscriber.FirstName`).
 * - **Booking group (historical)** — per-booking event data that
 *   appends a new record on each sync (`Booking.BookingRef`,
 *   `Booking.CheckInDate`, `Booking.RoomName`, etc.).
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
  // Subscriber group — flat, overwritten per sync
  guestFirstName: 'Subscriber.FirstName',

  // Booking group — historical, append-only
  bookingRef: 'Booking.BookingRef',
  serviceType: 'Booking.ServiceType',
  checkInDate: 'Booking.CheckInDate',
  checkOutDate: 'Booking.CheckOutDate',
  totalGuests: 'Booking.TotalGuests',
  totalPrice: 'Booking.TotalPrice',
  roomName: 'Booking.RoomName',
} as const satisfies VendorFieldSchema;

/** Object type of the Bookzen field schema. */
export type BookzenFieldSchema = typeof BOOKZEN_FIELDS;

/** Union of logical Bookzen field name keys. */
export type BookzenFieldNames = keyof BookzenFieldSchema;
