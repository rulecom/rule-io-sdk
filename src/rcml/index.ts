/**
 * RCML Module
 *
 * Tools for building Rule.io email templates using RCML.
 */

// Utilities
export { escapeHtml, sanitizeUrl, formatDateForRule } from './utils';

// Elements
export {
  createRCMLDocument,
  createCenteredSection,
  createTwoColumnSection,
  createSection,
  createColumn,
  createProseMirrorDoc,
  createHeading,
  createText,
  createButton,
  createImage,
  createLogo,
  createVideo,
  createSpacer,
  createDivider,
} from './elements';

// Element option types
export type {
  EmailStyleConfig,
  CreateRCMLDocumentOptions,
  CreateSectionOptions,
  CreateTwoColumnSectionOptions,
  CreateHeadingOptions,
  CreateTextOptions,
  CreateButtonOptions,
  CreateImageOptions,
  CreateLogoOptions,
  CreateVideoOptions,
  CreateDividerOptions,
} from './elements';

// Legacy Templates (use brand templates instead for new code)
export {
  createBookingConfirmationTemplate,
  createBookingCancellationTemplate,
  createBookingReminderTemplate,
} from './templates';

// Legacy template config types
export type {
  BookingConfirmationTemplateConfig,
  BookingCancellationTemplateConfig,
  BookingReminderTemplateConfig,
} from './templates';

// Brand-based templates (recommended)
export {
  // Template builders
  createBookingConfirmationEmail,
  createBookingCancellationEmail,
  createBookingReminderEmail,
  createAbandonedBookingEmail,
  createPostStayFeedbackEmail,
  createBookingRequestEmail,
  // Config type
  type BookingTemplateConfig,
} from './booking-templates';

// Brand template utilities
export {
  // Template builder
  createBrandTemplate,
  // Head builder
  createBrandHead,
  // Element builders
  createBrandLogo,
  createBrandHeading,
  createBrandText,
  createBrandButton,
  createContentSection,
  createFooterSection,
  // Placeholder helpers
  createPlaceholder,
  createTextNode,
  createDocWithPlaceholders,
  // Default configurations
  BLACKSTA_CUSTOM_FIELDS,
  BLACKSTA_BRAND_STYLE,
  // Types
  type BrandStyleConfig,
  type CustomFieldMap,
  type SimpleTemplateConfig,
} from './brand-template';
