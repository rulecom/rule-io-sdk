/**
 * Rule.io SDK
 *
 * A TypeScript SDK for the Rule.io email marketing API.
 *
 * @example
 * ```typescript
 * import { RuleClient, RuleTags, createBookingConfirmationTemplate } from 'rule-io-sdk';
 *
 * const client = new RuleClient({ apiKey: 'your-api-key' });
 *
 * // Sync a subscriber
 * await client.syncSubscriber({
 *   email: 'guest@example.com',
 *   fields: { FirstName: 'Anna', BookingRef: 'BV-123' },
 *   tags: [RuleTags.BOOKING_CONFIRMED, RuleTags.ACCOMMODATION]
 * });
 *
 * // Create an automation with RCML template
 * const template = createBookingConfirmationTemplate({ ... });
 * await client.createAutomationEmail({
 *   name: 'Booking Confirmation',
 *   triggerType: 'tag',
 *   triggerValue: RuleTags.BOOKING_CONFIRMED,
 *   subject: 'Your booking is confirmed!',
 *   template
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
  DefaultBrandColors,
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

// RCML Utilities (re-exported from rcml module for convenience)
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
  createBookingConfirmationTemplate,
  createBookingCancellationTemplate,
  createBookingReminderTemplate,
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

// New automation configurations (v2) - uses brand templates with proper placeholders
export {
  BOOKING_AUTOMATIONS_V2,
  DEFAULT_TEMPLATE_CONFIG,
  getAutomationByIdV2,
  getAutomationByTriggerV2,
} from './automation-configs-v2';

export type { AutomationConfigV2, TemplateConfigV2 } from './automation-configs-v2';

// Brand template exports
export {
  // Templates
  createBookingConfirmationEmail,
  createBookingCancellationEmail,
  createBookingReminderEmail,
  createAbandonedBookingEmail,
  createPostStayFeedbackEmail,
  createBookingRequestEmail,
  // Brand template utilities
  createBrandTemplate,
  createBrandHead,
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
} from './rcml';

export type {
  BookingTemplateConfig,
  BrandStyleConfig,
  CustomFieldMap,
  SimpleTemplateConfig,
} from './rcml';
