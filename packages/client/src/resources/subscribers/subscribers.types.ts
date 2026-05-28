/**
 * Subscriber types for the `@rulecom/client` subscribers namespace.
 */

import type { RuleApiResponse, PagePaginationParams } from '../../shared.types.js';

// ── Public SDK types ──────────────────────────────────────────────────────────

// ── Subscriber entities and identifiers ──────────────────────────────────────

/**
 * A tag attached to a subscriber, as returned by `getTags()` and embedded
 * inside `Subscriber`.
 */
export interface SubscriberTag {
  id: number;
  name: string;
}

/**
 * Unified subscriber entity returned by all lookup and create methods.
 *
 * The `phone` field is canonical — the raw Rule.io API uses `phone` in v3
 * responses and `phone_number` in v2 responses. The SDK always normalises to
 * `phone` so consumers never need to track which API version was called.
 */
export interface Subscriber {
  id: number;
  email: string | null;
  /** Canonical phone field — normalised from `phone` (v3) or `phone_number` (v2). */
  phone: string | null;
  customIdentifier: string | null;
  status?: string;
  language?: string;
  optedIn?: boolean;
  suppressed?: boolean;
  tags?: SubscriberTag[];
  syncAtSegments?: SubscriberSegment[];
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Discriminated union for subscriber identification in bulk operations.
 *
 * Exactly one field must be present — the constraint is enforced at the type
 * level so the API cannot receive zero or two identifiers.
 *
 * @example
 * ```typescript
 * const identifiers: SubscriberIdentifier[] = [
 *   { email: 'alice@example.com' },
 *   { id: 42 },
 * ];
 * ```
 */
export type SubscriberIdentifier =
  | { email: string }
  | { phoneNumber: string }
  | { id: number }
  | { customIdentifier: string };

export interface SubscriberSegment {
  id: number;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  syncAt?: string;
}

/** Params for `listSubscribersByTagIds`. */
export interface ListSubscribersByTagIdsParams {
  /** Tag IDs the subscriber must ALL have (intersection). Must be non-empty. */
  tagIds: number[];
  pagination?: PagePaginationParams;
}

/** Params for `listAllSubscribersByTagIds`. */
export interface ListAllSubscribersByTagIdsParams extends ListSubscribersByTagIdsParams {
  /** Maximum number of subscribers to collect before stopping. Prevents unbounded memory usage. */
  maxItems?: number;
}

/** Result shape for `listSubscribersByTagIds`. One page at a time — caller
 * drives pagination by passing `nextPage` back until it returns null. */
export interface ListSubscribersByTagIdsResult {
  /** Subscribers on this page that matched all required tagIds. */
  subscribers: Subscriber[];
  /** Count of subscribers that matched (equals `subscribers.length`). */
  matched: number;
  /** Count of subscribers scanned on this page before filtering. */
  scanned: number;
  /** Page number to request next. Null when exhausted. */
  nextPage: number | null;
}

// ── Subscriber request bodies ─────────────────────────────────────────────────

export interface SubscriberSyncPayload {
  subscriber: CreateSubscriberPayload;
  /** Regular custom field groups — existing values are overwritten on each sync. */
  customFieldData?: CustomFieldGroupDataRecord;
  /** Historical custom field groups — a new entry is appended on each sync, preserving history. */
  historicalCustomFieldData?: CustomFieldGroupDataRecord;
  tags?: string[];
}

/** Payload for creating a subscriber. */
export interface CreateSubscriberPayload {
  email?: string | null;
  phoneNumber?: string | null;
  customIdentifier?: string;
  status?: 'ACTIVE' | 'BLOCKED' | 'PENDING';
  language?: string;
}

/** Tag reference for `addSubscriberTags` — a tag name (string) or numeric ID. */
export type TagRef = string | number;

/** Controls tag automation behaviour in `addSubscriberTags`. */
export type TagAutomationMode = 'trigger' | 'force' | 'reset';

/**
 * Options for `addSubscriberTags`.
 *
 * `automation` and `syncSegments` are independent controls:
 *
 * | `automation` | `syncSegments` | Tag automations | Segment sync |
 * |---|---|---|---|
 * | omitted | omitted / `true` | None | Refreshed in background |
 * | omitted | `false` | None | Skipped |
 * | `'trigger'` | omitted / `true` | Fire once if not yet triggered | Refreshed in background |
 * | `'trigger'` | `false` | Fire once if not yet triggered | Skipped |
 *
 * `'force'` and `'reset'` control both automations and segments regardless of `syncSegments`.
 */
export interface AddSubscriberTagsOptions {
  /**
   * Controls tag automations after the tags are added.
   *
   * - `'trigger'` — fire if not yet triggered for this subscriber
   * - `'force'`   — re-fire unconditionally; subscriber removed from tag-related segments
   * - `'reset'`   — clear previous automation history for these tags, then re-fire fresh
   *
   * When omitted, no tag automations fire.
   *
   * Note: providing any value automatically unblocks a blocked subscriber.
   */
  automation?: TagAutomationMode;

  /**
   * When `true` (API default), schedules a background job that recalculates which
   * tag-based segments this subscriber belongs to after the tag change.
   *
   * Set to `false` to skip the sync and leave segment membership stale.
   *
   * Has no effect when `automation` is `'force'` or `'reset'`.
   */
  syncSegments?: boolean;
}

/** Payload for bulk tag operations (add/remove tags for multiple subscribers). */
export interface BulkTagsPayload {
  subscribers: SubscriberIdentifier[];
  tags: (string | number)[];
}

// ── Custom field data ─────────────────────────────────────────────────────────

/** Raw value that can be stored in a custom field. */
export type CustomFieldDataValue =
  | string
  | string[]
  | Record<string, unknown>
  | Record<string, unknown>[];

/** One field's value entry in a custom field data API response. */
export interface CustomFieldValueEntry {
  fieldId: number;
  fieldName: string;
  fieldType: 'text' | 'datetime' | 'date' | 'time' | 'multiple' | 'json';
  fieldValue: CustomFieldDataValue;
}

/** One group of custom field data for a subscriber, as returned by the API. */
export interface CustomFieldData {
  id: number;
  groupId?: number;
  groupName?: string;
  historical?: boolean;
  createdAt?: string;
  values: CustomFieldValueEntry[];
}

/** Result from custom field data list endpoints. */
export interface CustomFieldDataListResult extends RuleApiResponse {
  data: CustomFieldData[];
  meta?: { page: number; pageSize: number };
}

/** Result from single-record custom field data endpoints. */
export interface CustomFieldDataResult extends RuleApiResponse {
  data?: CustomFieldData;
}

/** Filters for `listCustomFieldData`. */
export interface CustomFieldDataFilters {
  /** Filter records by custom field group IDs. Maps to `groups_id[]`. */
  groupIds?: number[];
  /** Filter records by custom field group names. Maps to `groups_name[]`. */
  groupNames?: string[];
}

/** Filters for `listCustomFieldDataByGroup`. */
export interface CustomFieldDataByGroupFilters {
  /** Narrow results to specific field names. Maps to `fields[]`. */
  fields?: string[];
}

/** Params for `listCustomFieldData`. */
export interface ListCustomFieldDataParams {
  pagination?: PagePaginationParams;
  filters?: CustomFieldDataFilters;
}

/** Params for `listAllCustomFieldData`. */
export interface ListAllCustomFieldDataParams extends ListCustomFieldDataParams {
  /** Maximum number of records to collect before stopping. Prevents unbounded memory usage. */
  maxItems?: number;
}

/** Params for `listCustomFieldDataByGroup`. */
export interface ListCustomFieldDataByGroupParams {
  pagination?: PagePaginationParams;
  filters?: CustomFieldDataByGroupFilters;
}

/** Params for `listAllCustomFieldDataByGroup`. */
export interface ListAllCustomFieldDataByGroupParams extends ListCustomFieldDataByGroupParams {
  /** Maximum number of records to collect before stopping. Prevents unbounded memory usage. */
  maxItems?: number;
}

/** Params for `searchCustomFieldData`. */
export interface SearchCustomFieldDataParams {
  dataId?: number;
  group?: number | string;
  field?: number | string;
  value?: string;
}

/** One field entry in a custom field data create/update payload. */
export interface CustomFieldEntry {
  field: number | string;
  createIfNotExists?: boolean;
  value: CustomFieldDataValue;
}

/** One group entry in a custom field data create payload. */
export interface CustomFieldGroupEntry {
  group: number | string;
  createIfNotExists?: boolean;
  historical?: boolean;
  values: CustomFieldEntry[];
}

/** Payload for `writeCustomFieldData`. */
export interface WriteCustomFieldDataPayload {
  groups: CustomFieldGroupEntry[];
}

/** Input for the ergonomic custom field data write helpers. */
export type CustomFieldValue = string | number | boolean | null | Date;

/** Ergonomic write input: a two-level record of group names → field names → values. */
export type CustomFieldDataInput = Record<string, Record<string, CustomFieldValue>>;

/** Return type for custom field data write methods. */
export type CustomFieldDataWriteResult = RuleApiResponse;

/** Payload for `patchCustomFieldData`. */
export interface PatchCustomFieldDataPayload {
  identifier: {
    dataId?: number;
    group?: number | string;
    field?: number | string;
    value?: string;
  };
  values: Array<{
    field: number | string;
    createIfNotExists?: boolean;
    value: CustomFieldDataValue;
  }>;
}

/**
 * One custom field group: a map of field names to their values.
 *
 * Keys are bare field names (e.g., `'OrderRef'`, `'FirstName'`).
 * Field names must not be empty or contain dots.
 *
 * @example
 * ```typescript
 * { OrderRef: 'ORD-9921', Total: '149.00' }
 * ```
 */
export interface CustomFieldGroupData {
  [field: string]: string | number | undefined;
}

/**
 * Custom field data to sync to Rule.io, organised by group name.
 *
 * Top-level keys are group names (e.g., `'Order'`, `'Profile'`).
 * Group names must not be empty or contain dots.
 *
 * @example
 * ```typescript
 * {
 *   Profile: { FirstName: 'Jane', Language: 'sv' },
 *   Order:   { OrderRef: 'ORD-9921', Total: '149.00' },
 * }
 * ```
 */
export interface CustomFieldGroupDataRecord {
  [group: string]: CustomFieldGroupData;
}

// ── Internal wire-format types ────────────────────────────────────────────────
// These mirror the API wire format and are used only inside the transport layer.
// They are not part of the public SDK surface.

// ── Subscriber wire types ─────────────────────────────────────────────────────

/** @internal */
export interface GetSubscriberResponse extends RuleApiResponse {
  subscriber: {
    id: number;
    email: string;
    phone_number?: string;
    language?: string;
    opted_in?: boolean;
    created_at?: string;
    updated_at?: string;
    tags?: Array<{ id: number; name: string }>;
    suppressed?: unknown[];
    syncAtSegments?: SubscriberSegment[];
  };
}

/** @internal */
export interface SubscriberFieldsResponse extends RuleApiResponse {
  groups?: Array<{
    name: string;
    fields: Array<{ name: string; value: string | null }>;
  }>;
}

/** @internal */
export interface SubscriberTagsResponse extends RuleApiResponse {
  tags?: Array<{ id: number; name: string }>;
}

/**
 * Subscriber shape returned by the v2 list endpoint.
 * @internal
 */
export interface SubscriberListWire {
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

/** @internal */
export interface SubscribersListResponse extends RuleApiResponse {
  subscribers?: SubscriberListWire[];
  meta?: { next?: string | null };
}

/** @internal */
export interface CreateSubscriberResponse {
  data: {
    id: number;
    email: string | null;
    phone: string | null;
    has_next_item?: boolean;
    custom_identifier?: string | null;
    account_id?: number;
    created_at?: string;
    updated_at?: string;
    status?: string;
    language?: string;
  };
}

/**
 * v3 subscriber entity shape (wire format).
 * @internal
 */
export interface SubscriberV3Wire {
  id: number;
  email?: string | null;
  phone?: string | null;
  custom_identifier?: string | null;
  status?: string;
  language?: string;
  created_at?: string;
  updated_at?: string;
}

// ── Custom field data wire types ──────────────────────────────────────────────

/** @internal */
export interface CustomFieldValueEntryWire {
  field_id: number;
  field_name: string;
  field_type: 'text' | 'datetime' | 'date' | 'time' | 'multiple' | 'json';
  field_value: CustomFieldDataValue;
}

/** @internal */
export interface CustomFieldDataRecordWire {
  id: number;
  group_id?: number;
  group_name?: string;
  historical?: boolean;
  created_at?: string;
  values: CustomFieldValueEntryWire[];
}

/** @internal */
export interface CustomFieldDataListResponseWire extends RuleApiResponse {
  data?: CustomFieldDataRecordWire[];
  meta?: { page: number; per_page: number };
}

/** @internal */
export interface CustomFieldDataResponseWire extends RuleApiResponse {
  data?: CustomFieldDataRecordWire;
}
