/**
 * Custom-field-data namespace client.
 *
 * Wraps the v3 `/custom-field-data/*` endpoints. The Custom Field Data API
 * is **deprecated by Rule.io** but remains available for back-compat with
 * existing consumers (e.g. CLI deploy commands).
 */

import { RuleApiError } from '@rulecom/core';

import { BaseResource } from '../../core/base-resource.js';
import { buildQueryString } from '../../core/query-string.js';
import type { RuleApiResponse } from '../../shared.types.js';

import type {
  CreateCustomFieldDataRequestBody,
  RuleCustomFieldDataGroupParams,
  RuleCustomFieldDataListParams,
  RuleCustomFieldDataResponse,
  RuleCustomFieldDataSearchParams,
  RuleCustomFieldDataSingleResponse,
  RuleCustomFieldDataUpdateRequest,
} from './custom-field-data.types.js';

export class CustomFieldDataClient extends BaseResource {
  /**
   * Get custom field data for a subscriber.
   *
   * @deprecated Custom Field Data API is deprecated by Rule.io.
   *
   * @param subscriberId - The subscriber's numeric ID.
   * @param params - Optional pagination and group filters.
   * @returns Custom field data records for the subscriber.
   *
   * @example
   * ```typescript
   * const data = await client.customFieldData.list(42);
   * const filtered = await client.customFieldData.list(42, {
   *   page: 1,
   *   per_page: 10,
   *   groups_id: [1, 2],
   * });
   * ```
   */
  list(
    subscriberId: number,
    params?: RuleCustomFieldDataListParams
  ): Promise<RuleCustomFieldDataResponse> {
    const qs = params
      ? buildQueryString({
          page: params.page,
          per_page: params.per_page,
          'groups_id[]': params.groups_id,
          'groups_name[]': params.groups_name,
        })
      : '';

    return this.transport.get<RuleCustomFieldDataResponse>(
      `/custom-field-data/${subscriberId}${qs}`
    );
  }

  /**
   * Create custom field data for a subscriber.
   *
   * @deprecated Custom Field Data API is deprecated by Rule.io.
   *
   * @param subscriberId - The subscriber's numeric ID.
   * @param body - The field data to create, grouped by field group.
   * @returns A success response (HTTP 201 on success).
   *
   * @example
   * ```typescript
   * await client.customFieldData.create(42, {
   *   groups: [{
   *     group: 'Order',
   *     create_if_not_exists: true,
   *     values: [{ field: 'Ref', create_if_not_exists: true, value: 'ORD-123' }],
   *   }],
   * });
   * ```
   */
  async create(
    subscriberId: number,
    body: CreateCustomFieldDataRequestBody
  ): Promise<RuleApiResponse> {
    await this.transport.fetchRaw('POST', `/custom-field-data/${subscriberId}`, {
      body: JSON.stringify(body),
    });

    return { success: true };
  }

  /**
   * Update custom field data for a subscriber.
   *
   * @deprecated Custom Field Data API is deprecated by Rule.io.
   *
   * @param subscriberId - The subscriber's numeric ID.
   * @param request - The identifier for the record to update and the new
   *   values.
   * @returns A success response (HTTP 204 on success).
   *
   * @example
   * ```typescript
   * await client.customFieldData.update(42, {
   *   identifier: { group: 'Order', field: 'Ref', value: 'ORD-123' },
   *   values: [{ field: 'Status', value: 'shipped' }],
   * });
   * ```
   */
  async update(
    subscriberId: number,
    request: RuleCustomFieldDataUpdateRequest
  ): Promise<RuleApiResponse> {
    await this.transport.fetchRaw('PUT', `/custom-field-data/${subscriberId}`, {
      body: JSON.stringify(request),
    });

    return { success: true };
  }

  /**
   * Get custom field data for a subscriber filtered by group.
   *
   * @deprecated Custom Field Data API is deprecated by Rule.io.
   *
   * @param subscriberId - The subscriber's numeric ID.
   * @param group - Group ID (number) or group name (string).
   * @param params - Optional pagination and field filters.
   * @returns Custom field data records in the specified group.
   *
   * @example
   * ```typescript
   * const data = await client.customFieldData.listByGroup(42, 'Order');
   * const byId = await client.customFieldData.listByGroup(42, 5, {
   *   page: 1,
   *   per_page: 10,
   *   fields: ['Ref', 'Status'],
   * });
   * ```
   */
  listByGroup(
    subscriberId: number,
    group: number | string,
    params?: RuleCustomFieldDataGroupParams
  ): Promise<RuleCustomFieldDataResponse> {
    const qs = params
      ? buildQueryString({
          page: params.page,
          per_page: params.per_page,
          'fields[]': params.fields,
        })
      : '';

    return this.transport.get<RuleCustomFieldDataResponse>(
      `/custom-field-data/${subscriberId}/group/${encodeURIComponent(String(group))}${qs}`
    );
  }

  /**
   * Delete all custom field data for a subscriber in a specific group.
   *
   * @deprecated Custom Field Data API is deprecated by Rule.io.
   *
   * @param subscriberId - The subscriber's numeric ID.
   * @param group - Group ID (number) or group name (string).
   * @returns A success response.
   *
   * @example
   * ```typescript
   * await client.customFieldData.deleteByGroup(42, 'Order');
   * await client.customFieldData.deleteByGroup(42, 5);
   * ```
   */
  deleteByGroup(
    subscriberId: number,
    group: number | string
  ): Promise<RuleApiResponse> {
    return this.transport.delete<RuleApiResponse>(
      `/custom-field-data/${subscriberId}/group/${encodeURIComponent(String(group))}`
    );
  }

  /**
   * Search custom field data for a subscriber by identifier.
   *
   * @deprecated Custom Field Data API is deprecated by Rule.io.
   *
   * @param subscriberId - The subscriber's numeric ID.
   * @param params - Search parameters (`data_id`, `group`, `field`, `value`).
   * @returns A single matching record, or `null` if no record matches
   *   (HTTP 404).
   *
   * @example
   * ```typescript
   * const record = await client.customFieldData.search(42, {
   *   group: 'Order',
   *   field: 'Ref',
   *   value: 'ORD-123',
   * });
   * if (record) {
   *   console.log(record.data?.values);
   * }
   * ```
   */
  async search(
    subscriberId: number,
    params: RuleCustomFieldDataSearchParams
  ): Promise<RuleCustomFieldDataSingleResponse | null> {
    const qs = buildQueryString({
      data_id: params.data_id,
      group: params.group,
      field: params.field,
      value: params.value,
    });

    try {
      return await this.transport.get<RuleCustomFieldDataSingleResponse>(
        `/custom-field-data/${subscriberId}/search${qs}`
      );
    } catch (error) {
      if (error instanceof RuleApiError && error.statusCode === 404) {
        return null;
      }

      throw error;
    }
  }
}
