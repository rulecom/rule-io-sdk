/**
 * Campaigns namespace client.
 *
 * Wraps the v3 `/editor/campaign` endpoints, including the auxiliary
 * `/copy` and `/schedule` actions.
 */

import { RuleApiError, RuleClientError } from '../../errors.js';

import { BaseResource } from '../../core/base-resource.js';
import { buildQueryString } from '../../core/query-string.js';
import type { RuleApiResponse } from '../../shared.types.js';

import type {
  RuleCampaignCreateRequest,
  RuleCampaignListParams,
  RuleCampaignListResponse,
  RuleCampaignResponse,
  RuleCampaignScheduleRequest,
  RuleCampaignSetRequest,
  RuleCampaignUpdateRequest,
} from './campaigns.types.js';
import { toNumericSendout } from '../../utils/index.js';

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
   * Set (upsert) a campaign — replaces it if it exists, creates it if not.
   *
   * All five core fields are required. If the campaign does not exist and
   * `message_type` is omitted, a `RuleClientError` is thrown.
   *
   * @param id - Campaign ID.
   * @param campaign - Full replacement body.
   * @returns The updated or newly created campaign.
   * @throws RuleClientError if `sendout_type` cannot be coerced to a number.
   * @throws RuleClientError if the campaign does not exist and `message_type`
   *   was not provided.
   *
   * @example
   * ```typescript
   * // Replace an existing campaign (message_type not needed)
   * await client.campaigns.set(123, {
   *   name: 'Spring Sale',
   *   sendout_type: 1,
   *   tags: [{ id: 42, negative: false }],
   *   segments: [],
   *   subscribers: [],
   * });
   *
   * // Upsert — create if absent
   * await client.campaigns.set(123, {
   *   name: 'Spring Sale',
   *   message_type: 1,
   *   sendout_type: 1,
   *   tags: [{ id: 42, negative: false }],
   *   segments: [],
   *   subscribers: [],
   * });
   * ```
   */
  async set(id: number, campaign: RuleCampaignSetRequest): Promise<RuleCampaignResponse> {
    const sendoutType = toNumericSendout(campaign.sendout_type);

    if (sendoutType == null) {
      throw new RuleClientError(
        `Cannot set campaign ${id}: sendout_type is not a valid numeric value`
      );
    }

    const body = {
      name: campaign.name,
      sendout_type: sendoutType,
      tags: campaign.tags,
      segments: campaign.segments,
      subscribers: campaign.subscribers,
    };

    try {
      return await this.transport.put<RuleCampaignResponse>(`/editor/campaign/${id}`, {
        body: JSON.stringify(body),
      });
    } catch (error) {
      if (!(error instanceof RuleApiError) || error.statusCode !== 404) throw error;

      if (campaign.message_type == null) {
        throw new RuleClientError(
          `Cannot create campaign ${id}: message_type is required when the campaign does not exist`
        );
      }

      return this.transport.post<RuleCampaignResponse>('/editor/campaign', {
        body: JSON.stringify({ ...body, message_type: campaign.message_type }),
      });
    }
  }

  /**
   * Update a campaign. Accepts a partial body — only include the fields you
   * want to change. The client fetches the existing record, merges your
   * changes over it, and writes the full merged body back.
   *
   * Unlike `set`, this method never creates a campaign. If the campaign does
   * not exist a `RuleApiError` with status 404 is thrown.
   *
   * @param id - Campaign ID.
   * @param partial - Partial update (all fields optional).
   * @returns The updated campaign.
   * @throws RuleApiError with 404 if the campaign doesn't exist.
   * @throws RuleClientError if the merged record still lacks `sendout_type`
   *   or `tags` after merging.
   *
   * @example
   * ```typescript
   * // Change only the name
   * await client.campaigns.update(123, { name: 'Spring Sale' });
   * ```
   */
  async update(
    id: number,
    partial: Partial<RuleCampaignUpdateRequest>
  ): Promise<RuleCampaignResponse> {
    const existing = await this.get(id);

    if (existing === null) {
      throw new RuleApiError(`Campaign ${id} not found`, 404);
    }

    if (!existing.data) {
      const detail = existing.error ?? existing.message ?? 'response had no data';

      throw new RuleApiError(
        `Cannot update campaign ${id}: unexpected response from get (${detail})`,
        500
      );
    }

    const current = existing.data;
    const updateSendout = toNumericSendout(partial.sendout_type);
    const currentSendout = toNumericSendout(current.sendout_type);

    const sendoutType = updateSendout ?? currentSendout;
    const tags = partial.tags ?? current.recipients?.tags;
    const segments = partial.segments ?? current.recipients?.segments;
    const subscribers = partial.subscribers ?? current.recipients?.subscribers?.map(s => s.id);

    if (sendoutType == null) {
      throw new RuleClientError(
        `Cannot update campaign ${id}: existing record has no sendout_type and update did not provide one`
      );
    }

    if (tags == null) {
      throw new RuleClientError(
        `Cannot update campaign ${id}: existing record has no tags and update did not provide one`
      );
    }

    const fullBody: RuleCampaignUpdateRequest = {
      name: partial.name ?? current.name,
      sendout_type: sendoutType,
      tags,
      segments: segments ?? [],
      subscribers: subscribers ?? [],
    };

    return this.transport.put<RuleCampaignResponse>(`/editor/campaign/${id}`, {
      body: JSON.stringify(fullBody),
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
