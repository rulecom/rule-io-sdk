/**
 * Public type barrel for `@rulecom/client`.
 *
 * Every type previously declared in this file lives next to its namespace
 * client (under `resources/<namespace>/<namespace>.types.ts`); this barrel
 * re-exports them all under their original names so `import type { ... }
 * from '@rulecom/client'` keeps working unchanged for downstream consumers.
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
  PagePaginationParams,
} from './shared.types.js';

// ── Custom field schema ───────────────────────────────────────────────────────
export type {
  CreateCustomFieldEntry,
  CustomFieldDefinition,
  CustomFieldGroup,
  CustomFieldValueType,
  ListCustomFieldGroupsParams,
} from './resources/custom-field/custom-field.types.js';

// ── Client configuration ─────────────────────────────────────────────────────
export type { RuleClientConfig } from './config.js';
export type { RateLimitOptions, RetryInfo } from './core/rate-limit.js';

// ── Subscribers ──────────────────────────────────────────────────────────────
export type {
  Subscriber,
  SubscriberTag,
  SubscriberIdentifier,
  SubscriberSyncPayload,
  CustomFieldGroupData,
  CustomFieldGroupDataRecord,
  SubscriberSegment,
  CreateSubscriberPayload,
  BulkTagsPayload,
  SuppressOptions,
  TagRef,
  TagAutomationMode,
  AddSubscriberTagsOptions,
  ListSubscribersByTagIdsParams,
  ListAllSubscribersByTagIdsParams,
  ListSubscribersByTagIdsResult,
} from './resources/subscribers/subscribers.types.js';

// ── Tags ─────────────────────────────────────────────────────────────────────
export type {
  ListTagsParams,
  Tag,
  TagDetail,
  UpdateTagPayload,
} from './resources/tags/tags.types.js';

// ── Automations ──────────────────────────────────────────────────────────────
export type {
  Automation,
  AutomationSendoutType,
  AutomationTrigger,
  CreateEmailAutomationPayload,
  ListAutomationsParams,
  SetEmailAutomationPayload,
  UpdateEmailAutomationPayload,
} from './resources/automations/automations.types.js';

// ── Messages ─────────────────────────────────────────────────────────────────
export type {
  AutomailSetting,
  CreateEmailAutomationMessagePayload,
  CreateEmailCampaignMessagePayload,
  EmailAutomationMessage,
  EmailCampaignMessage,
  Message,
  MessageDispatcher,
  UpdateEmailAutomationMessagePayload,
  UpdateEmailCampaignMessagePayload,
} from './resources/messages/messages.types.js';

// ── Templates ────────────────────────────────────────────────────────────────
export type {
  CreateEmailTemplatePayload,
  EmailTemplate,
  ListTemplatesParams,
  RenderTemplateParams,
  Template,
  UpdateEmailTemplatePayload,
} from './resources/templates/templates.types.js';

// ── Dynamic sets ─────────────────────────────────────────────────────────────
export type {
  CreateDynamicSetPayload,
  DynamicSet,
  DynamicSetSender,
  DynamicSetTrigger,
  UpdateDynamicSetPayload,
} from './resources/dynamic-sets/dynamic-sets.types.js';

// ── Campaigns ────────────────────────────────────────────────────────────────
export type {
  Campaign,
  CampaignMessageType,
  CampaignRecipientSegment,
  CampaignRecipientSubscriber,
  CampaignRecipientTag,
  CampaignRecipients,
  CampaignSendoutType,
  CampaignStatus,
  CreateEmailCampaignPayload,
  ListCampaignsParams,
  ScheduleCampaignPayload,
  SetEmailCampaignPayload,
  UpdateEmailCampaignPayload,
} from './resources/campaigns/campaigns.types.js';


// ── Brand styles ─────────────────────────────────────────────────────────────
export type {
  BrandStyle,
  BrandStyleColour,
  BrandStyleColourEntry,
  BrandStyleColourType,
  BrandStyleFont,
  BrandStyleFontEntry,
  BrandStyleFontOrigin,
  BrandStyleFontType,
  BrandStyleImage,
  BrandStyleImageEntry,
  BrandStyleImageType,
  BrandStyleLink,
  BrandStyleLinkEntry,
  BrandStyleLinkType,
  BrandStyleListItem,
  CreateBrandStyleFromDomainPayload,
  CreateBrandStylePayload,
  UpdateBrandStylePayload,
} from './resources/brand-styles/brand-styles.types.js';

// ── API keys ─────────────────────────────────────────────────────────────────
export type {
  ApiKey,
  CreateApiKeyPayload,
  UpdateApiKeyPayload,
} from './resources/api-keys/api-keys.types.js';

// ── Exports ──────────────────────────────────────────────────────────────────
export type {
  ExportDateRange,
  ExportDispatchersParams,
  ExportStatisticsParams,
  ExportSubscribersParams,
  ExportStatisticFilterType,
  ExportStatisticObjectType,
  ExportStatisticObject,
  ExportStatisticType,
  ExportDispatcherRecord,
  ExportStatisticRecord,
  ExportSubscriberRecord,
  ExportStatisticsResult,
} from './resources/exports/exports.types.js';

// ── Analytics ────────────────────────────────────────────────────────────────
export type {
  AnalyticsObjectType,
  AnalyticsMetric,
  AnalyticsMessageType,
  AnalyticsDateRangeParams,
  AnalyticsQueryParams,
  AnalyticsParams,
  AnalyticsMetricValue,
  AnalyticsStat,
  AnalyticsResult,
} from './resources/analytics/analytics.types.js';

// ── Recipients ───────────────────────────────────────────────────────────────
export type {
  ListRecipientsParams,
  RecipientSegment,
  RecipientSubscriber,
  RecipientTag,
} from './resources/recipients/recipients.types.js';

// ── Custom field data ────────────────────────────────────────────────────────
export type {
  CustomFieldDataValue,
  CustomFieldValueEntry,
  CustomFieldData,
  CustomFieldDataFilters,
  CustomFieldDataByGroupFilters,
  CustomFieldDataListResult,
  CustomFieldDataResult,
  ListCustomFieldDataParams,
  ListAllCustomFieldDataParams,
  ListCustomFieldDataByGroupParams,
  ListAllCustomFieldDataByGroupParams,
  CustomFieldEntry,
  CustomFieldGroupEntry,
  WriteCustomFieldDataPayload,
  PatchCustomFieldDataPayload,
  CustomFieldValue,
  CustomFieldDataInput,
  CustomFieldDataWriteResult,
  SearchCustomFieldDataParams,
} from './resources/subscribers/subscribers.types.js';

// ── Orchestration helpers (deprecated wrappers on RuleClient) ────────────────
export type {
  CreateAutomationEmailConfig,
  CreateAutomationEmailResult,
  CreateCampaignEmailConfig,
  CreateCampaignEmailResult,
} from './orchestration.types.js';
