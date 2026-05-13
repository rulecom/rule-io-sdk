/**
 * Campaigns namespace client.
 *
 * Wraps the v3 `/editor/campaign` endpoints, including the auxiliary
 * `/copy` and `/schedule` actions.
 */

import { RuleApiError } from '@rulecom/core';

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
  /**
   * List campaigns with optional filtering and pagination.
   *
   * @param params - Optional query parameters for filtering and pagination.
   * @returns List of campaigns.
   *
   * @example
   * ```typescript
   * // List all campaigns
   * const all = await client.campaigns.list();
   *
   * // List email campaigns, page 2
   * const filtered = await client.campaigns.list({
   *   message_type: 1,
   *   page: 2,
   *   per_page: 20,
   * });
   * ```
   */
  list(params?: RuleCampaignListParams): Promise<RuleCampaignListResponse> {
    const qs = params ? buildQueryString({ ...params }) : '';

    return this.transport.get<RuleCampaignListResponse>(`/editor/campaign${qs}`);
  }

  /**
   * Create a campaign (one-off email send).
   *
   * @param campaign - Campaign creation request.
   * @returns The created campaign.
   *
   * @example
   * ```typescript
   * const result = await client.campaigns.create({
   *   message_type: 1, // email
   *   sendout_type: 1, // marketing
   *   tags: [{ id: 42, negative: false }],
   * });
   * console.log(result.data?.id);
   * ```
   */
  create(campaign: RuleCampaignCreateRequest): Promise<RuleCampaignResponse> {
    return this.transport.post<RuleCampaignResponse>('/editor/campaign', {
      body: JSON.stringify(campaign),
    });
  }

  /**
   * Get a campaign by ID.
   *
   * @param id - Campaign ID.
   * @returns The campaign, or `null` if no campaign with that ID exists
   *   (HTTP 404).
   *
   * @example
   * ```typescript
   * const campaign = await client.campaigns.get(123);
   * if (campaign) {
   *   console.log(campaign.data?.name);
   * }
   * ```
   */
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
   *
   * @param id - Campaign ID.
   * @param update - Partial update request (all fields optional).
   * @returns The updated campaign.
   *
   * @example
   * ```typescript
   * // Partial update — only change the name
   * await client.campaigns.update(123, { name: 'Spring Sale' });
   *
   * // Full update with recipients
   * await client.campaigns.update(123, {
   *   name: 'Spring Sale',
   *   sendout_type: 1,
   *   tags: [{ id: 42, negative: false }],
   *   segments: [],
   *   subscribers: [],
   * });
   * ```
   */
  update(
    id: number,
    update: Partial<RuleCampaignUpdateRequest>
  ): Promise<RuleCampaignResponse> {
    return this.transport.put<RuleCampaignResponse>(`/editor/campaign/${id}`, {
      body: JSON.stringify(update),
    });
  }

  /**
   * Delete a campaign.
   *
   * @param id - Campaign ID.
   * @returns A success response.
   */
  delete(id: number): Promise<RuleApiResponse> {
    return this.transport.delete<RuleApiResponse>(`/editor/campaign/${id}`);
  }

  /**
   * Copy (duplicate) a campaign.
   *
   * @param id - Campaign ID to copy.
   * @returns The newly created campaign copy.
   *
   * @example
   * ```typescript
   * const copy = await client.campaigns.copy(123);
   * console.log(copy.data?.id); // new campaign ID
   * ```
   */
  copy(id: number): Promise<RuleCampaignResponse> {
    return this.transport.post<RuleCampaignResponse>(`/editor/campaign/${id}/copy`);
  }

  /**
   * Schedule, send immediately, or cancel the schedule of a campaign.
   *
   * - `type: 'now'` sends the campaign immediately
   * - `type: 'schedule'` with a `datetime` schedules it for later
   * - `type: null` cancels a previously scheduled send
   *
   * @param id - Campaign ID.
   * @param schedule - Schedule configuration.
   * @returns A success response.
   *
   * @example
   * ```typescript
   * // Send now
   * await client.campaigns.schedule(123, { type: 'now' });
   *
   * // Schedule for later
   * await client.campaigns.schedule(123, {
   *   type: 'schedule',
   *   datetime: '2025-06-15 10:00:00',
   * });
   *
   * // Cancel schedule
   * await client.campaigns.schedule(123, { type: null });
   * ```
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
