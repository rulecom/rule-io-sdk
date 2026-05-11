/**
 * Suppressions namespace client.
 *
 * Wraps the v3 `/suppressions/` endpoint. Both create and delete are
 * asynchronous (HTTP 204) — the API processes the request in the background
 * and optionally invokes a `callback_url` when complete.
 */

import { RuleConfigError } from '@rule-io/core';

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
