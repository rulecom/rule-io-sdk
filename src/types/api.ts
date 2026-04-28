/**
 * Rule.io API Types
 *
 * Types for API requests and responses for both v2 and v3 APIs.
 */

// ============================================================================
// Base API Types
// ============================================================================

export interface RuleApiResponse {
  success?: boolean;
  error?: string;
  message?: string;
}

// ============================================================================
// v2 Subscriber API Types
// ============================================================================

/**
 * Subscriber fields to sync to Rule.io.
 *
 * Keys are field names (e.g., 'FirstName', 'OrderRef').
 * The client prepends the configured `fieldGroupPrefix` (default: 'Booking')
 * to create the full Rule.io field key (e.g., 'Booking.FirstName').
 */
export interface RuleSubscriberFields {
  [key: string]: string | number | undefined;
}

export interface RuleSubscriber {
  email: string;
  fields?: RuleSubscriberFields;
  tags?: string[];
}

export interface RuleSubscriberResponse extends RuleApiResponse {
  subscriber?: {
    id: string;
    email: string;
    tags?: Array<{ id: number; name: string }>;
  };
}

export interface RuleSubscriberFieldsResponse extends RuleApiResponse {
  groups?: Array<{
    name: string;
    fields: Array<{ name: string; value: string | null }>;
  }>;
}

export interface RuleSubscriberTagsResponse extends RuleApiResponse {
  tags?: Array<{ name: string }>;
}

/**
 * A subscriber record as returned by `GET /api/v2/subscribers` (list endpoint).
 * Tags are included inline, which enables client-side tag filtering without
 * N+1 calls. `tags` allows `null` or absent because the API's representation
 * for subscribers with zero tags is not strictly guaranteed across accounts —
 * observed shapes include `[]`, `null`, and the field being omitted.
 */
export interface RuleSubscriberV2 {
  id: number;
  email: string | null;
  phone_number: string | null;
  language: string;
  opted_in: boolean;
  suppressed: boolean;
  created_at: string;
  updated_at: string;
  tags?: Array<{ id: number; name: string }> | null;
}

/**
 * Raw shape of `GET /api/v2/subscribers`. `meta.next` is a URL to the next
 * page (includes `?page=N` query param) or null when exhausted.
 */
export interface RuleSubscribersV2ListResponse extends RuleApiResponse {
  subscribers?: RuleSubscriberV2[];
  meta?: { next?: string | null };
}

/**
 * Parameters for `listSubscribersByTagIds`.
 */
export interface ListSubscribersByTagIdsParams {
  /** Tag IDs the subscriber must ALL have (intersection). Must be non-empty. */
  tag_ids: number[];
  /** v2 uses `limit`, not `per_page`. Default 100, max ~1000. */
  limit?: number;
  page?: number;
}

/**
 * Result shape for `listSubscribersByTagIds`. One page at a time — caller
 * drives pagination by passing `next_page` back until it returns null.
 */
export interface ListSubscribersByTagIdsResult {
  /** Subscribers on this page that matched all required tag_ids. */
  subscribers: RuleSubscriberV2[];
  /** Count of subscribers that matched (equals `subscribers.length`). */
  matched: number;
  /** Count of subscribers scanned on this page before filtering. */
  scanned: number;
  /**
   * Page number to request next. Null when `meta.next` is absent, null,
   * malformed, or missing a `page` query parameter.
   */
  next_page: number | null;
}

// ============================================================================
// v2 Tags API Types
// ============================================================================

export interface RuleTag {
  id: number;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface RuleTagsResponse extends RuleApiResponse {
  tags?: RuleTag[];
}

// ============================================================================
// v3 Editor API Types - Automation (formerly "Automail")
// ============================================================================

/**
 * Trigger configuration for an automation.
 * Note: The type field must be uppercase ("TAG" or "SEGMENT") despite
 * the API error messages suggesting lowercase.
 */
export interface RuleAutomationTrigger {
  type: 'TAG' | 'SEGMENT';
  id: number;
  name?: string;
}

/**
 * @deprecated Use {@link RuleAutomationTrigger} instead.
 */
export interface RuleAutomailTrigger extends RuleAutomationTrigger {}

/**
 * Sendout type for an automation.
 * - 1: Campaign (marketing emails)
 * - 2: Transactional (order confirmations, receipts, etc.)
 */
export type RuleSendoutType = 1 | 2;

/**
 * Automation represents an automation workflow in Rule.io's editor.
 */
export interface RuleAutomation {
  id?: number;
  name: string;
  description?: string;
  active?: boolean;
  trigger?: RuleAutomationTrigger | null;
  sendout_type?: {
    value: number;
    key: string;
    description: string;
  };
}

/**
 * @deprecated Use {@link RuleAutomation} instead.
 */
export interface RuleAutomail extends RuleAutomation {}

export interface RuleAutomationCreateRequest {
  name: string;
  description?: string;
  trigger?: RuleAutomationTrigger;
  sendout_type?: RuleSendoutType;
}

/**
 * @deprecated Use {@link RuleAutomationCreateRequest} instead.
 */
export interface RuleAutomailCreateRequest extends RuleAutomationCreateRequest {}

/**
 * Request to update an automation with trigger and sendout type.
 * The trigger.type must be uppercase ("TAG" or "SEGMENT").
 *
 * Tip: The `updateAutomation()` method accepts `Partial<RuleAutomationUpdateRequest>`
 * so you can pass only the fields you want to change.
 */
export interface RuleAutomationUpdateRequest {
  name: string;
  active: boolean;
  trigger: RuleAutomationTrigger;
  sendout_type: RuleSendoutType;
}

/**
 * @deprecated Use {@link RuleAutomationUpdateRequest} instead.
 */
export interface RuleAutomailUpdateRequest extends RuleAutomationUpdateRequest {}

export interface RuleAutomationResponse extends RuleApiResponse {
  data?: RuleAutomation;
}

/**
 * @deprecated Use {@link RuleAutomationResponse} instead.
 */
export interface RuleAutomailResponse extends RuleAutomationResponse {}

// ============================================================================
// v3 Editor API Types - Message
// ============================================================================

/**
 * Message represents email content in Rule.io's new editor
 */
export interface RuleMessage {
  id?: number;
  name: string;
  subject: string;
  preheader?: string;
  from_name?: string;
  from_email?: string;
  reply_to?: string;
}

export interface RuleMessageCreateRequest {
  dispatcher: {
    id: number;
    type: 'automail' | 'campaign';
  };
  type: number; // 1 = email
  subject: string;
  preheader?: string;
  from_name?: string;
  from_email?: string;
  reply_to?: string;
  automail_setting?: {
    active: boolean;
    delay_in_seconds: string;
  };
}

export interface RuleMessageResponse extends RuleApiResponse {
  data?: RuleMessage;
}

// ============================================================================
// v3 Editor API Types - Template
// ============================================================================

import type { RCMLDocument, RCMLSection, RCMLLoop, RCMLSwitch } from './rcml';

/**
 * Template represents an RCML email template in Rule.io's new editor
 */
export interface RuleTemplate {
  id?: number;
  name: string;
  content: RCMLDocument;
}

export interface RuleTemplateCreateRequest {
  message_id: number;
  name: string;
  message_type: 'email' | 'sms';
  template: RCMLDocument;
}

export interface RuleTemplateResponse extends RuleApiResponse {
  data?: RuleTemplate;
}

// ============================================================================
// v3 Editor API Types - Dynamic Set
// ============================================================================

/**
 * Dynamic Set connects a message with a template
 */
export interface RuleDynamicSet {
  id?: number;
  message_id: number;
  template_id: number;
}

export interface RuleDynamicSetCreateRequest {
  message_id: number;
  template_id: number;
}

export interface RuleDynamicSetResponse extends RuleApiResponse {
  data?: RuleDynamicSet;
}

// ============================================================================
// v3 Editor API Types - List / Pagination
// ============================================================================

/**
 * Pagination parameters for v3 list endpoints.
 */
export interface RulePaginationParams {
  page?: number;
  per_page?: number;
}

/**
 * Generic list response wrapper for v3 endpoints that return arrays.
 */
export interface RuleListResponse<T> extends RuleApiResponse {
  data?: T[];
}

/**
 * Query parameters for listing automations.
 *
 * @example
 * ```typescript
 * const result = await client.listAutomations({ page: 1, per_page: 20, active: true });
 * ```
 */
export interface RuleAutomationListParams extends RulePaginationParams {
  /** Full-text search by name */
  query?: string;
  /** Filter by active status */
  active?: boolean;
  /** Filter by message type: 1 = email, 2 = text_message */
  message_type?: 1 | 2;
}

/**
 * @deprecated Use {@link RuleAutomationListParams} instead.
 */
export interface RuleAutomailListParams extends RuleAutomationListParams {}

export type RuleAutomationListResponse = RuleListResponse<RuleAutomation>;

/**
 * @deprecated Use {@link RuleAutomationListResponse} instead.
 */
export type RuleAutomailListResponse = RuleAutomationListResponse;

/**
 * Query parameters for listing messages.
 * Both fields are required — the API filters messages by their parent dispatcher.
 */
export interface RuleMessageListParams {
  /** Dispatcher ID (automail or campaign ID) */
  id: number;
  /** Dispatcher type */
  dispatcher_type: 'campaign' | 'automail';
}

export type RuleMessageListResponse = RuleListResponse<RuleMessage>;

/**
 * Query parameters for listing templates.
 */
export type RuleTemplateListParams = RulePaginationParams;

export type RuleTemplateListResponse = RuleListResponse<RuleTemplate>;

/**
 * Query parameters for listing dynamic sets.
 * The message_id is required — the API returns all dynamic sets for a given message.
 */
export interface RuleDynamicSetListParams {
  /** Message ID to filter by */
  message_id: number;
}

export type RuleDynamicSetListResponse = RuleListResponse<RuleDynamicSet>;

/**
 * Request body for updating a dynamic set.
 *
 * Note: If a duplicate active dynamic set with the same trigger already exists,
 * the updated one may be automatically deactivated by the API.
 */
export interface RuleDynamicSetUpdateRequest {
  message_id: number;
  template_id?: number;
  name?: string;
  subject?: string;
  pre_header?: string;
  utm_campaign?: string;
  utm_term?: string;
  active?: boolean;
  sender?: {
    email?: string | null;
    phone_number?: string | null;
    name?: string | null;
  };
  trigger?: {
    type: 'TAG' | 'SEGMENT';
    id: number;
  } | null;
}

/**
 * Query parameters for rendering a template.
 */
export interface RuleRenderTemplateParams {
  /** If provided, merge tags are substituted with the subscriber's field values */
  subscriber_id?: number;
}

// ============================================================================
// v3 Custom Field Data API Types (Deprecated)
// ============================================================================

/**
 * Value types supported by custom field data.
 *
 * @deprecated Custom Field Data API is deprecated by Rule.io.
 */
export type RuleCustomFieldDataValue =
  | string
  | string[]
  | Record<string, unknown>
  | Record<string, unknown>[];

/**
 * A single custom field value within a custom field data record.
 *
 * @deprecated Custom Field Data API is deprecated by Rule.io.
 */
export interface RuleCustomFieldValue {
  field_id: number;
  field_name: string;
  field_type: 'text' | 'datetime' | 'date' | 'time' | 'multiple' | 'json';
  field_value: RuleCustomFieldDataValue;
}

/**
 * A custom field data record representing a group of field values for a subscriber.
 *
 * @deprecated Custom Field Data API is deprecated by Rule.io.
 */
export interface RuleCustomFieldDataRecord {
  id: number;
  group_id?: number;
  group_name?: string;
  historical?: boolean;
  created_at?: string;
  values: RuleCustomFieldValue[];
}

/**
 * Response for custom field data list endpoints.
 *
 * @deprecated Custom Field Data API is deprecated by Rule.io.
 */
export interface RuleCustomFieldDataResponse extends RuleApiResponse {
  data?: RuleCustomFieldDataRecord[];
  meta?: { page: number; per_page: number };
}

/**
 * Response for custom field data single-record endpoints.
 *
 * @deprecated Custom Field Data API is deprecated by Rule.io.
 */
export interface RuleCustomFieldDataSingleResponse extends RuleApiResponse {
  data?: RuleCustomFieldDataRecord;
}

/**
 * Query parameters for listing custom field data.
 *
 * @deprecated Custom Field Data API is deprecated by Rule.io.
 */
export interface RuleCustomFieldDataListParams {
  page?: number;
  per_page?: number;
  groups_id?: number[];
  groups_name?: string[];
}

/**
 * Query parameters for retrieving custom field data by group.
 *
 * @deprecated Custom Field Data API is deprecated by Rule.io.
 */
export interface RuleCustomFieldDataGroupParams {
  page?: number;
  per_page?: number;
  fields?: string[];
}

/**
 * Request body for creating custom field data for a subscriber.
 *
 * @deprecated Custom Field Data API is deprecated by Rule.io.
 */
export interface RuleCustomFieldDataCreateRequest {
  groups: Array<{
    group: number | string;
    create_if_not_exists?: boolean;
    historical?: boolean;
    values: Array<{
      field: number | string;
      create_if_not_exists?: boolean;
      value: RuleCustomFieldDataValue;
    }>;
  }>;
}

/**
 * Request body for updating custom field data for a subscriber.
 *
 * @deprecated Custom Field Data API is deprecated by Rule.io.
 */
export interface RuleCustomFieldDataUpdateRequest {
  identifier: {
    data_id?: number;
    group?: number | string;
    field?: number | string;
    value?: string;
  };
  values: Array<{
    field: number | string;
    create_if_not_exists?: boolean;
    value: RuleCustomFieldDataValue;
  }>;
}

/**
 * Query parameters for searching custom field data.
 *
 * @deprecated Custom Field Data API is deprecated by Rule.io.
 */
export interface RuleCustomFieldDataSearchParams {
  data_id?: number;
  group?: number | string;
  field?: number | string;
  value?: string;
}

// ============================================================================
// v3 Editor API Types - Campaign
// ============================================================================

/**
 * Status/type descriptor returned by the API for campaign fields.
 */
export interface RuleCampaignStatus {
  value: number;
  key: string;
  description: string;
}

/**
 * A tag used as a campaign recipient filter.
 */
export interface RuleCampaignRecipientTag {
  id: number;
  name?: string;
  negative: boolean;
}

/**
 * A segment used as a campaign recipient filter.
 */
export interface RuleCampaignRecipientSegment {
  id: number;
  name?: string;
  negative: boolean;
}

/**
 * Campaign represents a one-off email send in Rule.io's new editor.
 */
export interface RuleCampaign {
  id?: number;
  name: string;
  status?: RuleCampaignStatus;
  message_type?: RuleCampaignStatus;
  sendout_type?: RuleCampaignStatus;
  number_of_recipients?: number | null;
  total_sent?: number | null;
  recipients?: {
    tags?: RuleCampaignRecipientTag[];
    segments?: RuleCampaignRecipientSegment[];
    subscribers?: Array<{ id: number; email?: string; phone_number?: string }>;
  };
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// v3 Subscriber API Types
// ============================================================================

/**
 * Subscriber as returned by the v3 API.
 *
 * Note: The API returns `phone` in responses but accepts `phone_number` in requests.
 * This matches the Rule.io API naming convention.
 */
export interface RuleSubscriberV3 {
  id: number;
  email?: string | null;
  phone?: string | null;
  custom_identifier?: string | null;
  status?: string;
  language?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Request body for creating a campaign.
 *
 * @example
 * ```typescript
 * await client.createCampaign({
 *   message_type: 1, // email
 *   sendout_type: 1, // marketing
 *   tags: [{ id: 42, negative: false }],
 * });
 * ```
 */
export interface RuleCampaignCreateRequest {
  name?: string;
  /** 1 = email, 2 = text_message */
  message_type: 1 | 2;
  /** 1 = marketing, 2 = transactional */
  sendout_type?: RuleSendoutType;
  tags?: RuleCampaignRecipientTag[];
  segments?: RuleCampaignRecipientSegment[];
  subscribers?: number[];
}

/**
 * Request body for updating a campaign.
 *
 * Tip: The `updateCampaign()` method accepts `Partial<RuleCampaignUpdateRequest>`
 * so you can pass only the fields you want to change.
 */
export interface RuleCampaignUpdateRequest {
  name: string;
  /** 1 = marketing, 2 = transactional */
  sendout_type: RuleSendoutType;
  tags: RuleCampaignRecipientTag[];
  segments: RuleCampaignRecipientSegment[];
  subscribers: number[];
}

export interface RuleCampaignResponse extends RuleApiResponse {
  data?: RuleCampaign;
}

/**
 * Query parameters for listing campaigns.
 *
 * @example
 * ```typescript
 * const campaigns = await client.listCampaigns({ page: 1, per_page: 20, message_type: 1 });
 * ```
 */
export interface RuleCampaignListParams extends RulePaginationParams {
  /** Filter by message type: 1 = email, 2 = text_message */
  message_type?: 1 | 2;
}

export type RuleCampaignListResponse = RuleListResponse<RuleCampaign>;

/**
 * Schedule request for a campaign.
 *
 * Valid combinations:
 * - `{ type: 'now' }` — send immediately
 * - `{ type: 'schedule', datetime: '2024-01-01 00:00:00' }` — schedule for later
 * - `{ type: null }` — cancel a scheduled send (moves back to draft)
 *
 * Note: The flat interface is intentional. A discriminated union would overcomplicate
 * consumer usage for little benefit, since the Rule.io API itself validates the
 * combinations and returns clear error messages for invalid requests.
 */
export interface RuleCampaignScheduleRequest {
  type?: 'now' | 'schedule' | null;
  datetime?: string;
}

// ============================================================================
// v3 Suppressions API Types
// ============================================================================

/**
 * Identifier for a subscriber in bulk suppression operations.
 *
 * At least one identifier must be provided. The API resolves the subscriber
 * using whichever identifier is supplied.
 *
 * **Note:** All properties are marked optional for ergonomic use, but the
 * Rule.io API requires at least one identifier (email, phone_number, id, or
 * custom_identifier) per subscriber. Requests with empty identifier objects
 * will be rejected server-side.
 */
export interface RuleSuppressionSubscriberIdentifier {
  /** Subscriber email address */
  email?: string;
  /** Subscriber phone number */
  phone_number?: string;
  /** Subscriber numeric ID in Rule.io */
  id?: number;
  /** Custom identifier for the subscriber */
  custom_identifier?: string;
}

/**
 * Request body for creating or deleting suppressions.
 *
 * Subscribers are identified by one of: email, phone_number, id, or custom_identifier.
 * A maximum of 1000 subscribers can be included per request.
 */
export interface RuleSuppressionRequest {
  /** Subscribers to suppress or unsuppress (max 1000 per request) */
  subscribers: RuleSuppressionSubscriberIdentifier[];
  /** If omitted, all marketing channels are suppressed/unsuppressed */
  message_types?: ('email' | 'text_message')[];
  /** URL called via GET when async processing completes */
  callback_url?: string;
}

/**
 * Request body for creating a subscriber via the v3 API.
 */
export interface RuleSubscriberV3CreateRequest {
  email?: string;
  phone_number?: string;
  custom_identifier?: string;
  status?: 'ACTIVE' | 'BLOCKED' | 'PENDING';
  language?: string;
}

/**
 * Response from the v3 subscriber create endpoint.
 *
 * Note: The API returns subscriber fields directly at the top level,
 * not nested inside a `data` property.
 *
 * Note: The API returns `phone` in responses but accepts `phone_number` in requests.
 * This matches the Rule.io API naming convention.
 */
export interface RuleSubscriberV3Response extends RuleApiResponse {
  id?: number;
  email?: string | null;
  phone?: string | null;
  status?: string;
  language?: string;
}

/**
 * Identifier for a subscriber in bulk v3 operations.
 *
 * Exactly one identifier field must be provided. The API validates this
 * server-side and rejects requests with zero or multiple identifiers.
 * All fields are typed as optional to keep the interface ergonomic for
 * consumers who build the object dynamically.
 */
export interface RuleBulkSubscriberIdentifier {
  email?: string;
  phone_number?: string;
  id?: number;
  custom_identifier?: string;
}

/**
 * Request body for bulk tag operations (add/remove tags for multiple subscribers).
 */
export interface RuleBulkTagsRequest {
  subscribers: RuleBulkSubscriberIdentifier[];
  tags: (string | number)[];
}

/**
 * Request body for adding tags to a single subscriber via the v3 API.
 */
export interface RuleSubscriberTagsV3Request {
  tags: (string | number)[];
  automation?: 'send' | 'force' | 'reset' | null;
  sync_subscriber?: boolean;
}

// ============================================================================
// v3 Export API Types
// ============================================================================

/**
 * Date range parameters for export endpoints.
 * Both fields are required ISO 8601 date strings.
 */
export interface RuleExportDateParams {
  date_from: string;
  date_to: string;
}

/**
 * Parameters for the dispatcher export endpoint.
 *
 * Note: The API enforces a maximum 1-day range between date_from and date_to.
 */
export type RuleExportDispatcherParams = RuleExportDateParams;

/**
 * Filter types for the statistics export `statistic_types` query parameter.
 *
 * Note: This differs from `RuleExportStatisticType` (response) intentionally.
 * The API accepts different values for filtering vs what it returns.
 * Filter includes 'browser'/'received'; response includes 'sent'.
 */
export type RuleExportStatisticFilterType =
  | 'open'
  | 'link'
  | 'browser'
  | 'received'
  | 'unsubscribed'
  | 'soft_bounce'
  | 'hard_bounce'
  | 'spam'
  | 'resubscribe';

/**
 * Parameters for the statistics export endpoint.
 *
 * Supports token-based pagination via `next_page_token`. Pass the token from
 * the previous response to fetch the next page of results.
 */
export interface RuleExportStatisticsParams extends RuleExportDateParams {
  /** Filter by statistic types */
  statistic_types?: RuleExportStatisticFilterType[];
  /** Pagination token from the previous response */
  next_page_token?: string;
  /**
   * Automatically decode base64-encoded `object.name` for records where
   * `object.type === 'message'`. Rule.io currently returns these names
   * base64-encoded while every other object type returns plain text.
   *
   * Default: `true`. A round-trip guard passes through values that do not
   * cleanly re-encode as canonical base64, but it cannot distinguish between
   * intentionally base64-encoded names and plain-text names that also happen
   * to be valid base64.
   *
   * Set to `false` to preserve raw API values exactly, including message
   * names that look like base64 (for example when debugging or if upstream
   * behavior changes).
   */
  decodeNames?: boolean;
}

/**
 * Parameters for the subscriber export endpoint.
 */
export type RuleExportSubscriberParams = RuleExportDateParams;

/**
 * A single dispatcher record from the export API.
 */
export interface RuleExportDispatcherRecord {
  created_at: string | null;
  updated_at: string | null;
  account_id: number;
  account_name: string;
  dispatcher_id: number;
  dispatcher_name: string;
  dispatcher_type: string;
  channel: string;
  tags?: string | null;
  filters: string;
  utm_campaign: string;
  utm_term: string;
  utm_content?: string | null;
  journey_id: string;
  journey_name: string;
  variable_set_ids: string;
}

/**
 * Statistic type values returned in export statistic records.
 *
 * Note: This differs from `RuleExportStatisticFilterType` (query parameter) intentionally.
 * The API returns different values than it accepts for filtering.
 * Response includes 'sent'; filter includes 'browser'/'received'.
 */
export type RuleExportStatisticType =
  | 'open'
  | 'sent'
  | 'spam'
  | 'soft_bounce'
  | 'hard_bounce'
  | 'link'
  | 'unsubscribed'
  | 'resubscribe';

/**
 * Object types that can appear in export statistic records.
 */
export type RuleExportStatisticObjectType =
  | 'campaign'
  | 'transaction'
  | 'automation'
  | 'journey'
  | 'lane'
  | 'content_set'
  | 'variable_set'
  | 'message'
  | 'link'
  | 'subscriber';

/**
 * A related object referenced from an export statistic record.
 */
export interface RuleExportStatisticObject {
  id: string;
  name: string;
  type: RuleExportStatisticObjectType;
}

/**
 * A single statistic record from the export API.
 */
export interface RuleExportStatisticRecord {
  statistic_id: string;
  statistic_type: RuleExportStatisticType;
  event_id: string;
  subscriber_id: string;
  message_type: string;
  created_at: string;
  object: RuleExportStatisticObject;
}

/**
 * A single subscriber record from the export API.
 */
export interface RuleExportSubscriberRecord {
  created_at: string;
  updated_at: string;
  account_id: number;
  account_name: string;
  subscriber_id: number;
  email: string;
  phone_number: string;
  opt_in_date: string;
}

/**
 * Response from the dispatcher export endpoint.
 */
export interface RuleExportDispatcherResponse extends RuleApiResponse {
  data?: RuleExportDispatcherRecord[];
}

/**
 * Response from the statistics export endpoint.
 *
 * Includes an optional `next_page_token` for retrieving subsequent pages.
 */
export interface RuleExportStatisticsResponse extends RuleApiResponse {
  data?: RuleExportStatisticRecord[];
  /** Token to pass as a parameter to fetch the next page of results */
  next_page_token?: string | null;
}

/**
 * Response from the subscriber export endpoint.
 */
export interface RuleExportSubscriberResponse extends RuleApiResponse {
  data?: RuleExportSubscriberRecord[];
}

// ============================================================================
// v3 Analytics API Types
// ============================================================================

/**
 * Object type for analytics queries.
 */
export type RuleAnalyticsObjectType =
  | 'AB_TEST'
  | 'CAMPAIGN'
  | 'AUTOMAIL'
  | 'TRANSACTIONAL_NAME'
  | 'JOURNEY';

/**
 * Available metrics for analytics queries.
 */
export type RuleAnalyticsMetric =
  | 'open'
  | 'open_uniq'
  | 'sent'
  | 'delivered'
  | 'click'
  | 'click_uniq'
  | 'total_bounce'
  | 'soft_bounce'
  | 'hard_bounce'
  | 'unsubscribe'
  | 'spam';

/**
 * Message type filter for analytics queries.
 */
export type RuleAnalyticsMessageType = 'email' | 'text_message';

/**
 * Base date range shared by all analytics queries.
 * All date strings must be in `YYYY-MM-DD` format.
 */
export interface RuleAnalyticsDateRange {
  /** Start date (inclusive), e.g. "2024-01-01" */
  date_from: string;
  /** End date (inclusive), e.g. "2024-01-31" */
  date_to: string;
  /** Optional filter by message type */
  message_type?: RuleAnalyticsMessageType;
}

/**
 * Full analytics query with object type, IDs, and metrics.
 * `object_ids` are strings (not numbers), matching the OpenAPI spec.
 */
export interface RuleAnalyticsFullQuery extends RuleAnalyticsDateRange {
  /** The type of object to query analytics for */
  object_type: RuleAnalyticsObjectType;
  /** IDs of the objects to query (string array, not numbers) */
  object_ids: string[];
  /** Metrics to retrieve (at least one required) */
  metrics: RuleAnalyticsMetric[];
}

/**
 * Query parameters for the analytics endpoint.
 *
 * Either provide just a date range, or a full query with object_type,
 * object_ids, and metrics together.
 */
export type RuleAnalyticsParams = RuleAnalyticsDateRange | RuleAnalyticsFullQuery;

/**
 * A single object's analytics statistics.
 */
export interface RuleAnalyticsStat {
  /** The object ID */
  id: string | number;
  /** Metric values for this object */
  metrics: Array<{
    metric: RuleAnalyticsMetric;
    value: number;
  }>;
}

/**
 * Response from the analytics endpoint.
 */
export interface RuleAnalyticsResponse extends RuleApiResponse {
  data?: RuleAnalyticsStat[];
}

// ============================================================================
// v3 Editor API Types - Recipients
// ============================================================================

/**
 * A tag or segment as returned by the recipients endpoints.
 */
export interface RuleTagSegment {
  id: number;
  name: string;
  has_next_item?: boolean;
}

/**
 * A subscriber as returned by the recipients endpoint.
 *
 * This is intentionally separate from {@link RuleSubscriberV3} despite field overlap.
 * The recipients endpoint includes `has_next_item` (pagination cursor hint) and
 * `account_id`, which are absent from the standard v3 subscriber response.
 */
export interface RuleRecipientSubscriber {
  id: number;
  email?: string | null;
  phone?: string | null;
  has_next_item?: boolean;
  custom_identifier?: string | null;
  account_id?: number;
  created_at?: string;
  updated_at?: string;
  status?: string;
  language?: string;
}

/**
 * Pagination query parameters for the recipients list endpoints.
 */
export type RuleRecipientsListParams = RulePaginationParams;

/**
 * Response from the segments recipients endpoint.
 */
export type RuleSegmentListResponse = RuleListResponse<RuleTagSegment>;

/**
 * Response from the subscribers recipients endpoint.
 */
export type RuleRecipientSubscriberListResponse = RuleListResponse<RuleRecipientSubscriber>;

/**
 * Response from the tags recipients endpoint.
 */
export type RuleRecipientTagListResponse = RuleListResponse<RuleTagSegment>;

// ============================================================================
// v3 Account API Types
// ============================================================================

/**
 * Sitoo integration credentials linked to an account.
 */
export interface RuleSitooCredential {
  account_id: number;
  api_id: string;
  /** Sitoo password. Sensitive: avoid logging or storing in plaintext. */
  password: string;
  created_at?: string | null;
  updated_at?: string | null;
}

/**
 * Full account representation, including optional nested sub-accounts
 * and Sitoo credentials. Returned by `getAccount()`.
 */
export interface RuleAccount {
  id: number;
  name: string;
  created_at?: string | null;
  updated_at?: string | null;
  sitoo_credentials?: RuleSitooCredential[];
  sub_accounts?: RuleAccount[];
}

/**
 * Simplified account representation without nested relations.
 * Returned by `listAccounts()` and `createAccount()`.
 */
export interface RuleAccountSimple {
  id: number;
  name: string;
  created_at?: string | null;
  updated_at?: string | null;
}

/**
 * Request body for creating an account.
 *
 * Both fields are required by the API.
 */
export interface RuleAccountCreateRequest {
  /** Account name (max 255 characters) */
  name: string;
  /** ISO 639-1 language code (max 2 characters, e.g. "en", "sv") */
  language: string;
}

/**
 * Query parameters for `getAccount()`.
 */
export interface RuleAccountGetParams {
  /** Optional relations to include in the response */
  includes?: ('sitoo_credentials')[];
}

/**
 * Response wrapper for a single account.
 */
export interface RuleAccountResponse extends RuleApiResponse {
  data?: RuleAccount;
}

/**
 * Response wrapper for creating an account.
 */
export interface RuleAccountCreateResponse extends RuleApiResponse {
  data?: RuleAccountSimple;
}

/**
 * Response wrapper for listing accounts.
 */
export type RuleAccountListResponse = RuleListResponse<RuleAccountSimple>;

// ============================================================================
// v3 Brand Styles API Types
// ============================================================================

/**
 * Colour type for a brand style.
 */
export type RuleBrandStyleColourType = 'accent' | 'dark' | 'light' | 'brand' | 'side';

/**
 * A colour entry within a brand style.
 */
export interface RuleBrandStyleColour {
  id: number;
  brand_style_id: number;
  type: RuleBrandStyleColourType;
  hex: string;
  brightness: number;
  created_at: string;
  updated_at: string;
}

/**
 * Link type for a brand style.
 */
export type RuleBrandStyleLinkType =
  | 'instagram'
  | 'facebook'
  | 'twitter'
  | 'github'
  | 'youtube'
  | 'linkedin'
  | 'crunchbase'
  | 'website'
  | 'pinterest'
  | 'tiktok';

/**
 * A social/web link within a brand style.
 */
export interface RuleBrandStyleLink {
  id: number;
  brand_style_id: number;
  type: RuleBrandStyleLinkType;
  link: string;
  created_at: string;
  updated_at: string;
}

/**
 * Font type for a brand style.
 */
export type RuleBrandStyleFontType = 'title' | 'body';

/**
 * Font origin for a brand style.
 */
export type RuleBrandStyleFontOrigin = 'google' | 'system' | 'custom';

/**
 * A font entry within a brand style.
 */
export interface RuleBrandStyleFont {
  id: number;
  brand_style_id: number;
  type: RuleBrandStyleFontType;
  origin?: RuleBrandStyleFontOrigin | null;
  origin_id?: string | null;
  origin_name?: string | null;
  url?: string | null;
  weights?: string[] | null;
  name: string;
  created_at: string;
  updated_at: string;
}

/**
 * Image type for a brand style.
 */
export type RuleBrandStyleImageType = 'logo' | 'icon' | 'symbol' | 'banner';

/**
 * An image entry within a brand style.
 */
export interface RuleBrandStyleImage {
  id: number;
  brand_style_id: number;
  type?: RuleBrandStyleImageType | null;
  public_path?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Full brand style detail as returned by GET /brand-styles/{id}.
 */
export interface RuleBrandStyle {
  id: number;
  account_id: number;
  name: string;
  description?: string | null;
  domain?: string | null;
  is_default: boolean;
  links?: RuleBrandStyleLink[] | null;
  colours?: RuleBrandStyleColour[] | null;
  fonts?: RuleBrandStyleFont[] | null;
  images?: RuleBrandStyleImage[] | null;
  is_fetchable?: boolean | null;
  created_at: string;
  updated_at: string;
}

/**
 * Simplified brand style item as returned by GET /brand-styles (list endpoint).
 */
export interface RuleBrandStyleListItem {
  id: number;
  name: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Request body for creating a brand style from a domain.
 */
export interface RuleBrandStyleFromDomainRequest {
  domain: string;
}

/**
 * Request body for creating a brand style manually (POST). `name` is required.
 */
export interface RuleBrandStyleCreateRequest {
  name: string;
  description?: string | null;
  domain?: string | null;
  is_default?: boolean | null;
  colours?: Array<{ type: RuleBrandStyleColourType; hex: string; brightness: number }> | null;
  links?: Array<{ type: RuleBrandStyleLinkType; link: string }> | null;
  fonts?: Array<{
    type: RuleBrandStyleFontType;
    name: string;
    origin: RuleBrandStyleFontOrigin;
    origin_id?: string | null;
    weights?: string[] | null;
    font?: { name?: string; file: string };
  }> | null;
  images?: Array<{
    type: RuleBrandStyleImageType;
    image?: { name?: string; file: string };
  }> | null;
}

/**
 * Request body for updating a brand style (PATCH). All fields are optional.
 */
export interface RuleBrandStyleUpdateRequest {
  name?: string;
  description?: string | null;
  domain?: string | null;
  is_default?: boolean | null;
  colours?: Array<{ type: RuleBrandStyleColourType; hex: string; brightness: number }> | null;
  links?: Array<{ type: RuleBrandStyleLinkType; link: string }> | null;
  fonts?: Array<{
    type: RuleBrandStyleFontType;
    name: string;
    origin: RuleBrandStyleFontOrigin;
    origin_id?: string | null;
    weights?: string[] | null;
    font?: { name?: string; file: string };
  }> | null;
  images?: Array<{
    type: RuleBrandStyleImageType;
    image?: { name?: string; file: string };
  }> | null;
}

/**
 * @deprecated Use {@link RuleBrandStyleCreateRequest} or {@link RuleBrandStyleUpdateRequest} instead.
 */
export type RuleBrandStyleManualRequest = RuleBrandStyleUpdateRequest;

/**
 * Response for a single brand style (detail).
 */
export interface RuleBrandStyleResponse extends RuleApiResponse {
  data?: RuleBrandStyle;
}

/**
 * Response for listing brand styles.
 */
export type RuleBrandStyleListResponse = RuleListResponse<RuleBrandStyleListItem>;

// ============================================================================
// v3 API Keys API Types
// ============================================================================

/**
 * An API key as returned by the Rule.io API.
 */
export interface RuleApiKey {
  id?: number;
  name?: string | null;
  key?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Request body for creating an API key.
 */
export interface RuleApiKeyCreateRequest {
  /** Name for the API key (max 255 characters) */
  name: string;
}

/**
 * Request body for updating an API key.
 */
export interface RuleApiKeyUpdateRequest {
  /** New name for the API key (max 255 characters) */
  name: string;
}

/**
 * Response for a single API key.
 */
export interface RuleApiKeyResponse extends RuleApiResponse {
  data?: RuleApiKey;
}

/**
 * Response for listing API keys.
 */
export type RuleApiKeyListResponse = RuleListResponse<RuleApiKey>;

// ============================================================================
// Client Configuration
// ============================================================================

export interface RuleClientConfig {
  apiKey: string;
  /** Base URL for v2 API (default: https://app.rule.io/api/v2) */
  baseUrlV2?: string;
  /** Base URL for v3 API (default: https://app.rule.io/api/v3) */
  baseUrlV3?: string;
  /** Custom fetch implementation for testing */
  fetch?: typeof fetch;
  /** Enable debug logging */
  debug?: boolean;
  /**
   * Group prefix for subscriber custom fields (default: 'Booking').
   * Fields are sent as `{prefix}.{fieldName}` (e.g., 'Booking.FirstName').
   */
  fieldGroupPrefix?: string;
}

export interface CreateAutomationEmailConfig {
  name: string;
  description?: string;
  triggerType: 'tag' | 'segment' | 'event';
  triggerValue: string;
  subject: string;
  preheader?: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  delayInSeconds?: string;
  /**
   * Sendout type for the automation.
   * - 1: Campaign (marketing emails)
   * - 2: Transactional (order confirmations, receipts, etc.) - DEFAULT
   */
  sendoutType?: RuleSendoutType;
  /**
   * Full RCML template document. Provide this OR `brandStyleId`, not both.
   */
  template?: RCMLDocument;
  /**
   * Rule.io brand style ID. When provided (without `template`), the SDK
   * auto-fetches the brand style and builds editor-compatible RCML.
   */
  brandStyleId?: number;
  /**
   * RCML body children to include when using `brandStyleId`. Supports
   * sections, loops, and switch blocks. If omitted or empty, a default
   * placeholder content section is added automatically.
   */
  sections?: (RCMLSection | RCMLLoop | RCMLSwitch)[];
}

export interface CreateAutomationEmailResult {
  /** The automation (automail) ID. */
  automationId: number;
  /**
   * @deprecated Use {@link automationId} instead.
   */
  automailId: number;
  messageId: number;
  templateId: number;
  dynamicSetId: number;
}

/**
 * Configuration for creating a complete campaign email in one call.
 *
 * @example
 * ```typescript
 * const result = await client.createCampaignEmail({
 *   name: 'April Newsletter',
 *   subject: 'What\'s new this month',
 *   sendoutType: 1,
 *   brandStyleId: 976,
 *   tags: [{ id: 42, negative: false }],
 * });
 * ```
 */
export interface CreateCampaignEmailConfig {
  name: string;
  subject: string;
  preheader?: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  /** 1: Marketing (default), 2: Transactional */
  sendoutType?: RuleSendoutType;
  tags?: RuleCampaignRecipientTag[];
  segments?: RuleCampaignRecipientSegment[];
  subscribers?: number[];
  /** Full RCML template. Provide this OR `brandStyleId`, not both. */
  template?: RCMLDocument;
  /** Brand style ID to auto-build editor-compatible RCML. */
  brandStyleId?: number;
  /** RCML body sections when using `brandStyleId`. Defaults to placeholder content when omitted or empty. */
  sections?: (RCMLSection | RCMLLoop | RCMLSwitch)[];
}

export interface CreateCampaignEmailResult {
  campaignId: number;
  messageId: number;
  templateId: number;
  dynamicSetId: number;
}
