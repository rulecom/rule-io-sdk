/**
 * Rule.io SDK
 *
 * A TypeScript SDK for the Rule.io email marketing API.
 * Supports e-commerce, hospitality, and any vertical that uses
 * email automation with Rule.io.
 *
 * @example
 * ```typescript
 * import { RuleClient, RuleTags, createOrderConfirmationEmail } from 'rule-io-sdk';
 *
 * const client = new RuleClient({ apiKey: 'your-api-key' });
 *
 * // Sync a subscriber
 * await client.syncSubscriber({
 *   email: 'customer@example.com',
 *   fields: { FirstName: 'Anna', OrderRef: 'ORD-123' },
 *   tags: [RuleTags.ORDER_CONFIRMED, RuleTags.NEW_CUSTOMER],
 * });
 * ```
 *
 * @packageDocumentation
 */

// Client
export { RuleClient } from './client';

// Errors
export { RuleApiError, RuleConfigError } from './errors';

// Constants
export {
  RULE_API_V2_BASE_URL,
  RULE_API_V3_BASE_URL,
  RuleTags,
} from './constants';
export type { RuleTag } from './constants';

// Types - API
export type {
  RuleApiResponse,
  RuleSubscriberFields,
  RuleSubscriber,
  RuleSubscriberResponse,
  RuleSubscriberFieldsResponse,
  RuleSubscriberTagsResponse,
  RuleAutomail,
  RuleAutomailCreateRequest,
  RuleAutomailResponse,
  RuleMessage,
  RuleMessageCreateRequest,
  RuleMessageResponse,
  RuleTemplate,
  RuleTemplateCreateRequest,
  RuleTemplateResponse,
  RuleDynamicSet,
  RuleDynamicSetCreateRequest,
  RuleDynamicSetResponse,
  RuleClientConfig,
  CreateAutomationEmailConfig,
  CreateAutomationEmailResult,
} from './types';

// Types - RCML
export type {
  RCMLProseMirrorDoc,
  RCMLProseMirrorNode,
  RCMLProseMirrorMark,
  RCMLDocument,
  RCMLHead,
  RCMLAttributes,
  RCMLClass,
  RCMLBodyStyle,
  RCMLSectionStyle,
  RCMLButtonStyle,
  RCMLSocialConfig,
  RCMLBrandStyle,
  RCMLPreview,
  RCMLFont,
  RCMLPlainText,
  RCMLBody,
  RCMLSection,
  RCMLColumn,
  RCMLColumnChild,
  RCMLText,
  RCMLHeading,
  RCMLButton,
  RCMLImage,
  RCMLLogo,
  RCMLVideo,
  RCMLSpacer,
  RCMLDivider,
  RCMLSocial,
  RCMLSocialElement,
  RCMLLoop,
  RCMLSwitch,
  RCMLCase,
} from './types';

// RCML Utilities
export {
  escapeHtml,
  sanitizeUrl,
  formatDateForRule,
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
} from './rcml';

// RCML option types
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
} from './rcml';

// Brand template utilities
export {
  createBrandTemplate,
  createBrandHead,
  createBrandLogo,
  createBrandHeading,
  createBrandText,
  createBrandButton,
  createContentSection,
  createFooterSection,
  createPlaceholder,
  createTextNode,
  createDocWithPlaceholders,
} from './rcml';

export type {
  BrandStyleConfig,
  CustomFieldMap,
  SimpleTemplateConfig,
  FooterConfig,
} from './rcml';

// Hospitality templates
export {
  createReservationConfirmationEmail,
  createReservationCancellationEmail,
  createReservationReminderEmail,
  createFeedbackRequestEmail,
  createReservationRequestEmail,
} from './rcml';

export type {
  ReservationTemplateConfig,
  ReservationCancellationConfig,
  ReservationReminderConfig,
  FeedbackRequestConfig,
  ReservationRequestConfig,
} from './rcml';

// E-commerce templates
export {
  createOrderConfirmationEmail,
  createShippingUpdateEmail,
  createAbandonedCartEmail,
  createOrderCancellationEmail,
} from './rcml';

export type {
  OrderConfirmationConfig,
  ShippingUpdateConfig,
  AbandonedCartConfig,
  OrderCancellationConfig,
} from './rcml';

// Legacy templates (kept for backward compatibility)
export {
  createBookingConfirmationTemplate,
  createBookingCancellationTemplate,
  createBookingReminderTemplate,
} from './rcml';

export type {
  BookingConfirmationTemplateConfig,
  BookingCancellationTemplateConfig,
  BookingReminderTemplateConfig,
} from './rcml';

// Legacy automation configurations (v1)
export {
  BOOKING_AUTOMATIONS,
  BOOKING_CONFIRMATION_TEXT,
  BOOKING_CANCELLATION_TEXT,
  BOOKING_REMINDER_TEXT,
  ABANDONED_BOOKING_TEXT,
  POST_STAY_FEEDBACK_TEXT,
  TAG_AUTOMATION_MAP,
  getAutomationById,
  getAutomationByTrigger,
} from './automation-configs';

export type { AutomationConfig, AutomationCondition, TemplateConfig } from './automation-configs';

// Automation configurations (v2)
export {
  BOOKING_AUTOMATIONS_V2,
  DEFAULT_TEMPLATE_CONFIG,
  getAutomationByIdV2,
  getAutomationByTriggerV2,
} from './automation-configs-v2';

export type { AutomationConfigV2, TemplateConfigV2 } from './automation-configs-v2';
