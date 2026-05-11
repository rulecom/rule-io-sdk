/**
 * Subscribers namespace client.
 *
 * Combines the historical v2 subscriber endpoints (sync, get, getFields,
 * getTagNames) with the v3 endpoints (create, delete, addTags, removeTag,
 * bulk operations, block/unblock). Where v2 and v3 cover the same operation
 * the v3 endpoint is used; v2 endpoints are retained only when no v3
 * equivalent exists.
 */

import { RuleApiError, RuleConfigError } from '@rule-io/core';

import { BaseResource } from '../../core/base-resource.js';
import type { HttpTransport } from '../../core/transport.js';
import type { RuleApiResponse } from '../../shared.types.js';

import type {
  RuleBulkSubscriberIdentifier,
  RuleBulkTagsRequest,
  RuleSubscriber,
  RuleSubscriberFieldsResponse,
  RuleSubscriberResponse,
  RuleSubscriberTagsResponse,
  RuleSubscriberTagsV3Request,
  RuleSubscriberV3CreateRequest,
  RuleSubscriberV3Response,
} from './subscribers.types.js';

export type SubscriberIdentifierBy = 'id' | 'email' | 'phone_number' | 'custom_identifier';

export class SubscribersClient extends BaseResource {
  constructor(
    transport: HttpTransport,
    private readonly fieldGroupPrefix: string
  ) {
    super(transport);
  }

  // ── v3 endpoints (primary API) ─────────────────────────────────────────────

  /**
   * Create a subscriber via the v3 API.
   *
   * @example
   * ```typescript
   * const result = await client.subscribers.create({
   *   email: 'customer@example.com',
   *   status: 'ACTIVE',
   *   language: 'sv',
   * });
   * ```
   */
  create(subscriber: RuleSubscriberV3CreateRequest): Promise<RuleSubscriberV3Response> {
    return this.transport.post<RuleSubscriberV3Response>('/subscribers', {
      body: JSON.stringify(subscriber),
    });
  }

  /**
   * Delete a subscriber via the v3 API. Returns `{ success: true }` on
   * successful deletion (HTTP 204).
   */
  async delete(
    subscriber: string | number,
    identifiedBy: SubscriberIdentifierBy = 'email'
  ): Promise<RuleApiResponse> {
    await this.transport.fetchRaw(
      'DELETE',
      `/subscribers/${encodeURIComponent(subscriber)}?identified_by=${identifiedBy}`
    );

    return { success: true };
  }

  /**
   * Block multiple subscribers in bulk via the v3 API.
   *
   * Asynchronous (HTTP 204) — Rule.io processes the block in the background.
   */
  async block(
    subscribers: RuleBulkSubscriberIdentifier[],
    callbackUrl?: string
  ): Promise<RuleApiResponse> {
    const payload: Record<string, unknown> = { subscribers };

    if (callbackUrl) payload.callback_url = callbackUrl;
    await this.transport.fetchRaw('POST', '/subscribers/block', {
      body: JSON.stringify(payload),
    });

    return { success: true };
  }

  /**
   * Unblock multiple subscribers in bulk via the v3 API.
   *
   * Asynchronous (HTTP 204) — Rule.io processes the unblock in the background.
   */
  async unblock(
    subscribers: RuleBulkSubscriberIdentifier[],
    callbackUrl?: string
  ): Promise<RuleApiResponse> {
    const payload: Record<string, unknown> = { subscribers };

    if (callbackUrl) payload.callback_url = callbackUrl;
    await this.transport.fetchRaw('POST', '/subscribers/unblock', {
      body: JSON.stringify(payload),
    });

    return { success: true };
  }

  /**
   * Add tags to multiple subscribers in bulk via the v3 API.
   *
   * Asynchronous (HTTP 204).
   */
  async bulkAddTags(request: RuleBulkTagsRequest): Promise<RuleApiResponse> {
    await this.transport.fetchRaw('POST', '/subscribers/tags', {
      body: JSON.stringify(request),
    });

    return { success: true };
  }

  /**
   * Remove tags from multiple subscribers in bulk via the v3 API.
   *
   * Asynchronous (HTTP 204). Sends a DELETE request with a JSON body.
   */
  async bulkRemoveTags(request: RuleBulkTagsRequest): Promise<RuleApiResponse> {
    await this.transport.fetchRaw('DELETE', '/subscribers/tags', {
      body: JSON.stringify(request),
    });

    return { success: true };
  }

  /**
   * Add tags to a single subscriber via the v3 API.
   *
   * Supports automation triggering and optional subscriber sync.
   */
  async addTags(
    subscriber: string | number,
    request: RuleSubscriberTagsV3Request,
    identifiedBy: SubscriberIdentifierBy = 'email'
  ): Promise<RuleApiResponse> {
    await this.transport.fetchRaw(
      'PUT',
      `/subscribers/${encodeURIComponent(subscriber)}/tags?identified_by=${identifiedBy}`,
      { body: JSON.stringify(request) }
    );

    return { success: true };
  }

  /** Remove a single tag from a subscriber via the v3 API. */
  async removeTag(
    subscriber: string | number,
    tag: string | number,
    identifiedBy: SubscriberIdentifierBy = 'email'
  ): Promise<RuleApiResponse> {
    await this.transport.fetchRaw(
      'DELETE',
      `/subscribers/${encodeURIComponent(subscriber)}/tags/${encodeURIComponent(String(tag))}?identified_by=${identifiedBy}`
    );

    return { success: true };
  }

  // ── v2 endpoints (no v3 equivalent) ────────────────────────────────────────

  /**
   * Create or update a subscriber via the v2 `/subscribers` endpoint.
   *
   * The configured `fieldGroupPrefix` is prepended to every field key before
   * the request is sent (e.g. `{ FirstName: 'Anna' }` →
   * `{ key: 'Booking.FirstName', value: 'Anna' }`). Throws
   * {@link RuleConfigError} if a field key already contains a dot.
   *
   * @example
   * ```typescript
   * await client.subscribers.sync({
   *   email: 'customer@example.com',
   *   fields: { FirstName: 'Anna', OrderRef: 'ORD-456' },
   *   tags: ['OrderCompleted', 'Newsletter'],
   * });
   * ```
   */
  async sync(subscriber: RuleSubscriber): Promise<RuleSubscriberResponse> {
    if (subscriber.fields) {
      const dottedKey = Object.keys(subscriber.fields).find((k) => k.includes('.'));

      if (dottedKey) {
        throw new RuleConfigError(
          `Field key "${dottedKey}" contains a dot. Pass bare field names (e.g. "${dottedKey.split('.').pop()}") — the SDK adds the group prefix automatically.`
        );
      }
    }

    const fields = subscriber.fields
      ? Object.entries(subscriber.fields)
          .filter(([, value]) => value !== undefined && value !== '')
          .map(([key, value]) => ({
            key: `${this.fieldGroupPrefix}.${key}`,
            value: String(value),
          }))
      : [];

    const payload = {
      update_on_duplicate: true,
      tags: subscriber.tags || [],
      subscribers: {
        email: subscriber.email,
        fields,
      },
    };

    return this.transport.post<RuleSubscriberResponse>('/subscribers', {
      version: 'v2',
      body: JSON.stringify(payload),
    });
  }

  /** Get subscriber details. Returns null on 404. */
  async get(email: string): Promise<RuleSubscriberResponse | null> {
    try {
      return await this.transport.get<RuleSubscriberResponse>(
        `/subscribers/${encodeURIComponent(email)}?identified_by=email`,
        { version: 'v2' }
      );
    } catch (error) {
      if (error instanceof RuleApiError && error.statusCode === 404) {
        return null;
      }

      throw error;
    }
  }

  /**
   * Get a subscriber's custom-field values, flattened to a `Group.Field` map.
   * Returns an empty object on 404.
   *
   * Note: Uses the `/subscriber/` (singular) endpoint, not `/subscribers/`.
   */
  async getFields(email: string): Promise<Record<string, string | null>> {
    try {
      const response = await this.transport.get<RuleSubscriberFieldsResponse>(
        `/subscriber/${encodeURIComponent(email)}/fields?identified_by=email`,
        { version: 'v2' }
      );
      const fields: Record<string, string | null> = {};

      for (const group of response.groups || []) {
        for (const field of group.fields) {
          fields[`${group.name}.${field.name}`] = field.value;
        }
      }

      return fields;
    } catch (error) {
      if (error instanceof RuleApiError && error.statusCode === 404) {
        return {};
      }

      throw error;
    }
  }

  /**
   * Get the names of every tag attached to a subscriber. Returns an empty
   * array on 404.
   */
  async getTagNames(email: string): Promise<string[]> {
    try {
      const response = await this.transport.get<RuleSubscriberTagsResponse>(
        `/subscribers/${encodeURIComponent(email)}/tags?identified_by=email`,
        { version: 'v2' }
      );

      return response.tags?.map((t) => t.name) ?? [];
    } catch (error) {
      if (error instanceof RuleApiError && error.statusCode === 404) {
        return [];
      }

      throw error;
    }
  }
}
