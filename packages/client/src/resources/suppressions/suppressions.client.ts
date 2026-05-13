/**
 * Suppressions namespace client.
 *
 * Wraps the v3 `/suppressions/` endpoint. Both create and delete are
 * asynchronous (HTTP 204) — the API processes the request in the background
 * and optionally invokes a `callback_url` when complete.
 */

import { RuleConfigError } from '@rulecom/core';

import { BaseResource } from '../../core/base-resource.js';
import type { RuleApiResponse } from '../../shared.types.js';

import type { RuleSuppressionRequest } from './suppressions.types.js';

const MAX_SUBSCRIBERS_PER_REQUEST = 1000;

export class SuppressionsClient extends BaseResource {
  /**
   * Create suppressions to prevent subscribers from receiving marketing
   * sendouts.
   *
   * Already-suppressed subscribers are silently skipped (idempotent).
   * A maximum of 1000 subscribers can be included per request.
   *
   * @param request - Suppression request with subscriber identifiers and
   *   optional `message_types` filter / `callback_url`.
   * @returns A success response (actual processing happens asynchronously).
   * @throws {RuleConfigError} If the `subscribers` array is empty or contains
   *   more than 1000 items.
   *
   * @example
   * ```typescript
   * // Suppress all channels for two subscribers
   * await client.suppressions.create({
   *   subscribers: [
   *     { email: 'user1@example.com' },
   *     { email: 'user2@example.com' },
   *   ],
   * });
   *
   * // Suppress only email channel with a callback
   * await client.suppressions.create({
   *   subscribers: [{ email: 'user@example.com' }],
   *   message_types: ['email'],
   *   callback_url: 'https://example.com/webhook/suppression-done',
   * });
   * ```
   */
  async create(request: RuleSuppressionRequest): Promise<RuleApiResponse> {
    validateRequest(request);
    await this.transport.fetchRaw('POST', '/suppressions/', {
      body: JSON.stringify(request),
    });

    return { success: true };
  }

  /**
   * Delete suppressions to allow subscribers to receive marketing sendouts
   * again.
   *
   * If `message_types` is omitted, all channel suppressions are removed for
   * the specified subscribers.
   *
   * @param request - Unsuppression request with subscriber identifiers and
   *   optional filters.
   * @returns A success response (actual processing happens asynchronously).
   * @throws {RuleConfigError} If the `subscribers` array is empty or contains
   *   more than 1000 items.
   *
   * @example
   * ```typescript
   * // Remove all suppressions for a subscriber
   * await client.suppressions.delete({
   *   subscribers: [{ email: 'user@example.com' }],
   * });
   *
   * // Remove only text_message suppression with a callback
   * await client.suppressions.delete({
   *   subscribers: [{ email: 'user@example.com' }],
   *   message_types: ['text_message'],
   *   callback_url: 'https://example.com/webhook/unsuppression-done',
   * });
   * ```
   */
  async delete(request: RuleSuppressionRequest): Promise<RuleApiResponse> {
    validateRequest(request);
    await this.transport.fetchRaw('DELETE', '/suppressions/', {
      body: JSON.stringify(request),
    });

    return { success: true };
  }
}

function validateRequest(request: RuleSuppressionRequest): void {
  if (!request.subscribers.length) {
    throw new RuleConfigError('subscribers array must not be empty');
  }

  if (request.subscribers.length > MAX_SUBSCRIBERS_PER_REQUEST) {
    throw new RuleConfigError('subscribers array must not exceed 1000 items');
  }
}
