/**
 * Dynamic-set types (v3 `/editor/dynamic-set` endpoint).
 */

import type { RuleApiResponse, RuleListResponse } from '../../shared.types.js';

/** Dynamic Set connects a message with a template. */
export interface RuleDynamicSet {
  id?: number;
  message_id: number;
  template_id: number;
}

export interface RuleDynamicSetCreateRequest {
  message_id: number;
  template_id: number;
}

export interface RuleDynamicSetResponse extends RuleApiResponse {
  data?: RuleDynamicSet;
}

/**
 * Query parameters for listing dynamic sets.
 * The message_id is required — the API returns all dynamic sets for a given message.
 */
export interface RuleDynamicSetListParams {
  /** Message ID to filter by */
  message_id: number;
}

export type RuleDynamicSetListResponse = RuleListResponse<RuleDynamicSet>;

/**
 * Request body for updating a dynamic set.
 *
 * Note: If a duplicate active dynamic set with the same trigger already exists,
 * the updated one may be automatically deactivated by the API.
 */
export interface RuleDynamicSetUpdateRequest {
  message_id: number;
  template_id?: number;
  name?: string;
  subject?: string;
  pre_header?: string;
  utm_campaign?: string;
  utm_term?: string;
  active?: boolean;
  sender?: {
    email?: string | null;
    phone_number?: string | null;
    name?: string | null;
  };
  trigger?: {
    type: 'TAG' | 'SEGMENT';
    id: number;
  } | null;
}
