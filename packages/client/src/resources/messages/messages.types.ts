/**
 * Message types (v3 `/editor/message` endpoint).
 */

import type { RuleApiResponse, RuleListResponse } from '../../shared.types.js';

/** Message represents email content in Rule.io's new editor. */
export interface RuleMessage {
  id?: number;
  name: string;
  subject: string;
  preheader?: string;
  from_name?: string;
  from_email?: string;
  reply_to?: string;
  utm_campaign?: string | null;
  utm_term?: string | null;
}

export interface RuleMessageCreateRequest {
  dispatcher: {
    id: number;
    type: 'automail' | 'campaign';
  };
  type: number; // 1 = email
  subject: string;
  preheader?: string;
  from_name?: string;
  from_email?: string;
  reply_to?: string;
  automail_setting?: {
    active: boolean;
    delay_in_seconds: string;
  };
}

export interface RuleMessageResponse extends RuleApiResponse {
  data?: RuleMessage;
}

/**
 * Query parameters for listing messages.
 * Both fields are required — the API filters messages by their parent dispatcher.
 */
export interface RuleMessageListParams {
  /** Dispatcher ID (automail or campaign ID) */
  id: number;
  /** Dispatcher type */
  dispatcher_type: 'campaign' | 'automail';
}

export type RuleMessageListResponse = RuleListResponse<RuleMessage>;
