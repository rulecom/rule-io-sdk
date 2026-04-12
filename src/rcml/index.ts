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
  createLoop,
  createSocialElement,
  createSocial,
  createCase,
  createSwitch,
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
  CreateLoopOptions,
  CreateSocialElementOptions,
  CreateSocialOptions,
  CreateCaseOptions,
} from './elements';

// Brand template utilities
export {
  // Brand style converter
  toBrandStyleConfig,
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
  createDefaultContentSection,
  createFooterSection,
  createBrandLoop,
  // Placeholder helpers
  createPlaceholder,
  createLoopFieldPlaceholder,
  createTextNode,
  createDocWithPlaceholders,
  // Validation
  validateCustomFields,
} from './brand-template';

// Brand template types
export type {
  BrandStyleConfig,
  CustomFieldMap,
  SimpleTemplateConfig,
  FooterConfig,
} from './brand-template';

// Hospitality templates (hotels, restaurants, experiences)
export {
  createReservationConfirmationEmail,
  createReservationCancellationEmail,
  createReservationReminderEmail,
  createFeedbackRequestEmail,
  createReservationRequestEmail,
} from './hospitality-templates';

export type {
  ReservationTemplateConfig,
  ReservationCancellationConfig,
  ReservationReminderConfig,
  FeedbackRequestConfig,
  ReservationRequestConfig,
} from './hospitality-templates';

// E-commerce templates (online stores)
export {
  createOrderConfirmationEmail,
  createShippingUpdateEmail,
  createAbandonedCartEmail,
  createOrderCancellationEmail,
} from './ecommerce-templates';

export type {
  OrderConfirmationConfig,
  ShippingUpdateConfig,
  AbandonedCartConfig,
  OrderCancellationConfig,
} from './ecommerce-templates';
