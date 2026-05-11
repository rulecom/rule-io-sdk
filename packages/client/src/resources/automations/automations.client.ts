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
   * @param automation - Automation create request (name, optional trigger,
   *   optional sendout_type, etc.).
   * @returns The created automation.
   *
   * @see https://app.rule.io/redoc/v3#tag/New-Editor.-Automail/operation/AutomailCreate
   */
  create(automation: RuleAutomationCreateRequest): Promise<RuleAutomationResponse> {
    return this.transport.post<RuleAutomationResponse>('/editor/automail', {
      body: JSON.stringify(automation),
    });
  }

  /**
   * Get an automation by ID.
   *
   * @param id - Automation ID.
   * @returns The automation, or `null` if no automation with that ID exists
   *   (HTTP 404).
   */
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
   * The API error messages incorrectly suggest lowercase, but uppercase is
   * required.
   *
   * @param id - Automation ID.
   * @param update - Partial update request (all fields optional).
   * @returns The updated automation.
   *
   * @example
   * ```typescript
   * // Partial update — only change the name
   * await client.automations.update(123, { name: 'New Name' });
   *
   * // Full update
   * await client.automations.update(123, {
   *   name: 'New Name',
   *   active: true,
   *   trigger: { type: 'TAG', id: 42 },
   *   sendout_type: 2,
   * });
   * ```
   */
  update(
    id: number,
    update: Partial<RuleAutomationUpdateRequest>
  ): Promise<RuleAutomationResponse> {
    return this.transport.put<RuleAutomationResponse>(`/editor/automail/${id}`, {
      body: JSON.stringify(update),
    });
  }

  /**
   * Delete an automation.
   *
   * @param id - Automation ID.
   * @returns A success response.
   */
  delete(id: number): Promise<RuleApiResponse> {
    return this.transport.delete<RuleApiResponse>(`/editor/automail/${id}`);
  }

  /**
   * List automations with optional filtering and pagination.
   *
   * @param params - Optional query parameters for filtering and pagination.
   * @returns List of automations.
   *
   * @example
   * ```typescript
   * // List all automations
   * const all = await client.automations.list();
   *
   * // List active email automations, page 2
   * const filtered = await client.automations.list({
   *   active: true,
   *   message_type: 1,
   *   page: 2,
   *   per_page: 20,
   * });
   * ```
   */
  list(params?: RuleAutomationListParams): Promise<RuleAutomationListResponse> {
    const qs = params ? buildQueryString({ ...params }) : '';

    return this.transport.get<RuleAutomationListResponse>(`/editor/automail${qs}`);
  }
}
