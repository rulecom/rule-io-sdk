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
  RuleCampaignUpdateRequest,
} from './campaigns.types.js';
import type { RuleSendoutType } from '../automations/automations.types.js';

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
   * The API requires a full body with `sendout_type` and `tags` even for
   * partial updates. This method implements read-modify-write internally:
   * it fetches the existing campaign, merges the partial input over it, and
   * PUTs the full merged body.
   *
   * @param id - Campaign ID.
   * @param update - Partial update request (all fields optional).
   * @returns The updated campaign.
   * @throws RuleApiError with 404 if the campaign doesn't exist.
   * @throws RuleClientError if the merged record lacks required fields
   *   (`sendout_type`, `tags`).
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
  async update(
    id: number,
    update: Partial<RuleCampaignUpdateRequest>
  ): Promise<RuleCampaignResponse> {
    // Coerce sendout_type to its numeric form, accepting either the numeric
    // value or the response wrapper `{ value, key, description }`.
    // A consumer round-tripping a getCampaign() response into update can
    // legitimately pass the object form; both paths must handle it.
    const toNumericSendout = (v: unknown): RuleSendoutType | undefined => {
      if (typeof v === 'number') return v as RuleSendoutType;

      if (v != null && typeof v === 'object' && 'value' in v) {
        const val = (v as { value: unknown }).value;

        if (typeof val === 'number') return val as RuleSendoutType;
      }

      return undefined;
    };

    const updateSendout = toNumericSendout(update.sendout_type);

    // Fast path: when the caller already supplies every required field, skip
    // the read and PUT directly to save one round-trip.
    // Guard with `!= null` (not `!== undefined`) so a JS caller passing
    // `{ tags: null }` falls through to the slow path instead of sending it
    // to the API. Guard on `updateSendout` (the coerced value), not
    // `update.sendout_type` (the raw input), so a non-coercible wrapper
    // falls through to the slow path instead of producing a PUT with
    // `sendout_type: undefined`. Default `segments`/`subscribers` to `[]`
    // because the API requires the full body (matches slow path).
    if (
      update.name != null &&
      updateSendout != null &&
      update.tags != null
    ) {
      return this.transport.put<RuleCampaignResponse>(`/editor/campaign/${id}`, {
        body: JSON.stringify({
          name: update.name,
          sendout_type: updateSendout,
          tags: update.tags,
          segments: update.segments ?? [],
          subscribers: update.subscribers ?? [],
        }),
      });
    }

    // Slow path: read-modify-write to satisfy the API's full-body PUT
    // requirement when caller passes a partial update.
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
    const currentSendout = toNumericSendout(current.sendout_type);

    const sendoutType = updateSendout ?? currentSendout;
    const tags = update.tags ?? current.recipients?.tags;
    const segments = update.segments ?? current.recipients?.segments;
    const subscribers = update.subscribers ?? current.recipients?.subscribers?.map(s => s.id);

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
      name: update.name ?? current.name,
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
