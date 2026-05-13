/**
 * Automations namespace client.
 *
 * Wraps the v3 `/editor/automail` endpoints. The "Automail" terminology used
 * by the underlying API is hidden — consumers see only "Automation".
 */

import { RuleApiError, RuleConfigError } from '@rule-io/core';

import { BaseResource } from '../../core/base-resource.js';
import { buildQueryString } from '../../core/query-string.js';
import type { RuleApiResponse } from '../../shared.types.js';

import type {
  RuleAutomationCreateRequest,
  RuleAutomationListParams,
  RuleAutomationListResponse,
  RuleAutomationResponse,
  RuleAutomationUpdateRequest,
  RuleSendoutType,
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
  async update(
    id: number,
    update: Partial<RuleAutomationUpdateRequest>
  ): Promise<RuleAutomationResponse> {
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
    if (
      update.name != null &&
      update.active != null &&
      update.trigger != null &&
      updateSendout != null
    ) {
      return this.transport.put<RuleAutomationResponse>(`/editor/automail/${id}`, {
        body: JSON.stringify({
          name: update.name,
          active: update.active,
          trigger: update.trigger,
          sendout_type: updateSendout,
        }),
      });
    }

    // Slow path: read-modify-write to satisfy the API's full-body PUT
    // requirement when caller passes a partial update.
    const existing = await this.get(id);

    if (existing === null) {
      throw new RuleApiError(`Automation ${id} not found`, 404);
    }

    if (!existing.data) {
      const detail = existing.error ?? existing.message ?? 'response had no data';

      throw new RuleApiError(
        `Cannot update automation ${id}: unexpected response from get (${detail})`,
        500
      );
    }

    const current = existing.data;
    const currentSendout = toNumericSendout(current.sendout_type);

    const trigger = update.trigger ?? current.trigger;
    const sendoutType = updateSendout ?? currentSendout;
    const active = update.active ?? current.active;

    if (!trigger) {
      throw new RuleConfigError(
        `Cannot update automation ${id}: existing record has no trigger and update did not provide one`
      );
    }

    if (sendoutType == null) {
      throw new RuleConfigError(
        `Cannot update automation ${id}: existing record has no sendout_type and update did not provide one`
      );
    }

    if (active == null) {
      throw new RuleConfigError(
        `Cannot update automation ${id}: existing record has no active state and update did not provide one`
      );
    }

    const fullBody: RuleAutomationUpdateRequest = {
      name: update.name ?? current.name,
      active,
      trigger,
      sendout_type: sendoutType,
    };

    return this.transport.put<RuleAutomationResponse>(`/editor/automail/${id}`, {
      body: JSON.stringify(fullBody),
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
