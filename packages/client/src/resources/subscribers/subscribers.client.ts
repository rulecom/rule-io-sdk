/**
 * Subscribers namespace client.
 */

import { RuleApiError, RuleClientError } from '../../errors.js';

import { BaseResource } from '../../core/base-resource.js';
import { buildQueryString } from '../../core/query-string.js';
import type { RuleApiResponse } from '../../shared.types.js';

import type {
  BulkTagsPayload,
  SubscriberSyncPayload,
  CustomFieldGroupData,
  CustomFieldGroupDataRecord,
  GetSubscriberResponse,
  SubscriberTagsResponse,
  TagRef,
  AddSubscriberTagsOptions,
  CreateSubscriberPayload,
  CreateSubscriberResponse,
  SubscribersListResponse,
  SubscriberListWire,
  ListSubscribersByTagIdsParams,
  ListAllSubscribersByTagIdsParams,
  ListSubscribersByTagIdsResult,
  ListCustomFieldDataParams,
  ListAllCustomFieldDataParams,
  ListCustomFieldDataByGroupParams,
  ListAllCustomFieldDataByGroupParams,
  CustomFieldDataListResult,
  CustomFieldData,
  WriteCustomFieldDataPayload,
  PatchCustomFieldDataPayload,
  CustomFieldDataInput,
  CustomFieldDataWriteResult,
  CustomFieldDataResult,
  SearchCustomFieldDataParams,
  CustomFieldGroupEntry,
  CustomFieldEntry,
  Subscriber,
  SubscriberTag,
  SubscriberIdentifier,
  CustomFieldValueEntryWire,
  CustomFieldDataRecordWire,
  CustomFieldDataListResponseWire,
  CustomFieldDataResponseWire,
} from './subscribers.types.js';

/** @internal */
export type SubscriberIdentifierBy = 'id' | 'email' | 'phone_number' | 'custom_identifier';

interface BuildCustomFieldDataPayloadOptions {
  historical: boolean;
  createIfNotExists: boolean;
}

function buildCustomFieldDataPayload(
  data: CustomFieldDataInput,
  options: BuildCustomFieldDataPayloadOptions
): WriteCustomFieldDataPayload {
  return {
    groups: Object.entries(data).map(([group, values]) => ({
      group,
      historical: options.historical,
      createIfNotExists: options.createIfNotExists,
      values: Object.entries(values).map(([field, value]) => ({
        field,
        value: (value instanceof Date ? value.toISOString() : value) as unknown as string,
        createIfNotExists: options.createIfNotExists,
      })),
    })),
  };
}

function mapSubscriberIdentifier(identifier: SubscriberIdentifier): {
  value: string;
  identifiedBy: SubscriberIdentifierBy;
} {
  if ('email' in identifier) return { value: identifier.email, identifiedBy: 'email' };
  if ('phoneNumber' in identifier) return { value: identifier.phoneNumber, identifiedBy: 'phone_number' };
  if ('id' in identifier) return { value: String(identifier.id), identifiedBy: 'id' };

  return { value: identifier.customIdentifier, identifiedBy: 'custom_identifier' };
}

export class SubscribersClient extends BaseResource {
  // ── Create ─────────────────────────────────────────────────────────────────

  /**
   * Create a subscriber via the v3 API.
   *
   * @param payload - Subscriber data (email, phoneNumber, status, etc.).
   * @returns The created subscriber entity.
   *
   * @example
   * ```typescript
   * const sub = await client.subscribers.create({
   *   email: 'customer@example.com',
   *   status: 'ACTIVE',
   *   language: 'sv',
   * });
   * console.log(sub.id);
   * ```
   */
  async create(payload: CreateSubscriberPayload): Promise<Subscriber> {
    const response = await this.transport.post<CreateSubscriberResponse>('/subscribers', {
      body: JSON.stringify(mapCreateRequestToWire(payload)),
    });

    return mapCreateDataToEntity(response.data);
  }

  // ── Look up ────────────────────────────────────────────────────────────────

  /**
   * Get subscriber by numeric ID.
   *
   * @returns The subscriber entity, or `null` if not found (HTTP 404).
   *
   * @remarks There is no `getByCustomIdentifier` — the API does not support
   * fetching a subscriber by custom identifier. See
   * [Known Issues — Subscribers API](../docs/known-issues-subscribers.md).
   */
  getById(id: number): Promise<Subscriber | null> {
    return this._getSubscriber(String(id), 'id');
  }

  /**
   * Get subscriber by email address.
   *
   * @returns The subscriber entity, or `null` if not found (HTTP 404).
   *
   * @remarks There is no `getByCustomIdentifier` — the API does not support
   * fetching a subscriber by custom identifier. See
   * [Known Issues — Subscribers API](../docs/known-issues-subscribers.md).
   */
  getByEmail(email: string): Promise<Subscriber | null> {
    return this._getSubscriber(email, 'email');
  }

  /**
   * Get subscriber by phone number. The value is URL-encoded automatically
   * (e.g. `+46123456789` → `%2B46123456789`).
   *
   * @returns The subscriber entity, or `null` if not found (HTTP 404).
   *
   * @remarks There is no `getByCustomIdentifier` — the API does not support
   * fetching a subscriber by custom identifier. See
   * [Known Issues — Subscribers API](../docs/known-issues-subscribers.md).
   */
  getByPhone(phone: string): Promise<Subscriber | null> {
    return this._getSubscriber(phone, 'phone_number');
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  /** Delete a subscriber by email address. */
  deleteByEmail(email: string): Promise<RuleApiResponse> {
    return this._deleteSubscriber(email, 'email');
  }

  /** Delete a subscriber by numeric Rule.io ID. */
  deleteById(id: number): Promise<RuleApiResponse> {
    return this._deleteSubscriber(id, 'id');
  }

  /** Delete a subscriber by phone number. */
  deleteByPhoneNumber(phone: string): Promise<RuleApiResponse> {
    return this._deleteSubscriber(phone, 'phone_number');
  }

  /** Delete a subscriber by custom identifier. */
  deleteByCustomIdentifier(identifier: string): Promise<RuleApiResponse> {
    return this._deleteSubscriber(identifier, 'custom_identifier');
  }

  // ── Tags ───────────────────────────────────────────────────────────────────

  // Single-tag add/remove (mirrored pair)

  /**
   * Add a single tag to a subscriber via the v3 API.
   *
   * @param subscriber - Who to tag: `{ email }`, `{ id }`, `{ phoneNumber }`, or `{ customIdentifier }`.
   * @param tag - Tag name or numeric ID to add.
   * @returns A success response.
   *
   * @example
   * ```typescript
   * await client.subscribers.addSubscriberTag({ email: 'customer@example.com' }, 'vip');
   * ```
   */
  async addSubscriberTag(
    subscriber: SubscriberIdentifier,
    tag: TagRef,
  ): Promise<RuleApiResponse> {
    return this._addSubscriberTags(subscriber, [tag]);
  }

  /**
   * Remove a single tag from a subscriber via the v3 API.
   *
   * @param subscriber - Subscriber identifier (email, phone number, ID, or
   *   custom identifier).
   * @param tag - Tag name or ID to remove.
   * @returns A success response.
   *
   * @remarks **Segment membership is not recalculated after removal.** The V3
   * API does not queue a segment sync, so subscribers may remain in (or be
   * excluded from) tag-based segments until something else triggers a sync.
   * See [Known Issues — Subscribers API](../docs/known-issues-subscribers.md)
   * for the available workaround.
   *
   * @example
   * ```typescript
   * await client.subscribers.removeSubscriberTag({ email: 'customer@example.com' }, 'old-promo');
   * ```
   */
  async removeSubscriberTag(
    subscriber: SubscriberIdentifier,
    tag: TagRef,
  ): Promise<RuleApiResponse> {
    const { value, identifiedBy } = mapSubscriberIdentifier(subscriber);

    await this.transport.fetchRaw(
      'DELETE',
      `/subscribers/${encodeURIComponent(value)}/tags/${encodeURIComponent(String(tag))}?identified_by=${identifiedBy}`
    );

    return { success: true };
  }

  // Multi-tag add/remove (mirrored pair, single subscriber, async)

  /**
   * Add tags to a subscriber via the v3 API.
   *
   * Asynchronous (HTTP 204) — tags are applied in the background by Rule.io.
   *
   * @param subscriber - Who to tag: `{ email }`, `{ id }`, `{ phoneNumber }`, or `{ customIdentifier }`.
   * @param tags - Tag names or numeric IDs to add.
   * @param options - Optional settings.
   * @param options.callbackUrl - URL Rule.io will POST to when the operation completes.
   * @returns A success response indicating the request was accepted.
   *
   * @remarks Asynchronous — see [Asynchronous Operations](../docs/async-operations.md).
   *
   * @example
   * ```typescript
   * await client.subscribers.addSubscriberTags(
   *   { email: 'customer@example.com' },
   *   ['vip', 'returning'],
   * );
   * ```
   */
  async addSubscriberTags(
    subscriber: SubscriberIdentifier,
    tags: TagRef[],
    options: { callbackUrl?: string } = {},
  ): Promise<RuleApiResponse> {
    const wireBody: Record<string, unknown> = {
      subscribers: [mapSubscriberIdentifierToWire(subscriber)],
      tags,
    };

    if (options.callbackUrl) wireBody.callback_url = options.callbackUrl;
    await this.transport.fetchRaw('POST', '/subscribers/tags', { body: JSON.stringify(wireBody) });

    return { success: true };
  }

  /**
   * Remove tags from a subscriber via the v3 API.
   *
   * Asynchronous (HTTP 204) — tags are removed in the background by Rule.io.
   *
   * @param subscriber - Subscriber identifier (email, phone number, ID, or custom identifier).
   * @param tags - Tag names or numeric IDs to remove.
   * @param options - Optional settings.
   * @param options.callbackUrl - URL Rule.io will POST to when the operation completes.
   * @returns A success response indicating the request was accepted.
   *
   * @remarks Asynchronous — see [Asynchronous Operations](../docs/async-operations.md).
   * Segment membership is not recalculated after removal — see
   * [Known Issues — Subscribers API](../docs/known-issues-subscribers.md).
   *
   * @example
   * ```typescript
   * await client.subscribers.removeSubscriberTags(
   *   { email: 'customer@example.com' },
   *   ['old-promo'],
   * );
   * ```
   */
  async removeSubscriberTags(
    subscriber: SubscriberIdentifier,
    tags: TagRef[],
    options: { callbackUrl?: string } = {},
  ): Promise<RuleApiResponse> {
    const wireBody: Record<string, unknown> = {
      subscribers: [mapSubscriberIdentifierToWire(subscriber)],
      tags,
    };

    if (options.callbackUrl) wireBody.callback_url = options.callbackUrl;
    await this.transport.fetchRaw('DELETE', '/subscribers/tags', { body: JSON.stringify(wireBody) });

    return { success: true };
  }

  // Bulk add/remove (mirrored pair, multiple subscribers, async)

  /**
   * Add tags to multiple subscribers in bulk via the v3 API.
   *
   * Asynchronous (HTTP 204) — tags are applied in the background by Rule.io.
   *
   * @param subscribers - Subscribers to tag.
   * @param tags - Tag names or numeric IDs to add.
   * @param options - Optional settings.
   * @param options.callbackUrl - URL Rule.io will POST to when the operation completes.
   * @returns A success response indicating the request was accepted.
   *
   * @remarks Asynchronous — see [Asynchronous Operations](../docs/async-operations.md).
   *
   * @example
   * ```typescript
   * await client.subscribers.bulkAddSubscriberTags(
   *   [{ email: 'a@example.com' }, { email: 'b@example.com' }],
   *   ['newsletter', 'promo-2024'],
   * );
   * ```
   */
  async bulkAddSubscriberTags(
    subscribers: SubscriberIdentifier[],
    tags: TagRef[],
    options: { callbackUrl?: string } = {},
  ): Promise<RuleApiResponse> {
    const wireBody: Record<string, unknown> = {
      subscribers: subscribers.map(mapSubscriberIdentifierToWire),
      tags,
    };

    if (options.callbackUrl) wireBody.callback_url = options.callbackUrl;
    await this.transport.fetchRaw('POST', '/subscribers/tags', { body: JSON.stringify(wireBody) });

    return { success: true };
  }

  /**
   * Remove tags from multiple subscribers in bulk via the v3 API.
   *
   * Asynchronous (HTTP 204) — tags are removed in the background by Rule.io.
   *
   * @param subscribers - Subscribers to remove tags from.
   * @param tags - Tag names or numeric IDs to remove.
   * @param options - Optional settings.
   * @param options.callbackUrl - URL Rule.io will POST to when the operation completes.
   * @returns A success response indicating the request was accepted.
   *
   * @remarks Asynchronous — see [Asynchronous Operations](../docs/async-operations.md).
   *
   * @example
   * ```typescript
   * await client.subscribers.bulkRemoveSubscriberTags(
   *   [{ email: 'a@example.com' }, { email: 'b@example.com' }],
   *   ['old-campaign'],
   * );
   * ```
   */
  async bulkRemoveSubscriberTags(
    subscribers: SubscriberIdentifier[],
    tags: TagRef[],
    options: { callbackUrl?: string } = {},
  ): Promise<RuleApiResponse> {
    const wireBody: Record<string, unknown> = {
      subscribers: subscribers.map(mapSubscriberIdentifierToWire),
      tags,
    };

    if (options.callbackUrl) wireBody.callback_url = options.callbackUrl;
    await this.transport.fetchRaw('DELETE', '/subscribers/tags', { body: JSON.stringify(wireBody) });

    return { success: true };
  }

  /**
   * Get all tags attached to a subscriber.
   *
   * @param email - Subscriber email address.
   * @returns Array of `{ id, name }` tag objects, or `null` if no subscriber
   *   with that email exists (HTTP 404). Returns an empty array when the
   *   subscriber exists but has no tags.
   */
  async getSubscriberTags(email: string): Promise<SubscriberTag[] | null> {
    try {
      const response = await this.transport.get<SubscriberTagsResponse>(
        `/subscribers/${encodeURIComponent(email)}/tags?identified_by=email`,
        { version: 'v2' }
      );

      return response.tags ?? [];
    } catch (error) {
      if (error instanceof RuleApiError && error.statusCode === 404) {
        return null;
      }

      throw error;
    }
  }

  /**
   * Get one page of subscribers that have ALL the specified tag IDs (intersection
   * filter). Paginates one page at a time — pass `nextPage` back as `pagination.page`
   * until it returns `null`.
   *
   * Note: filtering is performed client-side. A raw page of `pageSize` subscribers
   * may yield fewer matched results after filtering. Use `iterateSubscribersByTagIds()`
   * to iterate all pages transparently.
   *
   * @param params - `tagIds` (required, non-empty), optional `pagination`.
   * @returns `{ subscribers, matched, scanned, nextPage }` for the page.
   *
   * @example
   * ```typescript
   * let page: number | null = 1;
   * const all: Subscriber[] = [];
   * while (page) {
   *   const res = await client.subscribers.listSubscribersByTagIds({
   *     tagIds: [42, 99],
   *     pagination: { page, pageSize: 500 },
   *   });
   *   all.push(...res.subscribers);
   *   page = res.nextPage;
   * }
   * ```
   */
  async listSubscribersByTagIds(
    params: ListSubscribersByTagIdsParams
  ): Promise<ListSubscribersByTagIdsResult> {
    if (params.tagIds.length === 0) {
      throw new RuleClientError('tagIds must not be empty');
    }

    const qs = buildQueryString({
      page: params.pagination?.page,
      limit: params.pagination?.pageSize,
    });
    const response = await this.transport.get<SubscribersListResponse>(
      `/subscribers${qs}`,
      { version: 'v2' }
    );

    const scanned = response.subscribers ?? [];
    const required = params.tagIds;
    const matched = scanned.filter((sub) => {
      const subTagIds = new Set(sub.tags?.map((t) => t.id) ?? []);

      return required.every((id) => subTagIds.has(id));
    });

    return {
      subscribers: matched.map(mapSubscriberListWireToEntity),
      matched: matched.length,
      scanned: scanned.length,
      nextPage: parseNextPage(response.meta?.next ?? null),
    };
  }

  /**
   * Iterate through pages of subscribers matching all specified tag IDs.
   *
   * Automatically requests additional pages as needed and yields each full
   * page response. `pagination.page` controls the starting page.
   *
   * @param params - `tagIds` (required, non-empty), optional `pagination`.
   *
   * @example
   * ```typescript
   * for await (const page of client.subscribers.iterateSubscribersByTagIdsPages({ tagIds: [42] })) {
   *   console.log(page.subscribers, page.nextPage);
   * }
   * ```
   */
  async *iterateSubscribersByTagIdsPages(
    params: ListSubscribersByTagIdsParams
  ): AsyncIterable<ListSubscribersByTagIdsResult> {
    let page: number | null = params.pagination?.page ?? 1;

    while (page !== null) {
      const result = await this.listSubscribersByTagIds({
        ...params,
        pagination: { ...params.pagination, page },
      });

      yield result;
      page = result.nextPage;
    }
  }

  /**
   * Iterate through all subscribers matching all specified tag IDs.
   *
   * Automatically requests additional pages as needed and yields individual
   * `Subscriber` items one by one. `pagination.page` controls the starting page.
   * `pagination.pageSize` controls the batch size per request.
   *
   * @param params - `tagIds` (required, non-empty), optional `pagination`.
   *
   * @example
   * ```typescript
   * for await (const sub of client.subscribers.iterateSubscribersByTagIds({ tagIds: [42] })) {
   *   console.log(sub.email);
   * }
   * ```
   */
  async *iterateSubscribersByTagIds(
    params: ListSubscribersByTagIdsParams
  ): AsyncIterable<Subscriber> {
    for await (const page of this.iterateSubscribersByTagIdsPages(params)) {
      yield* page.subscribers;
    }
  }

  /**
   * Get all subscribers matching all specified tag IDs as a single array.
   *
   * Prefer `iterateSubscribersByTagIds()` for large datasets.
   *
   * @param params - `tagIds` (required, non-empty), optional `pagination` and `maxItems`.
   *
   * @example
   * ```typescript
   * const subscribers = await client.subscribers.listAllSubscribersByTagIds({
   *   tagIds: [42],
   *   maxItems: 500,
   * });
   * ```
   */
  async listAllSubscribersByTagIds(
    params: ListAllSubscribersByTagIdsParams = { tagIds: [] }
  ): Promise<Subscriber[]> {
    const maxItems = params.maxItems ?? Infinity;
    const subscribers: Subscriber[] = [];

    for await (const sub of this.iterateSubscribersByTagIds(params)) {
      subscribers.push(sub);

      if (subscribers.length >= maxItems) {
        break;
      }
    }

    return subscribers;
  }

  // ── Custom field data ─────────────────────────────────────────────────────

  /**
   * Get one page of custom field data records for a subscriber.
   *
   * @param subscriberId - The subscriber's numeric ID.
   * @param params - Optional pagination and group filters.
   *
   * @example
   * ```typescript
   * const page = await client.subscribers.listCustomFieldData(subscriberId, {
   *   pagination: { page: 2, pageSize: 20 },
   *   filters: { groupNames: ['Order'] },
   * });
   * ```
   */
  async listCustomFieldData(
    subscriberId: number,
    params?: ListCustomFieldDataParams
  ): Promise<CustomFieldDataListResult> {
    const qs = params
      ? buildQueryString({
          page: params.pagination?.page,
          per_page: params.pagination?.pageSize,
          'groups_id[]': params.filters?.groupIds,
          'groups_name[]': params.filters?.groupNames,
        })
      : '';

    const wire = await this.transport.get<CustomFieldDataListResponseWire>(
      `/custom-field-data/${subscriberId}${qs}`
    );

    return {
      success: wire.success,
      data: wire.data?.map(mapCustomFieldDataRecord) ?? [],
      meta: wire.meta ? { page: wire.meta.page, pageSize: wire.meta.per_page } : undefined,
    };
  }

  /**
   * Iterate through pages of custom field data records for a subscriber.
   *
   * Automatically requests additional pages as needed and yields each full page
   * response. `pagination.page` controls the starting page.
   * `pagination.pageSize` controls the number of records fetched per request.
   *
   * @param subscriberId - The subscriber's numeric ID.
   * @param params - Optional pagination and filtering options.
   *
   * @example
   * ```typescript
   * for await (const page of client.subscribers.iterateCustomFieldDataPages(subscriberId)) {
   *   console.log(page.data, page.meta);
   * }
   * ```
   */
  async *iterateCustomFieldDataPages(
    subscriberId: number,
    params: ListCustomFieldDataParams = {}
  ): AsyncIterable<CustomFieldDataListResult> {
    const pageSize = params.pagination?.pageSize ?? 100;
    let page = params.pagination?.page ?? 1;
    let hasMore = true;

    while (hasMore) {
      const result = await this.listCustomFieldData(subscriberId, {
        ...params,
        pagination: { ...params.pagination, page, pageSize },
      });

      yield result;

      hasMore = result.data.length >= pageSize;
      page += 1;
    }
  }

  /**
   * Iterate through all custom field data records for a subscriber.
   *
   * Automatically requests additional pages as needed and yields individual
   * records one by one. `pagination.page` controls the starting page.
   * `pagination.pageSize` controls the number of records fetched per request.
   *
   * @param subscriberId - The subscriber's numeric ID.
   * @param params - Optional pagination and filtering options.
   *
   * @example
   * ```typescript
   * for await (const record of client.subscribers.iterateCustomFieldData(subscriberId)) {
   *   console.log(record.groupName, record.values);
   * }
   * ```
   */
  async *iterateCustomFieldData(
    subscriberId: number,
    params: ListCustomFieldDataParams = {}
  ): AsyncIterable<CustomFieldData> {
    for await (const page of this.iterateCustomFieldDataPages(subscriberId, params)) {
      yield* page.data;
    }
  }

  /**
   * Get all custom field data records for a subscriber as a single array.
   *
   * Prefer `iterateCustomFieldData()` for large datasets.
   *
   * @param subscriberId - The subscriber's numeric ID.
   * @param params - Optional pagination, filtering options, and max item limit.
   *
   * @example
   * ```typescript
   * const records = await client.subscribers.listAllCustomFieldData(subscriberId, {
   *   filters: { groupNames: ['Order'] },
   *   maxItems: 200,
   * });
   * ```
   */
  async listAllCustomFieldData(
    subscriberId: number,
    params: ListAllCustomFieldDataParams = {}
  ): Promise<CustomFieldData[]> {
    const maxItems = params.maxItems ?? Infinity;
    const records: CustomFieldData[] = [];

    for await (const record of this.iterateCustomFieldData(subscriberId, params)) {
      records.push(record);

      if (records.length >= maxItems) {
        break;
      }
    }

    return records;
  }

  /**
   * Write custom field data using the raw API-shaped payload.
   *
   * This is the advanced method for callers who need full control over
   * group creation, field creation, historical behavior, and values.
   *
   * @param subscriberId - The subscriber's numeric ID.
   * @param payload - Groups of field data to write.
   */
  async writeCustomFieldData(
    subscriberId: number,
    payload: WriteCustomFieldDataPayload
  ): Promise<CustomFieldDataWriteResult> {
    await this.transport.fetchRaw('POST', `/custom-field-data/${subscriberId}`, {
      body: JSON.stringify({ groups: payload.groups.map(mapCustomFieldGroupEntryToWire) }),
    });

    return { success: true };
  }

  /**
   * Upsert non-historical custom field data for a subscriber.
   *
   * Missing groups and fields are created automatically.
   *
   * @param subscriberId - The subscriber's numeric ID.
   * @param data - Two-level record of group names → field names → values.
   */
  async upsertCustomFieldData(
    subscriberId: number,
    data: CustomFieldDataInput
  ): Promise<CustomFieldDataWriteResult> {
    return this.writeCustomFieldData(
      subscriberId,
      buildCustomFieldDataPayload(data, { historical: false, createIfNotExists: true })
    );
  }

  /**
   * Update existing non-historical custom field data for a subscriber.
   *
   * Missing groups and fields are ignored.
   *
   * @param subscriberId - The subscriber's numeric ID.
   * @param data - Two-level record of group names → field names → values.
   */
  async updateCustomFieldData(
    subscriberId: number,
    data: CustomFieldDataInput
  ): Promise<CustomFieldDataWriteResult> {
    return this.writeCustomFieldData(
      subscriberId,
      buildCustomFieldDataPayload(data, { historical: false, createIfNotExists: false })
    );
  }

  /**
   * Upsert historical custom field data for a subscriber.
   *
   * Missing historical groups and fields are created automatically.
   *
   * @param subscriberId - The subscriber's numeric ID.
   * @param data - Two-level record of group names → field names → values.
   */
  async upsertHistoricalCustomFieldData(
    subscriberId: number,
    data: CustomFieldDataInput
  ): Promise<CustomFieldDataWriteResult> {
    return this.writeCustomFieldData(
      subscriberId,
      buildCustomFieldDataPayload(data, { historical: true, createIfNotExists: true })
    );
  }

  /**
   * Update existing historical custom field data for a subscriber.
   *
   * Missing historical groups and fields are ignored.
   *
   * @param subscriberId - The subscriber's numeric ID.
   * @param data - Two-level record of group names → field names → values.
   */
  async updateHistoricalCustomFieldData(
    subscriberId: number,
    data: CustomFieldDataInput
  ): Promise<CustomFieldDataWriteResult> {
    return this.writeCustomFieldData(
      subscriberId,
      buildCustomFieldDataPayload(data, { historical: true, createIfNotExists: false })
    );
  }

  /**
   * Update field values in an existing custom field data record.
   *
   * Locates the record by `dataId` or by group + field + value lookup.
   *
   * @param subscriberId - The subscriber's numeric ID.
   * @param payload - Identifier of the record to update and new field values.
   */
  async patchCustomFieldData(
    subscriberId: number,
    payload: PatchCustomFieldDataPayload
  ): Promise<CustomFieldDataWriteResult> {
    const wireBody = {
      identifier: {
        ...(payload.identifier.dataId !== undefined ? { data_id: payload.identifier.dataId } : {}),
        ...(payload.identifier.group !== undefined ? { group: payload.identifier.group } : {}),
        ...(payload.identifier.field !== undefined ? { field: payload.identifier.field } : {}),
        ...(payload.identifier.value !== undefined ? { value: payload.identifier.value } : {}),
      },
      values: payload.values.map(v => ({
        field: v.field,
        ...(v.createIfNotExists !== undefined ? { create_if_not_exists: v.createIfNotExists } : {}),
        value: v.value,
      })),
    };

    await this.transport.fetchRaw('PUT', `/custom-field-data/${subscriberId}`, {
      body: JSON.stringify(wireBody),
    });

    return { success: true };
  }

  /**
   * Get one page of custom field data records for a subscriber filtered by group.
   *
   * @param subscriberId - The subscriber's numeric ID.
   * @param group - Group ID (number) or group name (string).
   * @param params - Optional pagination and field filters.
   *
   * @example
   * ```typescript
   * const page = await client.subscribers.listCustomFieldDataByGroup(subscriberId, 'Order', {
   *   pagination: { pageSize: 50 },
   *   filters: { fields: ['OrderRef', 'Total'] },
   * });
   * ```
   */
  async listCustomFieldDataByGroup(
    subscriberId: number,
    group: number | string,
    params?: ListCustomFieldDataByGroupParams
  ): Promise<CustomFieldDataListResult> {
    const qs = params
      ? buildQueryString({
          page: params.pagination?.page,
          per_page: params.pagination?.pageSize,
          'fields[]': params.filters?.fields,
        })
      : '';

    const wire = await this.transport.get<CustomFieldDataListResponseWire>(
      `/custom-field-data/${subscriberId}/group/${encodeURIComponent(String(group))}${qs}`
    );

    return {
      success: wire.success,
      data: wire.data?.map(mapCustomFieldDataRecord) ?? [],
      meta: wire.meta ? { page: wire.meta.page, pageSize: wire.meta.per_page } : undefined,
    };
  }

  /**
   * Iterate through pages of custom field data records for a subscriber filtered by group.
   *
   * Automatically requests additional pages as needed and yields each full page
   * response. `pagination.page` controls the starting page.
   * `pagination.pageSize` controls the number of records fetched per request.
   *
   * @param subscriberId - The subscriber's numeric ID.
   * @param group - Group ID (number) or group name (string).
   * @param params - Optional pagination and filtering options.
   */
  async *iterateCustomFieldDataByGroupPages(
    subscriberId: number,
    group: number | string,
    params: ListCustomFieldDataByGroupParams = {}
  ): AsyncIterable<CustomFieldDataListResult> {
    const pageSize = params.pagination?.pageSize ?? 100;
    let page = params.pagination?.page ?? 1;
    let hasMore = true;

    while (hasMore) {
      const result = await this.listCustomFieldDataByGroup(subscriberId, group, {
        ...params,
        pagination: { ...params.pagination, page, pageSize },
      });

      yield result;

      hasMore = result.data.length >= pageSize;
      page += 1;
    }
  }

  /**
   * Iterate through all custom field data records for a subscriber filtered by group.
   *
   * Automatically requests additional pages as needed and yields individual
   * records one by one. `pagination.page` controls the starting page.
   * `pagination.pageSize` controls the number of records fetched per request.
   *
   * @param subscriberId - The subscriber's numeric ID.
   * @param group - Group ID (number) or group name (string).
   * @param params - Optional pagination and filtering options.
   */
  async *iterateCustomFieldDataByGroup(
    subscriberId: number,
    group: number | string,
    params: ListCustomFieldDataByGroupParams = {}
  ): AsyncIterable<CustomFieldData> {
    for await (const page of this.iterateCustomFieldDataByGroupPages(subscriberId, group, params)) {
      yield* page.data;
    }
  }

  /**
   * Get all custom field data records for a subscriber filtered by group as a single array.
   *
   * Prefer `iterateCustomFieldDataByGroup()` for large datasets.
   *
   * @param subscriberId - The subscriber's numeric ID.
   * @param group - Group ID (number) or group name (string).
   * @param params - Optional pagination, filtering options, and max item limit.
   */
  async listAllCustomFieldDataByGroup(
    subscriberId: number,
    group: number | string,
    params: ListAllCustomFieldDataByGroupParams = {}
  ): Promise<CustomFieldData[]> {
    const maxItems = params.maxItems ?? Infinity;
    const records: CustomFieldData[] = [];

    for await (const record of this.iterateCustomFieldDataByGroup(subscriberId, group, params)) {
      records.push(record);

      if (records.length >= maxItems) {
        break;
      }
    }

    return records;
  }

  /**
   * Delete all custom field data for a subscriber in a specific group.
   *
   * @param subscriberId - The subscriber's numeric ID.
   * @param group - Group ID (number) or group name (string).
   */
  deleteCustomFieldDataByGroup(
    subscriberId: number,
    group: number | string
  ): Promise<RuleApiResponse> {
    return this.transport.delete<RuleApiResponse>(
      `/custom-field-data/${subscriberId}/group/${encodeURIComponent(String(group))}`
    );
  }

  /**
   * Find a single custom field data record for a subscriber.
   *
   * @param subscriberId - The subscriber's numeric ID.
   * @param params - Lookup parameters (`dataId`, `group`, `field`, `value`).
   * @returns A single matching record, or `null` if not found (HTTP 404).
   */
  async findCustomFieldData(
    subscriberId: number,
    params: SearchCustomFieldDataParams
  ): Promise<CustomFieldDataResult | null> {
    const qs = buildQueryString({
      data_id: params.dataId,
      group: params.group,
      field: params.field,
      value: params.value,
    });

    try {
      const wire = await this.transport.get<CustomFieldDataResponseWire>(
        `/custom-field-data/${subscriberId}/search${qs}`
      );

      return {
        success: wire.success,
        data: wire.data ? mapCustomFieldDataRecord(wire.data) : undefined,
      };
    } catch (error) {
      if (error instanceof RuleApiError && error.statusCode === 404) {
        return null;
      }

      throw error;
    }
  }

  // ── Block / Unblock ───────────────────────────────────────────────────────

  /**
   * Block multiple subscribers via the v3 API.
   *
   * Asynchronous (HTTP 204) — Rule.io processes the block in the background.
   *
   * @param subscribers - Array of subscriber identifiers to block.
   * @param options - Optional settings.
   * @param options.callbackUrl - URL Rule.io will POST to when the operation completes.
   * @returns A success response indicating the request was accepted.
   *
   * @remarks Asynchronous — see [Asynchronous Operations](../docs/async-operations.md).
   *
   * @example
   * ```typescript
   * await client.subscribers.block([
   *   { email: 'spam@example.com' },
   *   { id: 456 },
   * ]);
   * ```
   */
  async block(
    subscribers: SubscriberIdentifier[],
    options: { callbackUrl?: string } = {},
  ): Promise<RuleApiResponse> {
    const payload: Record<string, unknown> = {
      subscribers: subscribers.map(mapSubscriberIdentifierToWire),
    };

    if (options.callbackUrl) payload.callback_url = options.callbackUrl;
    await this.transport.fetchRaw('POST', '/subscribers/block', {
      body: JSON.stringify(payload),
    });

    return { success: true };
  }

  /**
   * Unblock multiple subscribers via the v3 API.
   *
   * Asynchronous (HTTP 204) — Rule.io processes the unblock in the background.
   *
   * @param subscribers - Array of subscriber identifiers to unblock.
   * @param options - Optional settings.
   * @param options.callbackUrl - URL Rule.io will POST to when the operation completes.
   * @returns A success response indicating the request was accepted.
   *
   * @remarks Asynchronous — see [Asynchronous Operations](../docs/async-operations.md).
   *
   * @example
   * ```typescript
   * await client.subscribers.unblock([
   *   { email: 'restored@example.com' },
   *   { phoneNumber: '+46701234567' },
   * ]);
   * ```
   */
  async unblock(
    subscribers: SubscriberIdentifier[],
    options: { callbackUrl?: string } = {},
  ): Promise<RuleApiResponse> {
    const payload: Record<string, unknown> = {
      subscribers: subscribers.map(mapSubscriberIdentifierToWire),
    };

    if (options.callbackUrl) payload.callback_url = options.callbackUrl;
    await this.transport.fetchRaw('POST', '/subscribers/unblock', {
      body: JSON.stringify(payload),
    });

    return { success: true };
  }

  /** @deprecated Use `client.subscribers.bulkAddSubscriberTags()` instead. */
  async bulkAddTags(payload: BulkTagsPayload): Promise<RuleApiResponse> {
    return this.bulkAddSubscriberTags(payload.subscribers, payload.tags);
  }

  /** @deprecated Use `client.subscribers.bulkRemoveSubscriberTags()` instead. */
  async bulkRemoveTags(payload: BulkTagsPayload): Promise<RuleApiResponse> {
    return this.bulkRemoveSubscriberTags(payload.subscribers, payload.tags);
  }

  // ── Sync (upsert with fields and tags) ────────────────────────────────────

  /**
   * Create or update a subscriber, writing custom field data and assigning
   * tags in a single logical operation.
   *
   * Internally makes up to three requests:
   * 1. `POST /subscribers` — create subscriber (or fetch numeric id if they
   *    already exist).
   * 2. `POST /custom-field-data/{id}` — write field values (skipped when
   *    both `fields` and `historicalFields` are empty). Regular and historical
   *    groups are combined into a single request.
   * 3. `PUT /subscribers/{identifier}/tags` — assign tags (skipped when
   *    `tags` is empty).
   *
   * Requests 2 and 3 are issued in parallel once the subscriber id is known.
   *
   * @param payload - Subscriber data including identity fields, custom fields
   *   (organised by group), and tags. Group names and field keys must not be
   *   empty or contain dots.
   *   - `customFieldData` — regular groups; existing values are overwritten on each sync.
   *   - `historicalCustomFieldData` — historical groups; a new entry is appended on each
   *     sync, preserving history.
   * @returns The resolved subscriber entity (id is always populated).
   * @throws {RuleClientError} If any group name or field key is empty or
   *   contains a dot.
   *
   * @example
   * ```typescript
   * const sub = await client.subscribers.sync({
   *   subscriber: { email: 'customer@example.com' },
   *   customFieldData: {
   *     Profile: { MemberTier: 'Gold', City: 'Stockholm' },
   *   },
   *   historicalCustomFieldData: {
   *     Purchases: { OrderRef: 'ORD-456', Total: '149.00' },
   *   },
   *   tags: ['OrderCompleted', 'Newsletter'],
   * });
   * console.log(sub.id);
   * ```
   */
  async sync(payload: SubscriberSyncPayload): Promise<Subscriber> {
    this._validateSyncFields(payload.customFieldData);
    this._validateSyncFields(payload.historicalCustomFieldData);

    const entity = await this._ensureSubscriber(payload.subscriber);

    await Promise.all([
      this._writeSyncFields(entity.id, payload.customFieldData, payload.historicalCustomFieldData),
      this._applyTags(entity.id, payload.subscriber, payload.tags),
    ]);

    return entity;
  }

  // ── Private internals ─────────────────────────────────────────────────────

  /** @internal */
  private _validateSyncFields(fields: CustomFieldGroupDataRecord | undefined): void {
    if (!fields) return;

    for (const group of Object.keys(fields)) {
      const trimmedGroup = group.trim();

      if (!trimmedGroup) {
        throw new RuleClientError('Field group names must not be empty');
      }

      if (trimmedGroup.includes('.')) {
        throw new RuleClientError(`Field group "${trimmedGroup}" must not contain dots`);
      }

      // TypeScript 5.x collapses nested index-signature types in Object.entries inference;
      // cast to bypass that and access the correct shape.
      const groupFields = fields[group] as CustomFieldGroupData;

      for (const field of Object.keys(groupFields)) {
        if (field.includes('.')) {
          throw new RuleClientError(
            `Field key "${field}" in group "${trimmedGroup}" must not contain dots`
          );
        }
      }
    }
  }

  /** @internal */
  private async _ensureSubscriber(payload: CreateSubscriberPayload): Promise<Subscriber> {
    let entity: Subscriber | undefined;
    let apiError: RuleApiError | undefined;

    try {
      const created = await this.transport.post<CreateSubscriberResponse>('/subscribers', {
        body: JSON.stringify(mapCreateRequestToWire(payload)),
      });

      entity = mapCreateDataToEntity(created.data);
    } catch (error) {
      if (!(error instanceof RuleApiError)) throw error;
      apiError = error;
    }

    if (entity !== undefined) return entity;

    // POST /v3/subscribers fails when the subscriber already exists.
    // The exact status code is undocumented; fall back to v2 GET by email.
    if (payload.email && apiError) {
      const existing = await this.getByEmail(payload.email);

      if (existing) return existing;
    }

    throw apiError ?? new RuleApiError('v3 POST /subscribers returned no entity', 0);
  }

  /** @internal */
  private async _writeSyncFields(
    subscriberId: number,
    fields: CustomFieldGroupDataRecord | undefined,
    historicalFields: CustomFieldGroupDataRecord | undefined,
  ): Promise<void> {
    const groups: CustomFieldGroupEntry[] = [];

    for (const [source, historical] of [[fields, false], [historicalFields, true]] as const) {
      if (!source) continue;

      for (const groupName of Object.keys(source)) {
        const groupFields = source[groupName] as CustomFieldGroupData;
        const values: CustomFieldGroupEntry['values'] = [];

        for (const fieldName of Object.keys(groupFields)) {
          const rawValue = groupFields[fieldName];

          if (rawValue !== undefined && String(rawValue) !== '') {
            values.push({ field: fieldName, value: String(rawValue) });
          }
        }

        if (values.length > 0) {
          groups.push(historical
            ? { group: groupName.trim(), historical: true, values }
            : { group: groupName.trim(), values }
          );
        }
      }
    }

    if (groups.length > 0) {
      await this.writeCustomFieldData(subscriberId, { groups });
    }
  }

  /** @internal */
  private async _applyTags(
    subscriberId: number,
    payload: CreateSubscriberPayload,
    tags: string[] | undefined
  ): Promise<void> {
    if (!tags?.length) return;

    const subscriber: SubscriberIdentifier = payload.email
      ? { email: payload.email }
      : payload.phoneNumber
        ? { phoneNumber: payload.phoneNumber }
        : payload.customIdentifier
          ? { customIdentifier: payload.customIdentifier }
          : { id: subscriberId };

    await this._addSubscriberTags(subscriber, tags);
  }

  /** @internal */
  private async _getSubscriber(
    identifier: string,
    identifiedBy: 'id' | 'email' | 'phone_number',
  ): Promise<Subscriber | null> {
    try {
      const response = await this.transport.get<GetSubscriberResponse>(
        `/subscribers/${encodeURIComponent(identifier)}?identified_by=${identifiedBy}`,
        { version: 'v2' }
      );

      return mapGetSubscriberToEntity(response.subscriber);
    } catch (error) {
      if (error instanceof RuleApiError && error.isNotFound()) return null;

      throw error;
    }
  }

  /** @internal */
  private async _addSubscriberTags(
    subscriber: SubscriberIdentifier,
    tags: TagRef[],
    options: AddSubscriberTagsOptions = {},
  ): Promise<RuleApiResponse> {
    const { value, identifiedBy } = mapSubscriberIdentifier(subscriber);

    const wireBody: Record<string, unknown> = { tags };

    if (options.automation !== undefined) {
      wireBody.automation = options.automation === 'trigger' ? 'send' : options.automation;
    }

    if (options.syncSegments === false) {
      wireBody.sync_subscriber = false;
    }

    await this.transport.fetchRaw(
      'PUT',
      `/subscribers/${encodeURIComponent(value)}/tags?identified_by=${identifiedBy}`,
      { body: JSON.stringify(wireBody), version: 'v3' },
    );

    return { success: true };
  }

  /** @internal */
  private async _deleteSubscriber(
    subscriber: string | number,
    identifiedBy: SubscriberIdentifierBy
  ): Promise<RuleApiResponse> {
    await this.transport.fetchRaw(
      'DELETE',
      `/subscribers/${encodeURIComponent(subscriber)}?identified_by=${identifiedBy}`
    );

    return { success: true };
  }
}

// ── Module-level helpers ───────────────────────────────────────────────────

/** @internal */
function parseNextPage(nextUrl: string | null): number | null {
  if (!nextUrl) return null;

  try {
    const pageStr = new URL(nextUrl).searchParams.get('page');

    if (!pageStr) return null;
    const page = Number.parseInt(pageStr, 10);

    return Number.isFinite(page) && page > 0 ? page : null;
  } catch {
    return null;
  }
}

/** @internal */
function mapCreateDataToEntity(data: CreateSubscriberResponse['data']): Subscriber {
  return {
    id: data.id,
    email: data.email,
    phone: data.phone,
    customIdentifier: data.custom_identifier ?? null,
    status: data.status,
    language: data.language,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/** @internal */
function mapGetSubscriberToEntity(sub: GetSubscriberResponse['subscriber']): Subscriber {
  return {
    id: sub.id,
    email: sub.email ?? null,
    phone: sub.phone_number ?? null,
    customIdentifier: null,
    language: sub.language,
    optedIn: sub.opted_in,
    tags: sub.tags,
    syncAtSegments: sub.syncAtSegments,
    createdAt: sub.created_at,
    updatedAt: sub.updated_at,
  };
}

/** @internal */
function mapSubscriberListWireToEntity(record: SubscriberListWire): Subscriber {
  return {
    id: record.id,
    email: record.email,
    phone: record.phone_number,
    customIdentifier: null,
    language: record.language,
    optedIn: record.opted_in,
    suppressed: record.suppressed,
    tags: record.tags ?? undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

/** @internal */
function mapCustomFieldValueEntry(w: CustomFieldValueEntryWire) {
  return {
    fieldId: w.field_id,
    fieldName: w.field_name,
    fieldType: w.field_type,
    fieldValue: w.field_value,
  };
}

/** @internal */
function mapCustomFieldDataRecord(w: CustomFieldDataRecordWire) {
  return {
    id: w.id,
    groupId: w.group_id,
    groupName: w.group_name,
    historical: w.historical,
    createdAt: w.created_at,
    values: w.values.map(mapCustomFieldValueEntry),
  };
}

/** @internal */
function mapCreateRequestToWire(payload: CreateSubscriberPayload): object {
  return {
    ...(payload.email !== undefined ? { email: payload.email } : {}),
    ...(payload.phoneNumber !== undefined ? { phone_number: payload.phoneNumber } : {}),
    ...(payload.customIdentifier !== undefined ? { custom_identifier: payload.customIdentifier } : {}),
    ...(payload.status !== undefined ? { status: payload.status } : {}),
    ...(payload.language !== undefined ? { language: payload.language } : {}),
  };
}

/** @internal */
function mapSubscriberIdentifierToWire(id: SubscriberIdentifier): object {
  if ('email' in id) return { email: id.email };
  if ('phoneNumber' in id) return { phone_number: id.phoneNumber };
  if ('id' in id) return { id: id.id };

  return { custom_identifier: id.customIdentifier };
}

/** @internal */
function mapCustomFieldEntryToWire(entry: CustomFieldEntry): object {
  return {
    field: entry.field,
    ...(entry.createIfNotExists !== undefined ? { create_if_not_exists: entry.createIfNotExists } : {}),
    value: entry.value,
  };
}

/** @internal */
function mapCustomFieldGroupEntryToWire(entry: CustomFieldGroupEntry): object {
  return {
    group: entry.group,
    ...(entry.createIfNotExists !== undefined ? { create_if_not_exists: entry.createIfNotExists } : {}),
    ...(entry.historical !== undefined ? { historical: entry.historical } : {}),
    values: entry.values.map(mapCustomFieldEntryToWire),
  };
}
