/**
 * Automations namespace client.
 *
 * Wraps the v3 `/editor/automail` endpoints. The "Automail" terminology used
 * by the underlying API is hidden — consumers see only "Automation".
 */

import { RuleApiError } from '@rule-io/core';

import { BaseResource } from '../../core/base-resource.js';
import { buildQueryString } from '../../core/query-string.js';
import type { RuleApiResponse } from '../../shared.types.js';

import type {
  RuleAutomationCreateRequest,
  RuleAutomationListParams,
  RuleAutomationListResponse,
  RuleAutomationResponse,
  RuleAutomationUpdateRequest,
} from './automations.types.js';

export class AutomationsClient extends BaseResource {
  /**
   * Create an automation. Trigger and sendout_type can be set directly on
   * creation.
   *
   * @see https://app.rule.io/redoc/v3#tag/New-Editor.-Automail/operation/AutomailCreate
   */
  create(automation: RuleAutomationCreateRequest): Promise<RuleAutomationResponse> {
    return this.transport.post<RuleAutomationResponse>('/editor/automail', {
      body: JSON.stringify(automation),
    });
  }

  /** Get an automation by ID. Returns null on 404. */
  async get(id: number): Promise<RuleAutomationResponse | null> {
    try {
      return await this.transport.get<RuleAutomationResponse>(`/editor/automail/${id}`);
    } catch (error) {
      if (error instanceof RuleApiError && error.statusCode === 404) {
        return null;
      }

      throw error;
    }
  }

  /**
   * Update an automation. Supports partial updates — only include the fields
   * you want to change.
   *
   * IMPORTANT: The trigger.type must be uppercase ("TAG" or "SEGMENT").
   * The API error messages incorrectly suggest lowercase, but uppercase is required.
   */
  update(
    id: number,
    update: Partial<RuleAutomationUpdateRequest>
  ): Promise<RuleAutomationResponse> {
    return this.transport.put<RuleAutomationResponse>(`/editor/automail/${id}`, {
      body: JSON.stringify(update),
    });
  }

  /** Delete an automation. */
  delete(id: number): Promise<RuleApiResponse> {
    return this.transport.delete<RuleApiResponse>(`/editor/automail/${id}`);
  }

  /** List automations with optional filtering and pagination. */
  list(params?: RuleAutomationListParams): Promise<RuleAutomationListResponse> {
    const qs = params ? buildQueryString({ ...params }) : '';

    return this.transport.get<RuleAutomationListResponse>(`/editor/automail${qs}`);
  }
}
