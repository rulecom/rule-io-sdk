/**
 * Dynamic-sets namespace client.
 *
 * Wraps the v3 `/editor/dynamic-set` endpoints. A dynamic set connects a
 * message with a template.
 */

import { RuleApiError } from '@rule-io/core';

import { BaseResource } from '../../core/base-resource.js';
import { buildQueryString } from '../../core/query-string.js';
import type { RuleApiResponse } from '../../shared.types.js';

import type {
  RuleDynamicSetCreateRequest,
  RuleDynamicSetListParams,
  RuleDynamicSetListResponse,
  RuleDynamicSetResponse,
  RuleDynamicSetUpdateRequest,
} from './dynamic-sets.types.js';

export class DynamicSetsClient extends BaseResource {
  /**
   * Create a dynamic set to connect a message with a template.
   *
   * @param dynamicSet - Dynamic-set create request (`message_id` and
   *   `template_id`).
   * @returns The created dynamic set.
   *
   * @see https://app.rule.io/redoc/v3#tag/New-Editor.-Dynamic-Set
   */
  create(dynamicSet: RuleDynamicSetCreateRequest): Promise<RuleDynamicSetResponse> {
    return this.transport.post<RuleDynamicSetResponse>('/editor/dynamic-set', {
      body: JSON.stringify(dynamicSet),
    });
  }

  /**
   * Get a dynamic set by ID.
   *
   * @param id - Dynamic-set ID.
   * @returns The dynamic set, or `null` if no dynamic set with that ID
   *   exists (HTTP 404).
   */
  async get(id: number): Promise<RuleDynamicSetResponse | null> {
    try {
      return await this.transport.get<RuleDynamicSetResponse>(`/editor/dynamic-set/${id}`);
    } catch (error) {
      if (error instanceof RuleApiError && error.statusCode === 404) {
        return null;
      }

      throw error;
    }
  }

  /**
   * Update a dynamic set.
   *
   * Note: If a duplicate active dynamic set with the same trigger already
   * exists and this one has `active: true`, the API may automatically
   * deactivate it.
   *
   * @param id - Dynamic-set ID.
   * @param update - Update request body.
   * @returns The updated dynamic set.
   *
   * @example
   * ```typescript
   * await client.dynamicSets.update(789, {
   *   message_id: 456,
   *   template_id: 101,
   *   active: true,
   * });
   * ```
   */
  update(
    id: number,
    update: RuleDynamicSetUpdateRequest
  ): Promise<RuleDynamicSetResponse> {
    return this.transport.put<RuleDynamicSetResponse>(`/editor/dynamic-set/${id}`, {
      body: JSON.stringify(update),
    });
  }

  /**
   * Delete a dynamic set.
   *
   * @param id - Dynamic-set ID.
   * @returns A success response.
   */
  delete(id: number): Promise<RuleApiResponse> {
    return this.transport.delete<RuleApiResponse>(`/editor/dynamic-set/${id}`);
  }

  /**
   * List dynamic sets for a message. The `message_id` parameter is required —
   * the API returns all dynamic sets for that message.
   *
   * @param params - Query parameters with required `message_id`.
   * @returns List of dynamic sets.
   *
   * @example
   * ```typescript
   * const sets = await client.dynamicSets.list({ message_id: 456 });
   * ```
   */
  list(params: RuleDynamicSetListParams): Promise<RuleDynamicSetListResponse> {
    const qs = buildQueryString({ ...params });

    return this.transport.get<RuleDynamicSetListResponse>(`/editor/dynamic-set${qs}`);
  }
}
