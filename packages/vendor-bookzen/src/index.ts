/**
 * Bookzen Vendor Preset
 *
 * Reference hospitality integration for Rule.io. Each email template
 * lives in its own folder under `src/templates/<name>/` with four
 * files: `<name>.xml`, `<name>-copy.json`, `<name>.ts`, `<name>.test.ts`.
 * See `packages/templates/README.md` for the authoring pattern.
 */

export { bookzenPreset } from './preset.js';
export { BOOKZEN_FIELDS } from './fields.js';
export { BOOKZEN_TAGS } from './tags.js';
export type { BookzenFieldSchema, BookzenFieldNames } from './fields.js';
export type { BookzenTagSchema, BookzenTagNames } from './tags.js';

// Reservation-confirmation template.
export { createReservationConfirmationTemplate } from './templates/reservation-confirmation/reservation-confirmation.js';
export type {
  ReservationConfirmationRenderOptions,
  ReservationConfirmationTemplate,
  ReservationConfirmationTemplateContext,
  ReservationConfirmationTemplateCopy,
} from './templates/reservation-confirmation/reservation-confirmation.js';

// Reservation-cancellation template.
export { createReservationCancellationTemplate } from './templates/reservation-cancellation/reservation-cancellation.js';
export type {
  ReservationCancellationRenderOptions,
  ReservationCancellationTemplate,
  ReservationCancellationTemplateContext,
  ReservationCancellationTemplateCopy,
} from './templates/reservation-cancellation/reservation-cancellation.js';

// Reservation-reminder template.
export { createReservationReminderTemplate } from './templates/reservation-reminder/reservation-reminder.js';
export type {
  ReservationReminderRenderOptions,
  ReservationReminderTemplate,
  ReservationReminderTemplateContext,
  ReservationReminderTemplateCopy,
} from './templates/reservation-reminder/reservation-reminder.js';

// Feedback-request template.
export { createFeedbackRequestTemplate } from './templates/feedback-request/feedback-request.js';
export type {
  FeedbackRequestRenderOptions,
  FeedbackRequestTemplate,
  FeedbackRequestTemplateContext,
  FeedbackRequestTemplateCopy,
} from './templates/feedback-request/feedback-request.js';

// Reservation-request template.
export { createReservationRequestTemplate } from './templates/reservation-request/reservation-request.js';
export type {
  ReservationRequestRenderOptions,
  ReservationRequestTemplate,
  ReservationRequestTemplateContext,
  ReservationRequestTemplateCopy,
} from './templates/reservation-request/reservation-request.js';
