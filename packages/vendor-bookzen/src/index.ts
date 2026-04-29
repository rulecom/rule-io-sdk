/**
 * Bookzen Vendor Preset
 *
 * Reference hospitality integration for Rule.io.
 */

export { bookzenPreset } from './preset.js';
export { BOOKZEN_FIELDS } from './fields.js';
export { BOOKZEN_TAGS } from './tags.js';
export type { BookzenFieldSchema, BookzenFieldNames } from './fields.js';
export type { BookzenTagSchema, BookzenTagNames } from './tags.js';

// Hospitality email templates (moved from @rule-io/rcml — re-exported so the
// @rule-io/sdk meta-package keeps surfacing them for external consumers).
export {
  createReservationConfirmationEmail,
  createReservationCancellationEmail,
  createReservationReminderEmail,
  createFeedbackRequestEmail,
  createReservationRequestEmail,
} from './hospitality-templates.js';
export type {
  ReservationTemplateConfig,
  ReservationCancellationConfig,
  ReservationReminderConfig,
  FeedbackRequestConfig,
  ReservationRequestConfig,
} from './hospitality-templates.js';
