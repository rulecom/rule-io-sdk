/**
 * Automation types (v3 `/editor/automail` endpoint).
 *
 * The v3 API previously named these resources "automail"; the SDK exposes
 * them under "Automation" terminology. Deprecated `Automail*` aliases are
 * kept here for back-compat — they are structurally identical.
 */

import type { RuleApiResponse, RuleListResponse, RulePaginationParams } from '../../shared.types.js';

/**
 * Trigger configuration for an automation.
 * Note: The type field must be uppercase ("TAG" or "SEGMENT") despite
 * the API error messages suggesting lowercase.
 */
export interface RuleAutomationTrigger {
  type: 'TAG' | 'SEGMENT';
  id: number;
  name?: string;
}

/**
 * @deprecated Use {@link RuleAutomationTrigger} instead.
 */
export interface RuleAutomailTrigger extends RuleAutomationTrigger {}

/**
 * Sendout type for an automation.
 * - 1: Campaign (marketing emails)
 * - 2: Transactional (order confirmations, receipts, etc.)
 */
export type RuleSendoutType = 1 | 2;

/** Automation represents an automation workflow in Rule.io's editor. */
export interface RuleAutomation {
  id?: number;
  name: string;
  description?: string;
  active?: boolean;
  trigger?: RuleAutomationTrigger | null;
  sendout_type?: {
    value: number;
    key: string;
    description: string;
  };
}

/**
 * @deprecated Use {@link RuleAutomation} instead.
 */
export interface RuleAutomail extends RuleAutomation {}

export interface RuleAutomationCreateRequest {
  name: string;
  description?: string;
  trigger?: RuleAutomationTrigger;
  sendout_type?: RuleSendoutType;
}

/**
 * @deprecated Use {@link RuleAutomationCreateRequest} instead.
 */
export interface RuleAutomailCreateRequest extends RuleAutomationCreateRequest {}

/**
 * Request to update an automation with trigger and sendout type.
 * The trigger.type must be uppercase ("TAG" or "SEGMENT").
 *
 * Tip: The `automations.update()` method accepts `Partial<RuleAutomationUpdateRequest>`
 * so you can pass only the fields you want to change.
 */
export interface RuleAutomationUpdateRequest {
  name: string;
  active: boolean;
  trigger: RuleAutomationTrigger;
  sendout_type: RuleSendoutType;
}

/**
 * @deprecated Use {@link RuleAutomationUpdateRequest} instead.
 */
export interface RuleAutomailUpdateRequest extends RuleAutomationUpdateRequest {}

export interface RuleAutomationResponse extends RuleApiResponse {
  data?: RuleAutomation;
}

/**
 * @deprecated Use {@link RuleAutomationResponse} instead.
 */
export interface RuleAutomailResponse extends RuleAutomationResponse {}

/**
 * Query parameters for listing automations.
 *
 * @example
 * ```typescript
 * const result = await client.automations.list({ page: 1, per_page: 20, active: true });
 * ```
 */
export interface RuleAutomationListParams extends RulePaginationParams {
  /** Full-text search by name */
  query?: string;
  /** Filter by active status */
  active?: boolean;
  /** Filter by message type: 1 = email, 2 = text_message */
  message_type?: 1 | 2;
}

/**
 * @deprecated Use {@link RuleAutomationListParams} instead.
 */
export interface RuleAutomailListParams extends RuleAutomationListParams {}

export type RuleAutomationListResponse = RuleListResponse<RuleAutomation>;

/**
 * @deprecated Use {@link RuleAutomationListResponse} instead.
 */
export type RuleAutomailListResponse = RuleAutomationListResponse;
