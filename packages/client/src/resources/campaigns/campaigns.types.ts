/**
 * Campaign types (v3 `/editor/campaign` endpoint).
 */

import type {
  RuleApiResponse,
  RuleListResponse,
  RulePaginationParams,
} from '../../shared.types.js';
import type { RuleSendoutType } from '../automations/automations.types.js';

/** Status/type descriptor returned by the API for campaign fields. */
export interface RuleCampaignStatus {
  value: number;
  key: string;
  description: string;
}

/** A tag used as a campaign recipient filter. */
export interface RuleCampaignRecipientTag {
  id: number;
  name?: string;
  negative: boolean;
}

/** A segment used as a campaign recipient filter. */
export interface RuleCampaignRecipientSegment {
  id: number;
  name?: string;
  negative: boolean;
}

/** Campaign represents a one-off email send in Rule.io's new editor. */
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

/**
 * Request body for creating a campaign.
 *
 * @example
 * ```typescript
 * await client.campaigns.create({
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
 * Request body for updating a campaign via `campaigns.update()`.
 *
 * All fields are optional — pass only what you want to change. The client
 * fetches the existing record and merges your partial input before writing.
 */
export interface RuleCampaignUpdateRequest {
  name: string;
  /** 1 = marketing, 2 = transactional */
  sendout_type: RuleSendoutType;
  tags: RuleCampaignRecipientTag[];
  segments: RuleCampaignRecipientSegment[];
  subscribers: number[];
}

/**
 * Request body for `campaigns.set()` — full replacement or creation (upsert).
 *
 * All five core fields are required. `message_type` is only needed when the
 * campaign does not yet exist (i.e. the call results in a create).
 */
export interface RuleCampaignSetRequest extends RuleCampaignUpdateRequest {
  /** 1 = email, 2 = text_message — required if the campaign does not exist yet */
  message_type?: 1 | 2;
}

export interface RuleCampaignResponse extends RuleApiResponse {
  data?: RuleCampaign;
}

/**
 * Query parameters for listing campaigns.
 *
 * @example
 * ```typescript
 * const campaigns = await client.campaigns.list({ page: 1, per_page: 20, message_type: 1 });
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
