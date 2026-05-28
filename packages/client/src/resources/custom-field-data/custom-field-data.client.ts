/**
 * @deprecated Use `client.subscribers.*` methods instead:
 *   `listCustomFieldData`, `writeCustomFieldData`, `patchCustomFieldData`,
 *   `listCustomFieldDataByGroup`, `deleteCustomFieldDataByGroup`, `findCustomFieldData`.
 */

import type { RuleApiResponse } from '../../shared.types.js';

import type {
  ListCustomFieldDataParams,
  CustomFieldDataListResult,
  WriteCustomFieldDataPayload,
  PatchCustomFieldDataPayload,
  ListCustomFieldDataByGroupParams,
  CustomFieldDataResult,
  SearchCustomFieldDataParams,
} from '../subscribers/subscribers.types.js';
import type { SubscribersClient } from '../subscribers/subscribers.client.js';

/** @deprecated Use `client.subscribers.*` methods instead. */
export class CustomFieldDataClient {
  constructor(private readonly subscribers: SubscribersClient) {}

  /** @deprecated Use `client.subscribers.listCustomFieldData()` instead. */
  list(
    subscriberId: number,
    params?: ListCustomFieldDataParams
  ): Promise<CustomFieldDataListResult> {
    return this.subscribers.listCustomFieldData(subscriberId, params);
  }

  /** @deprecated Use `client.subscribers.writeCustomFieldData()` instead. */
  create(
    subscriberId: number,
    body: WriteCustomFieldDataPayload
  ): Promise<RuleApiResponse> {
    return this.subscribers.writeCustomFieldData(subscriberId, body);
  }

  /** @deprecated Use `client.subscribers.patchCustomFieldData()` instead. */
  update(
    subscriberId: number,
    request: PatchCustomFieldDataPayload
  ): Promise<RuleApiResponse> {
    return this.subscribers.patchCustomFieldData(subscriberId, request);
  }

  /** @deprecated Use `client.subscribers.listCustomFieldDataByGroup()` instead. */
  listByGroup(
    subscriberId: number,
    group: number | string,
    params?: ListCustomFieldDataByGroupParams
  ): Promise<CustomFieldDataListResult> {
    return this.subscribers.listCustomFieldDataByGroup(subscriberId, group, params);
  }

  /** @deprecated Use `client.subscribers.deleteCustomFieldDataByGroup()` instead. */
  deleteByGroup(
    subscriberId: number,
    group: number | string
  ): Promise<RuleApiResponse> {
    return this.subscribers.deleteCustomFieldDataByGroup(subscriberId, group);
  }

  /** @deprecated Use `client.subscribers.findCustomFieldData()` instead. */
  search(
    subscriberId: number,
    params: SearchCustomFieldDataParams
  ): Promise<CustomFieldDataResult | null> {
    return this.subscribers.findCustomFieldData(subscriberId, params);
  }
}
