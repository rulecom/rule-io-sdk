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
// v3 Editor API Types - Automail
// ============================================================================

/**
 * Trigger configuration for an automail.
 * Note: The type field must be uppercase ("TAG" or "SEGMENT") despite
 * the API error messages suggesting lowercase.
 */
export interface RuleAutomailTrigger {
  type: 'TAG' | 'SEGMENT';
  id: number;
  name?: string;
}

/**
 * Sendout type for an automail.
 * - 1: Campaign (marketing emails)
 * - 2: Transactional (order confirmations, receipts, etc.)
 */
export type RuleSendoutType = 1 | 2;

/**
 * Automail represents an automation workflow in Rule.io's new editor
 */
export interface RuleAutomail {
  id?: number;
  name: string;
  description?: string;
  active?: boolean;
  trigger?: RuleAutomailTrigger | null;
  sendout_type?: {
    value: number;
    key: string;
    description: string;
  };
}

export interface RuleAutomailCreateRequest {
  name: string;
  description?: string;
}

/**
 * Request to update an automail with trigger and sendout type.
 * The trigger.type must be uppercase ("TAG" or "SEGMENT").
 */
export interface RuleAutomailUpdateRequest {
  name: string;
  active: boolean;
  trigger: RuleAutomailTrigger;
  sendout_type: RuleSendoutType;
}

export interface RuleAutomailResponse extends RuleApiResponse {
  data?: RuleAutomail;
}

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

import type { RCMLDocument } from './rcml';

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
 * Query parameters for listing automails.
 *
 * @example
 * ```typescript
 * const result = await client.listAutomails({ page: 1, per_page: 20, active: true });
 * ```
 */
export interface RuleAutomailListParams extends RulePaginationParams {
  /** Full-text search by name */
  query?: string;
  /** Filter by active status */
  active?: boolean;
  /** Filter by message type: 1 = email, 2 = text_message */
  message_type?: 1 | 2;
}

export type RuleAutomailListResponse = RuleListResponse<RuleAutomail>;

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
 * All recipient arrays are required (pass empty arrays if not used).
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
// v3 Brand Styles API Types
// ============================================================================

/**
 * Brand style colors as returned by the Rule.io API.
 * All color fields are optional since the API may return a partial set.
 */
export interface RuleBrandStyleColors {
  primary?: string;
  secondary?: string;
  tertiary?: string;
  background?: string;
  text?: string;
  link?: string;
}

/**
 * Brand style font configuration.
 */
export interface RuleBrandStyleFont {
  name?: string;
  url?: string;
  fallback?: string;
}

/**
 * A brand style entity in Rule.io.
 *
 * Brand styles define visual identity (colors, fonts, logo) for email templates.
 * Each account has a default brand style that is returned first in list responses.
 */
export interface RuleBrandStyle {
  id?: number;
  name?: string;
  domain?: string;
  logo_url?: string;
  colors?: RuleBrandStyleColors;
  fonts?: RuleBrandStyleFont[];
  is_default?: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Request body for creating a brand style from a domain URL.
 *
 * Uses the BrandFetch API to auto-detect brand colors, fonts, and logo
 * from the given URL.
 *
 * @example
 * ```typescript
 * await client.createBrandStyleFromDomain({ url: 'https://example.com' });
 * ```
 */
export interface RuleBrandStyleFromDomainRequest {
  /** The URL to extract brand information from */
  url: string;
}

/**
 * Request body for creating a brand style manually.
 *
 * Accepts base64-encoded images and custom font definitions.
 *
 * @example
 * ```typescript
 * await client.createBrandStyleManually({
 *   name: 'My Brand',
 *   colors: { primary: '#FF0000', secondary: '#00FF00' },
 * });
 * ```
 */
export interface RuleBrandStyleManualRequest {
  name?: string;
  /** Base64-encoded logo image */
  logo?: string;
  colors?: RuleBrandStyleColors;
  fonts?: RuleBrandStyleFont[];
}

/**
 * Request body for updating a brand style via PATCH.
 *
 * Only provided fields are updated; omitted fields remain unchanged.
 */
export interface RuleBrandStyleUpdateRequest {
  name?: string;
  /** Base64-encoded logo image */
  logo?: string;
  colors?: RuleBrandStyleColors;
  fonts?: RuleBrandStyleFont[];
}

/**
 * Response from single brand style endpoints (get, create, update).
 */
export interface RuleBrandStyleResponse extends RuleApiResponse {
  data?: RuleBrandStyle;
}

/**
 * Response from the list brand styles endpoint.
 *
 * The default brand style is always returned first in the list.
 */
export interface RuleBrandStyleListResponse extends RuleApiResponse {
  data?: RuleBrandStyle[];
}

// ============================================================================
// v3 Account API Types
// ============================================================================

/**
 * Account as returned by the Rule.io v3 API.
 */
export interface RuleAccount {
  id?: number;
  name?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Request body for creating an account.
 *
 * Requires Super Admin role.
 */
export interface RuleAccountCreateRequest {
  name: string;
}

/**
 * Response from account endpoints that return a single account.
 */
export interface RuleAccountResponse extends RuleApiResponse {
  data?: RuleAccount;
}

/**
 * Response from the list accounts endpoint.
 */
export interface RuleAccountListResponse extends RuleApiResponse {
  data?: RuleAccount[];
}

/**
 * Query parameters for listing accounts.
 */
export interface RuleAccountListParams {
  /** Include additional relations (e.g., 'sitoo_credentials') */
  includes?: string[];
}

// ============================================================================
// v3 API Key Management Types
// ============================================================================

/**
 * An API key entity in Rule.io.
 *
 * The `key` field (the actual secret) is only returned on creation.
 */
export interface RuleApiKey {
  id?: number;
  name?: string;
  /** The actual API key value — only returned on creation */
  key?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Request body for creating an API key.
 *
 * @example
 * ```typescript
 * await client.createApiKey({ name: 'Production Key' });
 * ```
 */
export interface RuleApiKeyCreateRequest {
  name: string;
}

/**
 * Request body for updating an API key.
 */
export interface RuleApiKeyUpdateRequest {
  name?: string;
}

/**
 * Response from single API key endpoints (create, update).
 */
export interface RuleApiKeyResponse extends RuleApiResponse {
  data?: RuleApiKey;
}

/**
 * Response from the list API keys endpoint.
 */
export interface RuleApiKeyListResponse extends RuleApiResponse {
  data?: RuleApiKey[];
}

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
  template: RCMLDocument;
}

export interface CreateAutomationEmailResult {
  automailId: number;
  messageId: number;
  templateId: number;
  dynamicSetId: number;
}
