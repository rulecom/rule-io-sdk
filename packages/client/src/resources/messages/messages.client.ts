/**
 * Messages namespace client.
 *
 * Wraps the v3 `/editor/message` endpoints.
 */

import { RuleApiError } from '@rule-io/core';

import { BaseResource } from '../../core/base-resource.js';
import { buildQueryString } from '../../core/query-string.js';
import type { RuleApiResponse } from '../../shared.types.js';

import type {
  RuleMessageCreateRequest,
  RuleMessageListParams,
  RuleMessageListResponse,
  RuleMessageResponse,
} from './messages.types.js';

export class MessagesClient extends BaseResource {
  /**
   * Create a message attached to a dispatcher (automation or campaign).
   *
   * @see https://app.rule.io/redoc/v3#tag/New-Editor.-Message
   */
  create(message: RuleMessageCreateRequest): Promise<RuleMessageResponse> {
    return this.transport.post<RuleMessageResponse>('/editor/message', {
      body: JSON.stringify(message),
    });
  }

  /** Get a message by ID. Returns null on 404. */
  async get(id: number): Promise<RuleMessageResponse | null> {
    try {
      return await this.transport.get<RuleMessageResponse>(`/editor/message/${id}`);
    } catch (error) {
      if (error instanceof RuleApiError && error.statusCode === 404) {
        return null;
      }

      throw error;
    }
  }

  /** Update a message. */
  update(
    id: number,
    message: Partial<RuleMessageCreateRequest>
  ): Promise<RuleMessageResponse> {
    return this.transport.put<RuleMessageResponse>(`/editor/message/${id}`, {
      body: JSON.stringify(message),
    });
  }

  /** Delete a message. */
  delete(id: number): Promise<RuleApiResponse> {
    return this.transport.delete<RuleApiResponse>(`/editor/message/${id}`);
  }

  /**
   * List messages for a dispatcher (automation or campaign).
   *
   * Both `id` and `dispatcher_type` are required by the API.
   */
  list(params: RuleMessageListParams): Promise<RuleMessageListResponse> {
    const qs = buildQueryString({ ...params });

    return this.transport.get<RuleMessageListResponse>(`/editor/message${qs}`);
  }
}
