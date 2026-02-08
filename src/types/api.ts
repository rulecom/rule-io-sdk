/**
 * Rule.io API Types
 *
 * Types for API requests and responses for both v2 and v3 APIs.
 */

// ============================================================================
// Base API Types
// ============================================================================

export interface RuleApiResponse {
  success?: boolean;
  error?: string;
  message?: string;
}

// ============================================================================
// v2 Subscriber API Types
// ============================================================================

/**
 * Subscriber fields to sync to Rule.io.
 *
 * Keys are field names (e.g., 'FirstName', 'OrderRef').
 * The client prepends the configured `fieldGroupPrefix` (default: 'Booking')
 * to create the full Rule.io field key (e.g., 'Booking.FirstName').
 */
export interface RuleSubscriberFields {
  [key: string]: string | number | undefined;
}

export interface RuleSubscriber {
  email: string;
  fields?: RuleSubscriberFields;
  tags?: string[];
}

export interface RuleSubscriberResponse extends RuleApiResponse {
  subscriber?: {
    id: string;
    email: string;
    tags?: Array<{ id: number; name: string }>;
  };
}

export interface RuleSubscriberFieldsResponse extends RuleApiResponse {
  groups?: Array<{
    name: string;
    fields: Array<{ name: string; value: string | null }>;
  }>;
}

export interface RuleSubscriberTagsResponse extends RuleApiResponse {
  tags?: Array<{ name: string }>;
}

// ============================================================================
// v2 Tags API Types
// ============================================================================

export interface RuleTag {
  id: number;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface RuleTagsResponse extends RuleApiResponse {
  tags?: RuleTag[];
}

// ============================================================================
// v3 Editor API Types - Automail
// ============================================================================

/**
 * Trigger configuration for an automail.
 * Note: The type field must be uppercase ("TAG" or "SEGMENT") despite
 * the API error messages suggesting lowercase.
 */
export interface RuleAutomailTrigger {
  type: 'TAG' | 'SEGMENT';
  id: number;
  name?: string;
}

/**
 * Sendout type for an automail.
 * - 1: Campaign (marketing emails)
 * - 2: Transactional (order confirmations, receipts, etc.)
 */
export type RuleSendoutType = 1 | 2;

/**
 * Automail represents an automation workflow in Rule.io's new editor
 */
export interface RuleAutomail {
  id?: number;
  name: string;
  description?: string;
  active?: boolean;
  trigger?: RuleAutomailTrigger | null;
  sendout_type?: {
    value: number;
    key: string;
    description: string;
  };
}

export interface RuleAutomailCreateRequest {
  name: string;
  description?: string;
}

/**
 * Request to update an automail with trigger and sendout type.
 * The trigger.type must be uppercase ("TAG" or "SEGMENT").
 */
export interface RuleAutomailUpdateRequest {
  name: string;
  active: boolean;
  trigger: RuleAutomailTrigger;
  sendout_type: RuleSendoutType;
}

export interface RuleAutomailResponse extends RuleApiResponse {
  data?: RuleAutomail;
}

// ============================================================================
// v3 Editor API Types - Message
// ============================================================================

/**
 * Message represents email content in Rule.io's new editor
 */
export interface RuleMessage {
  id?: number;
  name: string;
  subject: string;
  preheader?: string;
  from_name?: string;
  from_email?: string;
  reply_to?: string;
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

// ============================================================================
// v3 Editor API Types - Template
// ============================================================================

import type { RCMLDocument } from './rcml';

/**
 * Template represents an RCML email template in Rule.io's new editor
 */
export interface RuleTemplate {
  id?: number;
  name: string;
  content: RCMLDocument;
}

export interface RuleTemplateCreateRequest {
  message_id: number;
  name: string;
  message_type: 'email' | 'sms';
  template: RCMLDocument;
}

export interface RuleTemplateResponse extends RuleApiResponse {
  data?: RuleTemplate;
}

// ============================================================================
// v3 Editor API Types - Dynamic Set
// ============================================================================

/**
 * Dynamic Set connects a message with a template
 */
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

// ============================================================================
// Client Configuration
// ============================================================================

export interface RuleClientConfig {
  apiKey: string;
  /** Base URL for v2 API (default: https://app.rule.io/api/v2) */
  baseUrlV2?: string;
  /** Base URL for v3 API (default: https://app.rule.io/api/v3) */
  baseUrlV3?: string;
  /** Custom fetch implementation for testing */
  fetch?: typeof fetch;
  /** Enable debug logging */
  debug?: boolean;
  /**
   * Group prefix for subscriber custom fields (default: 'Booking').
   * Fields are sent as `{prefix}.{fieldName}` (e.g., 'Booking.FirstName').
   */
  fieldGroupPrefix?: string;
}

export interface CreateAutomationEmailConfig {
  name: string;
  description?: string;
  triggerType: 'tag' | 'segment' | 'event';
  triggerValue: string;
  subject: string;
  preheader?: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  delayInSeconds?: string;
  /**
   * Sendout type for the automation.
   * - 1: Campaign (marketing emails)
   * - 2: Transactional (order confirmations, receipts, etc.) - DEFAULT
   */
  sendoutType?: RuleSendoutType;
  template: RCMLDocument;
}

export interface CreateAutomationEmailResult {
  automailId: number;
  messageId: number;
  templateId: number;
  dynamicSetId: number;
}
