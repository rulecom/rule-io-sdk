/**
 * Campaigns namespace client.
 *
 * Wraps the v3 `/editor/campaign` endpoints, including the auxiliary
 * `/copy` and `/schedule` actions.
 */

import { RuleApiError } from '@rule-io/core';

import { BaseResource } from '../../core/base-resource.js';
import { buildQueryString } from '../../core/query-string.js';
import type { RuleApiResponse } from '../../shared.types.js';

import type {
  RuleCampaignCreateRequest,
  RuleCampaignListParams,
  RuleCampaignListResponse,
  RuleCampaignResponse,
  RuleCampaignScheduleRequest,
  RuleCampaignUpdateRequest,
} from './campaigns.types.js';

export class CampaignsClient extends BaseResource {
  /** List campaigns with optional filtering and pagination. */
  list(params?: RuleCampaignListParams): Promise<RuleCampaignListResponse> {
    const qs = params ? buildQueryString({ ...params }) : '';

    return this.transport.get<RuleCampaignListResponse>(`/editor/campaign${qs}`);
  }

  /**
   * Create a campaign (one-off email send).
   *
   * @example
   * ```typescript
   * const result = await client.campaigns.create({
   *   message_type: 1, // email
   *   sendout_type: 1, // marketing
   *   tags: [{ id: 42, negative: false }],
   * });
   * ```
   */
  create(campaign: RuleCampaignCreateRequest): Promise<RuleCampaignResponse> {
    return this.transport.post<RuleCampaignResponse>('/editor/campaign', {
      body: JSON.stringify(campaign),
    });
  }

  /** Get a campaign by ID. Returns null on 404. */
  async get(id: number): Promise<RuleCampaignResponse | null> {
    try {
      return await this.transport.get<RuleCampaignResponse>(`/editor/campaign/${id}`);
    } catch (error) {
      if (error instanceof RuleApiError && error.statusCode === 404) {
        return null;
      }

      throw error;
    }
  }

  /**
   * Update a campaign. Supports partial updates — only include the fields
   * you want to change.
   */
  update(
    id: number,
    update: Partial<RuleCampaignUpdateRequest>
  ): Promise<RuleCampaignResponse> {
    return this.transport.put<RuleCampaignResponse>(`/editor/campaign/${id}`, {
      body: JSON.stringify(update),
    });
  }

  /** Delete a campaign. */
  delete(id: number): Promise<RuleApiResponse> {
    return this.transport.delete<RuleApiResponse>(`/editor/campaign/${id}`);
  }

  /** Copy (duplicate) a campaign. */
  copy(id: number): Promise<RuleCampaignResponse> {
    return this.transport.post<RuleCampaignResponse>(`/editor/campaign/${id}/copy`);
  }

  /**
   * Schedule, send immediately, or cancel the schedule of a campaign.
   *
   * - `type: 'now'` sends the campaign immediately
   * - `type: 'schedule'` with a `datetime` schedules it for later
   * - `type: null` cancels a previously scheduled send
   */
  schedule(
    id: number,
    schedule: RuleCampaignScheduleRequest
  ): Promise<RuleApiResponse> {
    return this.transport.post<RuleApiResponse>(`/editor/campaign/${id}/schedule`, {
      body: JSON.stringify(schedule),
    });
  }
}
