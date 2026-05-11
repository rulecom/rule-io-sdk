/**
 * Template types (v3 `/editor/template` endpoint).
 */

import type { RcmlDocument } from '@rule-io/rcml';

import type {
  RuleApiResponse,
  RuleListResponse,
  RulePaginationParams,
} from '../../shared.types.js';

/** Template represents an RCML email template in Rule.io's new editor. */
export interface RuleTemplate {
  id?: number;
  name: string;
  content: RcmlDocument;
}

export interface RuleTemplateCreateRequest {
  message_id: number;
  name: string;
  message_type: 'email' | 'sms';
  template: RcmlDocument;
}

export interface RuleTemplateResponse extends RuleApiResponse {
  data?: RuleTemplate;
}

/** Query parameters for listing templates. */
export type RuleTemplateListParams = RulePaginationParams;

export type RuleTemplateListResponse = RuleListResponse<RuleTemplate>;

/** Query parameters for rendering a template. */
export interface RuleRenderTemplateParams {
  /** If provided, merge tags are substituted with the subscriber's field values */
  subscriber_id?: number;
}
