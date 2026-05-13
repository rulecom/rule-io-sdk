/**
 * Public type barrel for `@rule-io/client`.
 *
 * Every type previously declared in this file lives next to its namespace
 * client (under `resources/<namespace>/<namespace>.types.ts`); this barrel
 * re-exports them all under their original names so `import type { ... }
 * from '@rule-io/client'` keeps working unchanged for downstream consumers.
 *
 * The `RuleTag` v2 entity historically defined here is now exported as
 * `RuleTagEntity` to avoid colliding with the `RuleTag` string-literal union
 * exported from `constants.ts`.
 */

// ── Cross-cutting base types ─────────────────────────────────────────────────
export type {
  RuleApiResponse,
  RuleListResponse,
  RulePaginationParams,
} from './shared.types.js';

// ── Client configuration ─────────────────────────────────────────────────────
export type { RuleClientConfig } from './config.js';

// ── Subscribers (v2 + v3) ────────────────────────────────────────────────────
export type {
  RuleSubscriber,
  RuleSubscriberFields,
  RuleSubscriberFieldsResponse,
  GetSubscriberV2Response,
  SubscriberSegmentV2,
  RuleSubscriberTagsResponse,
  RuleSubscriberV3,
  CreateSubscriberV3Request,
  CreateSubscriberV3Response,
  RuleBulkSubscriberIdentifier,
  RuleBulkTagsRequest,
  RuleSubscriberTagsV3Request,
} from './resources/subscribers/subscribers.types.js';

// ── Tags ─────────────────────────────────────────────────────────────────────
export type {
  RuleTagEntity,
  RuleTagsResponse,
} from './resources/tags/tags.types.js';

// ── Automations ──────────────────────────────────────────────────────────────
export type {
  RuleAutomation,
  RuleAutomationCreateRequest,
  RuleAutomationListParams,
  RuleAutomationListResponse,
  RuleAutomationResponse,
  RuleAutomationTrigger,
  RuleAutomationUpdateRequest,
  RuleAutomail,
  RuleAutomailCreateRequest,
  RuleAutomailListParams,
  RuleAutomailListResponse,
  RuleAutomailResponse,
  RuleAutomailTrigger,
  RuleAutomailUpdateRequest,
  RuleSendoutType,
} from './resources/automations/automations.types.js';

// ── Messages ─────────────────────────────────────────────────────────────────
export type {
  RuleMessage,
  RuleMessageCreateRequest,
  RuleMessageListParams,
  RuleMessageListResponse,
  RuleMessageResponse,
} from './resources/messages/messages.types.js';

// ── Templates ────────────────────────────────────────────────────────────────
export type {
  RuleRenderTemplateParams,
  RuleTemplate,
  RuleTemplateCreateRequest,
  RuleTemplateListParams,
  RuleTemplateListResponse,
  RuleTemplateResponse,
} from './resources/templates/templates.types.js';

// ── Dynamic sets ─────────────────────────────────────────────────────────────
export type {
  RuleDynamicSet,
  RuleDynamicSetCreateRequest,
  RuleDynamicSetListParams,
  RuleDynamicSetListResponse,
  RuleDynamicSetResponse,
  RuleDynamicSetUpdateRequest,
} from './resources/dynamic-sets/dynamic-sets.types.js';

// ── Campaigns ────────────────────────────────────────────────────────────────
export type {
  RuleCampaign,
  RuleCampaignCreateRequest,
  RuleCampaignListParams,
  RuleCampaignListResponse,
  RuleCampaignRecipientSegment,
  RuleCampaignRecipientTag,
  RuleCampaignResponse,
  RuleCampaignScheduleRequest,
  RuleCampaignStatus,
  RuleCampaignUpdateRequest,
} from './resources/campaigns/campaigns.types.js';

// ── Suppressions ─────────────────────────────────────────────────────────────
export type {
  RuleSuppressionRequest,
  RuleSuppressionSubscriberIdentifier,
} from './resources/suppressions/suppressions.types.js';

// ── Brand styles ─────────────────────────────────────────────────────────────
export type {
  RuleBrandStyle,
  RuleBrandStyleColour,
  RuleBrandStyleColourType,
  RuleBrandStyleCreateRequest,
  RuleBrandStyleFont,
  RuleBrandStyleFontOrigin,
  RuleBrandStyleFontType,
  RuleBrandStyleFromDomainRequest,
  RuleBrandStyleImage,
  RuleBrandStyleImageType,
  RuleBrandStyleLink,
  RuleBrandStyleLinkType,
  RuleBrandStyleListItem,
  RuleBrandStyleListResponse,
  RuleBrandStyleManualRequest,
  RuleBrandStyleResponse,
  RuleBrandStyleUpdateRequest,
} from './resources/brand-styles/brand-styles.types.js';

// ── API keys ─────────────────────────────────────────────────────────────────
export type {
  RuleApiKey,
  RuleApiKeyCreateRequest,
  RuleApiKeyListResponse,
  RuleApiKeyResponse,
  RuleApiKeyUpdateRequest,
} from './resources/api-keys/api-keys.types.js';

// ── Exports ──────────────────────────────────────────────────────────────────
export type {
  RuleExportDateParams,
  RuleExportDispatcherParams,
  RuleExportDispatcherRecord,
  RuleExportDispatcherResponse,
  RuleExportStatisticFilterType,
  RuleExportStatisticObject,
  RuleExportStatisticObjectType,
  RuleExportStatisticRecord,
  RuleExportStatisticType,
  RuleExportStatisticsParams,
  RuleExportStatisticsResponse,
  RuleExportSubscriberParams,
  RuleExportSubscriberRecord,
  RuleExportSubscriberResponse,
} from './resources/exports/exports.types.js';

// ── Analytics ────────────────────────────────────────────────────────────────
export type {
  RuleAnalyticsDateRange,
  RuleAnalyticsFullQuery,
  RuleAnalyticsMessageType,
  RuleAnalyticsMetric,
  RuleAnalyticsObjectType,
  RuleAnalyticsParams,
  RuleAnalyticsResponse,
  RuleAnalyticsStat,
} from './resources/analytics/analytics.types.js';

// ── Recipients ───────────────────────────────────────────────────────────────
export type {
  RuleRecipientSubscriber,
  RuleRecipientSubscriberListResponse,
  RuleRecipientTagListResponse,
  RuleRecipientsListParams,
  RuleSegmentListResponse,
  RuleTagSegment,
} from './resources/recipients/recipients.types.js';

// ── Custom field data (deprecated by Rule.io) ────────────────────────────────
export type {
  CreateCustomFieldDataRequestBody,
  RuleCustomFieldDataGroupParams,
  RuleCustomFieldDataListParams,
  RuleCustomFieldDataRecord,
  RuleCustomFieldDataResponse,
  RuleCustomFieldDataSearchParams,
  RuleCustomFieldDataSingleResponse,
  RuleCustomFieldDataUpdateRequest,
  CustomFieldValue,
  CustomFieldDataEntry,
  CustomFieldGroupDataEntry,
  RuleCustomFieldValue,
} from './resources/custom-field-data/custom-field-data.types.js';

// ── Orchestration helpers (deprecated wrappers on RuleClient) ────────────────
export type {
  CreateAutomationEmailConfig,
  CreateAutomationEmailResult,
  CreateCampaignEmailConfig,
  CreateCampaignEmailResult,
} from './orchestration.types.js';
