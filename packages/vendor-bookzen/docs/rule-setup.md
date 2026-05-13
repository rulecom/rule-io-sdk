# Bookzen — Rule.io Account Setup

This document describes every tag, custom field group, and custom field that must exist in a Rule.io account before the Bookzen SDK integration can be deployed.

---

## Tags

All tags must be created in Rule.io exactly as shown (lowercase, hyphenated).

### Service type tags

Applied to every subscriber per booking to segment by hospitality vertical.

| Tag value | Purpose |
|---|---|
| `accommodation` | Booking is for accommodation |
| `restaurant` | Booking is for a restaurant |
| `experience` | Booking is for an experience or activity |

### Lifecycle tags

Each tag triggers a distinct automation when added to a subscriber.

| Tag value | Triggered automation |
|---|---|
| `reservation-confirmed` | Reservation Confirmation email |
| `reservation-cancelled` | Reservation Cancellation email |
| `reservation-reminder` | Reservation Reminder email |
| `feedback-request` | Feedback Request email |
| `reservation-request` | Reservation Request email |

### Customer segmentation tags

| Tag value | Purpose |
|---|---|
| `new-customer` | First-time guest |
| `returning-customer` | Returning guest |

---

## Custom Field Groups and Fields

Two field groups are required. Their names and settings must match exactly.

### Group: `Subscriber` (flat)

This group holds guest identity data. Fields in this group are **overwritten** on every sync.

| Field name | Type | Description |
|---|---|---|
| `Subscriber.FirstName` | Text | Guest first name |

### Group: `Booking` (historical)

This group holds per-booking event data. The group must be created with the **historical** flag enabled so that Rule.io **appends a new record** on each sync instead of overwriting.

| Field name | Type | Description |
|---|---|---|
| `Booking.BookingRef` | Text | Booking reference number |
| `Booking.ServiceType` | Text | Service type (`accommodation`, `restaurant`, or `experience`) |
| `Booking.CheckInDate` | Text | Check-in or arrival date (ISO format: `YYYY-MM-DD`) |
| `Booking.CheckOutDate` | Text | Check-out or departure date (ISO format: `YYYY-MM-DD`) |
| `Booking.TotalGuests` | Number | Total number of guests (integer) |
| `Booking.TotalPrice` | Number | Total booking price (decimal) |
| `Booking.RoomName` | Text | Room or table name |

---

## Segments

No named segments need to be created manually. All subscriber segmentation is handled through the service type and customer tags listed above.

---

## Notes

- The `deploy-bookzen` CLI command seeds a test subscriber (`bookzen-seed@rule.se`) against these fields to validate that all field IDs resolve correctly before deploying automations.
- Tag and field name sources of truth: `src/tags.ts` and `src/fields.ts` in this package.
