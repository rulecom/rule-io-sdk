/**
 * Bookzen Custom Field Definitions
 *
 * Field names used by the Bookzen hospitality integration.
 * Covers accommodation, restaurant, and experience bookings.
 */

import type { VendorFieldSchema } from './types.js';


/** Subscriber group fields — flat, overwritten on each sync. */
export const BOOKZEN_SUBSCRIBER_FIELD_SCHEMA = {
  guestFirstName: {
    groupName: 'Subscriber',
    fieldName: 'FirstName',
    historical: false,
    description: 'Guest first name',
  },
} as const satisfies VendorFieldSchema;

/** Booking group fields — historical, a new record is appended on each sync. */
export const BOOKZEN_BOOKING_FIELD_SCHEMA = {
  bookingRef: {
    groupName: 'Booking',
    fieldName: 'BookingRef',
    historical: true,
    description: 'Booking reference number',
  },
  serviceType: {
    groupName: 'Booking',
    fieldName: 'ServiceType',
    historical: true,
    description: 'Service type (accommodation, restaurant, experience)',
  },
  checkInDate: {
    groupName: 'Booking',
    fieldName: 'CheckInDate',
    historical: true,
    description: 'Check-in or arrival date',
  },
  checkOutDate: {
    groupName: 'Booking',
    fieldName: 'CheckOutDate',
    historical: true,
    description: 'Check-out or departure date',
  },
  totalGuests: {
    groupName: 'Booking',
    fieldName: 'TotalGuests',
    historical: true,
    description: 'Total number of guests',
  },
  totalPrice: {
    groupName: 'Booking',
    fieldName: 'TotalPrice',
    historical: true,
    description: 'Total booking price',
  },
  roomName: {
    groupName: 'Booking',
    fieldName: 'RoomName',
    historical: true,
    description: 'Room or table name',
  },
} as const satisfies VendorFieldSchema;

/**
 * All Bookzen fields for Rule.io custom fields.
 *
 *
 * - **Subscriber group (flat)** — guest identity fields that get
 *   overwritten on each sync (e.g. `Subscriber.FirstName`).
 * - **Booking group (historical)** — per-booking event data that
 *   appends a new record on each sync (`Booking.BookingRef`,
 *   `Booking.CheckInDate`, `Booking.RoomName`, etc.).
 */
export const BOOKZEN_FIELD_SCHEMA = {
  ...BOOKZEN_SUBSCRIBER_FIELD_SCHEMA,
  ...BOOKZEN_BOOKING_FIELD_SCHEMA,
} as const satisfies VendorFieldSchema;

/** Object type of the Bookzen field schema. */
export type BookzenFieldSchema = typeof BOOKZEN_FIELD_SCHEMA;

/** Union of logical Bookzen field name keys. */
export type BookzenFieldName = keyof BookzenFieldSchema;

/** Union of Bookzen subscriber field name keys. */
export type BookzenSubscriberFieldName = keyof typeof BOOKZEN_SUBSCRIBER_FIELD_SCHEMA;

/** Union of Bookzen booking field name keys. */
export type BookzenBookingFieldName = keyof typeof BOOKZEN_BOOKING_FIELD_SCHEMA;
