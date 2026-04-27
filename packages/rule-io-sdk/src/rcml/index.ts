/**
 * RCML Module
 *
 * Tools for building Rule.io email templates using RCML.
 */

// Utilities
export { escapeHtml, sanitizeUrl, formatDateForRule } from './utils.js';

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
} from './elements.js';

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
} from './elements.js';

// Brand template utilities
export {
  // Brand style converter + preferred-style resolver
  toBrandStyleConfig,
  resolvePreferredBrandStyle,
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
  // Generic reusable section helpers
  createSummaryRowsSection,
  createStatusTrackerSection,
  createAddressBlock,
  // Placeholder helpers
  createPlaceholder,
  createLoopFieldPlaceholder,
  createTextNode,
  createDocWithPlaceholders,
  // Validation
  validateCustomFields,
} from './brand-template.js';

// Brand template types
export type {
  BrandStyleConfig,
  BrandStyleResolverClient,
  ResolvedBrandStyle,
  CustomFieldMap,
  SimpleTemplateConfig,
  FooterConfig,
  StatusTrackerStep,
  CreateStatusTrackerSectionOptions,
  CreateAddressBlockOptions,
} from './brand-template.js';

// Hospitality templates (hotels, restaurants, experiences)
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

// E-commerce templates (online stores)
export {
  createOrderConfirmationEmail,
  createShippingUpdateEmail,
  createAbandonedCartEmail,
  createOrderCancellationEmail,
} from './ecommerce-templates.js';

export type {
  OrderConfirmationConfig,
  ShippingUpdateConfig,
  AbandonedCartConfig,
  OrderCancellationConfig,
} from './ecommerce-templates.js';

// Generic templates (vertical-agnostic)
export { createWelcomeEmail } from './generic-templates.js';

export type { WelcomeEmailConfig } from './generic-templates.js';
