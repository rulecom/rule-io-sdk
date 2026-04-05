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
 *   tags: [RuleTags.ORDER_COMPLETED, RuleTags.NEWSLETTER],
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
  RuleAutomailListParams,
  RuleAutomailListResponse,
  RuleMessage,
  RuleMessageCreateRequest,
  RuleMessageResponse,
  RuleMessageListParams,
  RuleMessageListResponse,
  RuleTemplate,
  RuleTemplateCreateRequest,
  RuleTemplateResponse,
  RuleTemplateListParams,
  RuleTemplateListResponse,
  RuleDynamicSet,
  RuleDynamicSetCreateRequest,
  RuleDynamicSetUpdateRequest,
  RuleDynamicSetResponse,
  RuleDynamicSetListParams,
  RuleDynamicSetListResponse,
  RulePaginationParams,
  RuleListResponse,
  RuleRenderTemplateParams,
  RuleCampaign,
  RuleCampaignStatus,
  RuleCampaignRecipientTag,
  RuleCampaignRecipientSegment,
  RuleCampaignCreateRequest,
  RuleCampaignUpdateRequest,
  RuleCampaignResponse,
  RuleCampaignListParams,
  RuleCampaignListResponse,
  RuleCampaignScheduleRequest,
  RuleClientConfig,
  CreateAutomationEmailConfig,
  CreateAutomationEmailResult,
  RuleCustomFieldDataValue,
  RuleCustomFieldValue,
  RuleCustomFieldDataRecord,
  RuleCustomFieldDataResponse,
  RuleCustomFieldDataSingleResponse,
  RuleCustomFieldDataListParams,
  RuleCustomFieldDataGroupParams,
  RuleCustomFieldDataCreateRequest,
  RuleCustomFieldDataUpdateRequest,
  RuleCustomFieldDataSearchParams,
  RuleSuppressionSubscriberIdentifier,
  RuleSuppressionRequest,
  RuleSubscriberV3,
  RuleSubscriberV3CreateRequest,
  RuleSubscriberV3Response,
  RuleBulkSubscriberIdentifier,
  RuleBulkTagsRequest,
  RuleSubscriberTagsV3Request,
  RuleSitooCredential,
  RuleAccount,
  RuleAccountSimple,
  RuleAccountCreateRequest,
  RuleAccountGetParams,
  RuleAccountResponse,
  RuleAccountCreateResponse,
  RuleAccountListResponse,
  RuleBrandStyleColourType,
  RuleBrandStyleColour,
  RuleBrandStyleLinkType,
  RuleBrandStyleLink,
  RuleBrandStyleFontType,
  RuleBrandStyleFontOrigin,
  RuleBrandStyleFont,
  RuleBrandStyleImageType,
  RuleBrandStyleImage,
  RuleBrandStyle,
  RuleBrandStyleListItem,
  RuleBrandStyleFromDomainRequest,
  RuleBrandStyleCreateRequest,
  RuleBrandStyleUpdateRequest,
  RuleBrandStyleManualRequest,
  RuleBrandStyleResponse,
  RuleBrandStyleListResponse,
  RuleApiKey,
  RuleApiKeyCreateRequest,
  RuleApiKeyUpdateRequest,
  RuleApiKeyResponse,
  RuleApiKeyListResponse,
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
  createLoop,
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
  CreateLoopOptions,
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
  createBrandLoop,
  createPlaceholder,
  createLoopFieldPlaceholder,
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

// Automation configurations
export {
  getAutomationByIdV2,
  getAutomationByTriggerV2,
} from './automation-configs-v2';

export type { AutomationConfigV2, TemplateConfigV2 } from './automation-configs-v2';

// Vendor presets
export {
  shopifyPreset,
  SHOPIFY_FIELDS,
  SHOPIFY_TAGS,
  bookzenPreset,
  BOOKZEN_FIELDS,
  BOOKZEN_TAGS,
} from './vendors';

export type {
  VendorPreset,
  VendorFieldSchema,
  VendorTagSchema,
  VendorConsumerConfig,
  VendorAutomation,
  VendorFieldInfo,
  ShopifyFieldSchema,
  ShopifyFieldNames,
  ShopifyTagSchema,
  ShopifyTagNames,
  BookzenFieldSchema,
  BookzenFieldNames,
  BookzenTagSchema,
  BookzenTagNames,
} from './vendors';
