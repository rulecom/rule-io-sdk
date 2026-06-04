/**
 * Rule.io API Client
 *
 * Public entry point for the SDK. The root `RuleClient` is a thin composition
 * root: it owns the shared `HttpTransport` and exposes one lazy namespace
 * getter per API resource (subscribers, tags, automations, …). Every
 * previously-public flat method on `RuleClient` is preserved here as a
 * `@deprecated` wrapper that delegates to the namespaced API. This keeps
 * existing call sites compiling while providing a clear migration path.
 *
 * ## API Quirks (Important!)
 *
 * 1. **Trigger type must be UPPERCASE**: When setting automation triggers,
 *    use "TAG" or "SEGMENT" (uppercase), not "tag" or "segment".
 *    The API error message incorrectly suggests lowercase.
 *
 * 2. **Automation creation accepts trigger on POST**: Trigger and sendout_type
 *    can be set directly on POST /editor/automail. No separate update needed.
 *
 * 3. **Template names must be unique**: Add timestamp to avoid conflicts.
 *
 * 4. **Tag ID required**: Triggers use tag ID (number), not tag name.
 *    Look up IDs via `client.tags.list()`.
 */

import { RuleApiError, RuleClientError } from './errors.js';

import { BaseResource } from './core/base-resource.js';
import { HttpTransport } from './core/transport.js';
import { resolveConfig, type ResolvedClientConfig, type RuleClientConfig } from './config.js';

import { AnalyticsClient } from './resources/analytics/analytics.client.js';
import { ApiKeysClient } from './resources/api-keys/api-keys.client.js';
import { AutomationsClient } from './resources/automations/automations.client.js';
import { BrandStylesClient } from './resources/brand-styles/brand-styles.client.js';
import { CampaignsClient } from './resources/campaigns/campaigns.client.js';
import { CustomFieldDataClient } from './resources/custom-field-data/custom-field-data.client.js';
import { DynamicSetsClient } from './resources/dynamic-sets/dynamic-sets.client.js';
import { ExportsClient } from './resources/exports/exports.client.js';
import { MessagesClient } from './resources/messages/messages.client.js';
import { RecipientsClient } from './resources/recipients/recipients.client.js';
import { SubscribersClient } from './resources/subscribers/subscribers.client.js';
import { SuppressionsClient } from './resources/suppressions/suppressions.client.js';
import { TagsClient } from './resources/tags/tags.client.js';
import { TemplatesClient } from './resources/templates/templates.client.js';

import { buildDefaultBrandedTemplate } from './default-branded-template.js';

import type { RuleApiResponse } from './shared.types.js';
import type {
  RuleAnalyticsParams,
  RuleAnalyticsResponse,
} from './resources/analytics/analytics.types.js';
import type {
  RuleApiKeyCreateRequest,
  RuleApiKeyListResponse,
  RuleApiKeyResponse,
  RuleApiKeyUpdateRequest,
} from './resources/api-keys/api-keys.types.js';
import type {
  RuleAutomationCreateRequest,
  RuleAutomationListParams,
  RuleAutomationListResponse,
  RuleAutomationResponse,
  RuleAutomationUpdateRequest,
} from './resources/automations/automations.types.js';
import type {
  RuleBrandStyleCreateRequest,
  RuleBrandStyleFromDomainRequest,
  RuleBrandStyleListResponse,
  RuleBrandStyleResponse,
  RuleBrandStyleUpdateRequest,
} from './resources/brand-styles/brand-styles.types.js';
import type {
  WriteCustomFieldDataPayload,
  PatchCustomFieldDataPayload,
  ListCustomFieldDataByGroupParams,
  ListCustomFieldDataParams,
  CustomFieldDataListResult,
  SearchCustomFieldDataParams,
  CustomFieldDataResult,
  CustomFieldGroupDataRecord,
} from './resources/subscribers/subscribers.types.js';
import type {
  RuleExportDispatcherParams,
  RuleExportDispatcherResponse,
  RuleExportStatisticsParams,
  RuleExportStatisticsResponse,
  RuleExportSubscriberParams,
  RuleExportSubscriberResponse,
} from './resources/exports/exports.types.js';
import type {
  RuleRecipientSubscriberListResponse,
  RuleRecipientTagListResponse,
  RuleRecipientsListParams,
  RuleSegmentListResponse,
} from './resources/recipients/recipients.types.js';
import type {
  Subscriber,
  SubscriberIdentifier,
  SubscriberTag,
  BulkTagsPayload,
  CreateSubscriberPayload,
} from './resources/subscribers/subscribers.types.js';
import type { RuleSuppressionRequest } from './resources/suppressions/suppressions.types.js';
import type { RuleTagsResponse } from './resources/tags/tags.types.js';
import type {
  CreateAutomationEmailConfig,
  CreateAutomationEmailResult,
  CreateCampaignEmailConfig,
  CreateCampaignEmailResult,
} from './orchestration.types.js';
import { CustomFieldClient } from './resources/custom-field/custom-field.client.js';

type V2SubscriberIdentifierBy = 'id' | 'email' | 'phone_number' | 'custom_identifier';

/**
 * Rule.io API Client.
 *
 * @example
 * ```typescript
 * const client = new RuleClient({ apiKey: process.env.RULE_API_KEY! });
 *
 * // Namespaced (recommended) API:
 * await client.subscribers.create({ email: 'a@b.c', status: 'ACTIVE' });
 * await client.automations.list({ active: true });
 * await client.brandStyles.get(42);
 * await client.recipients.segments.list();
 *
 * // Flat API (deprecated, kept for back-compat):
 * await client.createAutomation({ name: 'Welcome' });
 * await client.syncSubscriber({ email: 'a@b.c', tags: ['Newsletter'] }, 'Booking');
 * ```
 */
export class RuleClient extends BaseResource {
  private readonly resolvedConfig: ResolvedClientConfig;

  constructor(config: RuleClientConfig | string) {
    const resolved = resolveConfig(config);

    super(new HttpTransport(resolved));
    this.resolvedConfig = resolved;
  }

  /** Get the API key (useful for passing to other functions). */
  getApiKey(): string {
    return this.resolvedConfig.apiKey;
  }

  // ── Namespaced API (lazy singletons) ───────────────────────────────────────

  get subscribers(): SubscribersClient {
    return this.lazy(
      'subscribers',
      () => new SubscribersClient(this.transport)
    );
  }

  get tags(): TagsClient {
    return this.lazy('tags', () => new TagsClient(this.transport));
  }

  get automations(): AutomationsClient {
    return this.lazy('automations', () => new AutomationsClient(this.transport));
  }

  get messages(): MessagesClient {
    return this.lazy('messages', () => new MessagesClient(this.transport));
  }

  get templates(): TemplatesClient {
    return this.lazy('templates', () => new TemplatesClient(this.transport));
  }

  get dynamicSets(): DynamicSetsClient {
    return this.lazy('dynamicSets', () => new DynamicSetsClient(this.transport));
  }

  get campaigns(): CampaignsClient {
    return this.lazy('campaigns', () => new CampaignsClient(this.transport));
  }

  get suppressions(): SuppressionsClient {
    return this.lazy('suppressions', () => new SuppressionsClient(this.transport));
  }

  get brandStyles(): BrandStylesClient {
    return this.lazy('brandStyles', () => new BrandStylesClient(this.transport));
  }

  get apiKeys(): ApiKeysClient {
    return this.lazy('apiKeys', () => new ApiKeysClient(this.transport));
  }

  get exports(): ExportsClient {
    return this.lazy('exports', () => new ExportsClient(this.transport));
  }

  get analytics(): AnalyticsClient {
    return this.lazy('analytics', () => new AnalyticsClient(this.transport));
  }

  get recipients(): RecipientsClient {
    return this.lazy('recipients', () => new RecipientsClient(this.transport));
  }

  /** @deprecated Use `client.subscribers.listCustomFieldData()`, `writeCustomFieldData()`, etc. instead. */
  get customFieldData(): CustomFieldDataClient {
    return this.lazy('customFieldData', () => new CustomFieldDataClient(this.subscribers));
  }

  get customField(): CustomFieldClient {
    return this.lazy('customField', () => new CustomFieldClient(this.transport));
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Deprecated flat API — back-compat layer.
  //
  // Each method delegates to the corresponding namespaced client. v2-only
  // wrappers that overlap with v3 namespace methods (e.g. `addSubscriberTags`
  // is v2; `subscribers.addTags` is v3) keep their own thin v2 implementation
  // so the observable HTTP behavior of the deprecated method is unchanged.
  // ──────────────────────────────────────────────────────────────────────────

  // ── Subscribers — v2 ──────────────────────────────────────────────────────

  /** @deprecated Use `client.subscribers.sync({ subscriber: { email }, customFieldData, tags })` instead. */
  syncSubscriber(
    subscriber: { email: string; fields?: Record<string, string | number | undefined>; tags?: string[] },
    fieldGroupPrefix: string
  ): Promise<Subscriber> {
    return this.subscribers.sync({
      subscriber: { email: subscriber.email },
      tags: subscriber.tags,
      ...(subscriber.fields ? { customFieldData: { [fieldGroupPrefix]: subscriber.fields } } : {}),
    });
  }

  /** @deprecated Use `client.subscribers.getByEmail()` instead. */
  getSubscriber(email: string): Promise<Subscriber | null> {
    return this.subscribers.getByEmail(email);
  }

  /** @deprecated Use `client.subscribers.listCustomFieldData()` instead. */
  getSubscriberFields(email: string): Promise<CustomFieldGroupDataRecord | null> {
    void email;
    return Promise.reject(new Error('getSubscriberFields is no longer supported. Use client.subscribers.listCustomFieldData() instead.'));
  }

  /** @deprecated Use `client.subscribers.getSubscriberTags()` instead. */
  getSubscriberTags(email: string): Promise<SubscriberTag[] | null> {
    return this.subscribers.getSubscriberTags(email);
  }

  /**
   * Add tags to a subscriber via the v2 endpoint.
   *
   * @deprecated Use `client.subscribers.addTags()` (v3) instead.
   */
  addSubscriberTags(
    email: string,
    tags: string[],
    triggerAutomation: 'force' | 'reset' | false = 'force'
  ): Promise<RuleApiResponse> {
    const payload: Record<string, unknown> = { tags };

    if (triggerAutomation) payload.automation = triggerAutomation;

    return this.transport.post<RuleApiResponse>(
      `/subscribers/${encodeURIComponent(email)}/tags?identified_by=email`,
      { version: 'v2', body: JSON.stringify(payload) }
    );
  }

  /**
   * Remove tags from a subscriber via the v2 endpoint (one DELETE per tag).
   *
   * @deprecated Use `client.subscribers.removeSubscriberTag()` for single-tag removal,
   * or `client.subscribers.bulkRemoveSubscriberTags()` for bulk operations (both v3).
   */
  async removeSubscriberTags(
    email: string,
    tags: string[]
  ): Promise<RuleApiResponse> {
    const results = await Promise.all(
      tags.map((tag) =>
        this.transport.delete<RuleApiResponse>(
          `/subscribers/${encodeURIComponent(email)}/tags/${encodeURIComponent(tag)}?identified_by=email`,
          { version: 'v2' }
        )
      )
    );

    return { success: results.every((r) => r.success !== false) };
  }

  /**
   * Delete a subscriber via the v2 endpoint.
   *
   * @deprecated Use `client.subscribers.delete()` (v3) instead.
   */
  deleteSubscriber(email: string): Promise<RuleApiResponse> {
    return this.transport.delete<RuleApiResponse>(
      `/subscribers/${encodeURIComponent(email)}?identified_by=email`,
      { version: 'v2' }
    );
  }

  // ── Subscribers — v3 ──────────────────────────────────────────────────────

  /** @deprecated Use `client.subscribers.create()` instead. */
  createSubscriberV3(
    subscriber: CreateSubscriberPayload
  ): Promise<Subscriber> {
    return this.subscribers.create(subscriber);
  }

  /** @deprecated Use `client.subscribers.deleteByEmail()` / `deleteById()` / `deleteByPhoneNumber()` / `deleteByCustomIdentifier()` instead. */
  deleteSubscriberV3(
    subscriber: string | number,
    identifiedBy: V2SubscriberIdentifierBy = 'email'
  ): Promise<RuleApiResponse> {
    if (identifiedBy === 'id') return this.subscribers.deleteById(subscriber as number);
    if (identifiedBy === 'phone_number') return this.subscribers.deleteByPhoneNumber(subscriber as string);
    if (identifiedBy === 'custom_identifier') return this.subscribers.deleteByCustomIdentifier(subscriber as string);
    return this.subscribers.deleteByEmail(subscriber as string);
  }

  /** @deprecated Use `client.subscribers.block()` instead. */
  blockSubscribers(
    subscribers: SubscriberIdentifier[],
    callbackUrl?: string
  ): Promise<RuleApiResponse> {
    return this.subscribers.block(subscribers, callbackUrl ? { callbackUrl } : {});
  }

  /** @deprecated Use `client.subscribers.unblock()` instead. */
  unblockSubscribers(
    subscribers: SubscriberIdentifier[],
    callbackUrl?: string
  ): Promise<RuleApiResponse> {
    return this.subscribers.unblock(subscribers, callbackUrl ? { callbackUrl } : {});
  }

  /** @deprecated Use `client.subscribers.bulkAddTags()` instead. */
  bulkAddTags(request: BulkTagsPayload): Promise<RuleApiResponse> {
    return this.subscribers.bulkAddTags(request);
  }

  /** @deprecated Use `client.subscribers.bulkRemoveTags()` instead. */
  bulkRemoveTags(request: BulkTagsPayload): Promise<RuleApiResponse> {
    return this.subscribers.bulkRemoveTags(request);
  }

  /** @deprecated Use `client.subscribers.addSubscriberTags()` instead. */
  addSubscriberTagsV3(
    subscriber: string | number,
    request: { tags: (string | number)[]; automation?: 'send' | 'force' | 'reset' | null; syncSubscriber?: boolean },
    identifiedBy: V2SubscriberIdentifierBy = 'email'
  ): Promise<RuleApiResponse> {
    const id: SubscriberIdentifier =
      identifiedBy === 'id'                  ? { id: subscriber as number }
      : identifiedBy === 'phone_number'      ? { phoneNumber: String(subscriber) }
      : identifiedBy === 'custom_identifier' ? { customIdentifier: String(subscriber) }
      :                                        { email: String(subscriber) };

    const automationMap = { send: 'trigger', force: 'force', reset: 'reset' } as const;
    const automation = request.automation ? automationMap[request.automation] : undefined;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.subscribers as any)._addSubscriberTags(id, request.tags, {
      automation,
      syncSegments: request.syncSubscriber === false ? false : undefined,
    });
  }

  /** @deprecated Use `client.subscribers.removeSubscriberTag()` instead. */
  removeSubscriberTagV3(
    subscriber: string | number,
    tag: string | number,
    identifiedBy: V2SubscriberIdentifierBy = 'email'
  ): Promise<RuleApiResponse> {
    const id: SubscriberIdentifier =
      identifiedBy === 'id'                  ? { id: subscriber as number }
      : identifiedBy === 'phone_number'      ? { phoneNumber: String(subscriber) }
      : identifiedBy === 'custom_identifier' ? { customIdentifier: String(subscriber) }
      :                                        { email: String(subscriber) };

    return this.subscribers.removeSubscriberTag(id, tag);
  }

  // ── Tags ──────────────────────────────────────────────────────────────────

  /** @deprecated Use `client.tags.list()` instead. */
  getTags(): Promise<RuleTagsResponse> {
    return this.tags.list();
  }

  /** @deprecated Use `client.tags.getByName()` instead. */
  async getTagIdByName(name: string): Promise<number | null> {
    const tag = await this.tags.getByName(name);

    return tag?.id ?? null;
  }

  // ── Automations (incl. legacy `Automail` aliases) ─────────────────────────

  /** @deprecated Use `client.automations.create()` instead. */
  createAutomation(req: RuleAutomationCreateRequest): Promise<RuleAutomationResponse> {
    return this.automations.create(req);
  }

  /** @deprecated Use `client.automations.get()` instead. */
  getAutomation(id: number): Promise<RuleAutomationResponse | null> {
    return this.automations.get(id);
  }

  /** @deprecated Use `client.automations.update()` instead. */
  updateAutomation(
    id: number,
    update: Partial<RuleAutomationUpdateRequest>
  ): Promise<RuleAutomationResponse> {
    return this.automations.update(id, update);
  }

  /** @deprecated Use `client.automations.delete()` instead. */
  deleteAutomation(id: number): Promise<RuleApiResponse> {
    return this.automations.delete(id);
  }

  /** @deprecated Use `client.automations.list()` instead. */
  listAutomations(params?: RuleAutomationListParams): Promise<RuleAutomationListResponse> {
    return this.automations.list(params);
  }

  /** @deprecated Use `client.automations.create()` instead. */
  createAutomail(req: RuleAutomationCreateRequest): Promise<RuleAutomationResponse> {
    return this.automations.create(req);
  }

  /** @deprecated Use `client.automations.get()` instead. */
  getAutomail(id: number): Promise<RuleAutomationResponse | null> {
    return this.automations.get(id);
  }

  /** @deprecated Use `client.automations.update()` instead. */
  updateAutomail(
    id: number,
    update: Partial<RuleAutomationUpdateRequest>
  ): Promise<RuleAutomationResponse> {
    return this.automations.update(id, update);
  }

  /** @deprecated Use `client.automations.delete()` instead. */
  deleteAutomail(id: number): Promise<RuleApiResponse> {
    return this.automations.delete(id);
  }

  /** @deprecated Use `client.automations.list()` instead. */
  listAutomails(params?: RuleAutomationListParams): Promise<RuleAutomationListResponse> {
    return this.automations.list(params);
  }

  // ── Suppressions ──────────────────────────────────────────────────────────

  /** @deprecated Use `client.suppressions.create()` instead. */
  createSuppressions(request: RuleSuppressionRequest): Promise<RuleApiResponse> {
    return this.suppressions.create(request);
  }

  /** @deprecated Use `client.suppressions.delete()` instead. */
  deleteSuppressions(request: RuleSuppressionRequest): Promise<RuleApiResponse> {
    return this.suppressions.delete(request);
  }

  // ── Brand styles ──────────────────────────────────────────────────────────

  /** @deprecated Use `client.brandStyles.list()` instead. */
  listBrandStyles(): Promise<RuleBrandStyleListResponse> {
    return this.brandStyles.list();
  }

  /** @deprecated Use `client.brandStyles.get()` instead. */
  getBrandStyle(brandStyleId: number): Promise<RuleBrandStyleResponse | null> {
    return this.brandStyles.get(brandStyleId);
  }

  /** @deprecated Use `client.brandStyles.createFromDomain()` instead. */
  createBrandStyleFromDomain(
    request: RuleBrandStyleFromDomainRequest
  ): Promise<RuleBrandStyleResponse> {
    return this.brandStyles.createFromDomain(request);
  }

  /** @deprecated Use `client.brandStyles.createManually()` instead. */
  createBrandStyleManually(
    request: RuleBrandStyleCreateRequest
  ): Promise<RuleBrandStyleResponse> {
    return this.brandStyles.createManually(request);
  }

  /** @deprecated Use `client.brandStyles.update()` instead. */
  updateBrandStyle(
    brandStyleId: number,
    request: RuleBrandStyleUpdateRequest
  ): Promise<RuleBrandStyleResponse> {
    return this.brandStyles.update(brandStyleId, request);
  }

  /** @deprecated Use `client.brandStyles.delete()` instead. */
  deleteBrandStyle(brandStyleId: number): Promise<RuleApiResponse> {
    return this.brandStyles.delete(brandStyleId);
  }

  // ── API keys ──────────────────────────────────────────────────────────────

  /** @deprecated Use `client.apiKeys.list()` instead. */
  listApiKeys(): Promise<RuleApiKeyListResponse> {
    return this.apiKeys.list();
  }

  /** @deprecated Use `client.apiKeys.create()` instead. */
  createApiKey(request: RuleApiKeyCreateRequest): Promise<RuleApiKeyResponse> {
    return this.apiKeys.create(request);
  }

  /** @deprecated Use `client.apiKeys.update()` instead. */
  updateApiKey(
    apiKeyId: number,
    request: RuleApiKeyUpdateRequest
  ): Promise<RuleApiKeyResponse> {
    return this.apiKeys.update(apiKeyId, request);
  }

  /** @deprecated Use `client.apiKeys.delete()` instead. */
  deleteApiKey(apiKeyId: number): Promise<RuleApiResponse> {
    return this.apiKeys.delete(apiKeyId);
  }

  // ── Exports ───────────────────────────────────────────────────────────────

  /** @deprecated Use `client.exports.dispatchers()` instead. */
  exportDispatchers(
    params: RuleExportDispatcherParams
  ): Promise<RuleExportDispatcherResponse> {
    return this.exports.dispatchers(params);
  }

  /** @deprecated Use `client.exports.statistics()` instead. */
  exportStatistics(
    params: RuleExportStatisticsParams
  ): Promise<RuleExportStatisticsResponse> {
    return this.exports.statistics(params);
  }

  /** @deprecated Use `client.exports.subscribers()` instead. */
  exportSubscribers(
    params: RuleExportSubscriberParams
  ): Promise<RuleExportSubscriberResponse> {
    return this.exports.subscribers(params);
  }

  // ── Analytics ─────────────────────────────────────────────────────────────

  /** @deprecated Use `client.analytics.get()` instead. */
  getAnalytics(params: RuleAnalyticsParams): Promise<RuleAnalyticsResponse> {
    return this.analytics.get(params);
  }

  // ── Recipients ────────────────────────────────────────────────────────────

  /** @deprecated Use `client.recipients.segments.list()` instead. */
  listSegments(params?: RuleRecipientsListParams): Promise<RuleSegmentListResponse> {
    return this.recipients.segments.list(params);
  }

  /** @deprecated Use `client.recipients.subscribers.list()` instead. */
  listRecipientSubscribers(
    params?: RuleRecipientsListParams
  ): Promise<RuleRecipientSubscriberListResponse> {
    return this.recipients.subscribers.list(params);
  }

  /** @deprecated Use `client.recipients.tags.list()` instead. */
  listRecipientTags(
    params?: RuleRecipientsListParams
  ): Promise<RuleRecipientTagListResponse> {
    return this.recipients.tags.list(params);
  }

  // ── Custom field data ─────────────────────────────────────────────────────

  /** @deprecated Use `client.subscribers.listCustomFieldData()` instead. */
  getCustomFieldData(
    subscriberId: number,
    params?: ListCustomFieldDataParams
  ): Promise<CustomFieldDataListResult> {
    return this.subscribers.listCustomFieldData(subscriberId, params);
  }

  /** @deprecated Use `client.subscribers.writeCustomFieldData()` instead. */
  createCustomFieldData(
    subscriberId: number,
    request: WriteCustomFieldDataPayload
  ): Promise<RuleApiResponse> {
    return this.subscribers.writeCustomFieldData(subscriberId, request);
  }

  /** @deprecated Use `client.subscribers.patchCustomFieldData()` instead. */
  updateCustomFieldData(
    subscriberId: number,
    request: PatchCustomFieldDataPayload
  ): Promise<RuleApiResponse> {
    return this.subscribers.patchCustomFieldData(subscriberId, request);
  }

  /** @deprecated Use `client.subscribers.listCustomFieldDataByGroup()` instead. */
  getCustomFieldDataByGroup(
    subscriberId: number,
    group: number | string,
    params?: ListCustomFieldDataByGroupParams
  ): Promise<CustomFieldDataListResult> {
    return this.subscribers.listCustomFieldDataByGroup(subscriberId, group, params);
  }

  /** @deprecated Use `client.subscribers.deleteCustomFieldDataByGroup()` instead. */
  deleteCustomFieldDataByGroup(
    subscriberId: number,
    group: number | string
  ): Promise<RuleApiResponse> {
    return this.subscribers.deleteCustomFieldDataByGroup(subscriberId, group);
  }

  /** @deprecated Use `client.subscribers.findCustomFieldData()` instead. */
  searchCustomFieldData(
    subscriberId: number,
    params: SearchCustomFieldDataParams
  ): Promise<CustomFieldDataResult | null> {
    return this.subscribers.findCustomFieldData(subscriberId, params);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Orchestration helpers — kept here as deprecated for back-compat. These
  // span multiple namespaces and will move to consumers in a follow-up.
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Create a complete automation email workflow:
   *   automation → message → template → dynamic-set
   *
   * Cleans up previously-created resources if any step fails.
   *
   * @deprecated Will be relocated to consumers in a follow-up. Inline the
   * orchestration in your call site using the namespaced clients.
   */
  async createAutomationEmail(
    config: CreateAutomationEmailConfig
  ): Promise<CreateAutomationEmailResult> {
    if (!config.template && !config.brandStyleId) {
      throw new RuleClientError(
        'createAutomationEmail: provide either "template" (full RCML) or "brandStyleId" to auto-build the template.'
      );
    }

    if (config.template && config.brandStyleId) {
      throw new RuleClientError(
        'createAutomationEmail: provide either "template" or "brandStyleId", not both.'
      );
    }

    let resolvedTemplate = config.template;

    if (!resolvedTemplate && config.brandStyleId) {
      this.transport.log('Fetching brand style', config.brandStyleId, 'to build RCML template');
      const brandStyleResponse = await this.brandStyles.get(config.brandStyleId);

      if (!brandStyleResponse?.data) {
        throw new RuleApiError(`Brand style ${config.brandStyleId} not found.`, 404);
      }

      resolvedTemplate = buildDefaultBrandedTemplate(brandStyleResponse.data, {
        preheader: config.preheader,
        sections: config.sections,
      });
      this.transport.log('Built editor-compatible RCML from brand style', config.brandStyleId);
    }

    const createdResources: { type: 'automail' | 'message' | 'template'; id: number }[] = [];

    try {
      if (
        (config.triggerType === 'tag' || config.triggerType === 'segment') &&
        !config.triggerValue
      ) {
        throw new RuleClientError(
          `triggerValue is required when triggerType is "${config.triggerType}".`
        );
      }

      let trigger: { type: 'TAG' | 'SEGMENT'; id: number } | undefined;

      if (config.triggerType === 'tag' && config.triggerValue) {
        const tag = await this.tags.getByName(config.triggerValue);

        if (!tag) {
          throw new RuleApiError(
            `Tag "${config.triggerValue}" not found. Create it first or check the tag name.`,
            404
          );
        }

        trigger = { type: 'TAG', id: tag.id };
      } else if (config.triggerType === 'segment' && config.triggerValue) {
        const segmentId = parseInt(config.triggerValue, 10);

        if (isNaN(segmentId)) {
          throw new RuleApiError(
            `Segment trigger value "${config.triggerValue}" must be a numeric ID.`,
            400
          );
        }

        trigger = { type: 'SEGMENT', id: segmentId };
      } else if (config.triggerType === 'event') {
        throw new RuleClientError(
          'triggerType "event" is not yet supported by createAutomationEmail(). Use "tag" or "segment".'
        );
      }

      const automationResponse = await this.automations.create({
        name: config.name,
        description: config.description,
        sendout_type: config.sendoutType || 2,
        ...(trigger ? { trigger } : {}),
      });

      if (!automationResponse.data?.id) {
        throw new RuleApiError('Failed to create automation - no ID returned', 500);
      }

      const automationId = automationResponse.data.id;

      createdResources.push({ type: 'automail', id: automationId });

      const message = await this.messages.createEmailAutomationMessage(automationId, {
        subject: config.subject,
        preheader: config.preheader,
        fromName: config.fromName,
        fromEmail: config.fromEmail,
        automailSetting: {
          active: true,
          delayInSeconds: config.delayInSeconds || '0',
        },
      });

      if (!message.id) {
        throw new RuleApiError('Failed to create message - no ID returned', 500);
      }

      const messageId = message.id;

      createdResources.push({ type: 'message', id: messageId });

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const template = await this.templates.createEmailTemplate({
        name: `${config.name} - ${Date.now()}`,
        content: resolvedTemplate!, // caller must supply template or brandStyleId
      });

      if (!template.id) {
        throw new RuleApiError('Failed to create template - no ID returned', 500);
      }

      const templateId = template.id;

      createdResources.push({ type: 'template', id: templateId });

      const dynamicSet = await this.dynamicSets.create({
        messageId,
        templateId,
      });

      if (!dynamicSet.id) {
        throw new RuleApiError('Failed to create dynamic set - no ID returned', 500);
      }

      const dynamicSetId = dynamicSet.id;

      return {
        automationId,
        automailId: automationId,
        messageId,
        templateId,
        dynamicSetId,
      };
    } catch (error) {
      for (const resource of createdResources.reverse()) {
        try {
          switch (resource.type) {
            case 'automail':
              await this.automations.delete(resource.id);
              break;
            case 'message':
              await this.messages.delete(resource.id);
              break;
            case 'template':
              await this.templates.delete(resource.id);
              break;
          }
        } catch (cleanupError) {
          this.transport.log(`Failed to cleanup ${resource.type} ${resource.id}:`, cleanupError);
        }
      }

      throw error;
    }
  }

  /**
   * Create a complete campaign email in one call:
   *   campaign → message → template → dynamic-set
   *
   * Cleans up on failure.
   *
   * @deprecated Will be relocated to consumers in a follow-up.
   */
  async createCampaignEmail(
    config: CreateCampaignEmailConfig
  ): Promise<CreateCampaignEmailResult> {
    if (!config.template && !config.brandStyleId) {
      throw new RuleClientError(
        'createCampaignEmail: provide either "template" (full RCML) or "brandStyleId" to auto-build the template.'
      );
    }

    if (config.template && config.brandStyleId) {
      throw new RuleClientError(
        'createCampaignEmail: provide either "template" or "brandStyleId", not both.'
      );
    }

    let resolvedTemplate = config.template;

    if (!resolvedTemplate && config.brandStyleId) {
      this.transport.log('Fetching brand style', config.brandStyleId, 'to build RCML template');
      const brandStyleResponse = await this.brandStyles.get(config.brandStyleId);

      if (!brandStyleResponse?.data) {
        throw new RuleApiError(`Brand style ${config.brandStyleId} not found.`, 404);
      }

      resolvedTemplate = buildDefaultBrandedTemplate(brandStyleResponse.data, {
        preheader: config.preheader,
        sections: config.sections,
      });
      this.transport.log('Built editor-compatible RCML from brand style', config.brandStyleId);
    }

    const createdResources: { type: 'campaign' | 'message' | 'template'; id: number }[] = [];

    try {
      const campaign = await this.campaigns.createEmailCampaign({
        name: config.name,
        sendoutType: config.sendoutType || 'marketing',
        ...(config.tags ? { tags: config.tags } : {}),
        ...(config.segments ? { segments: config.segments } : {}),
        ...(config.subscribers ? { subscribers: config.subscribers } : {}),
      });

      if (!campaign.id) {
        throw new RuleApiError('Failed to create campaign - no ID returned', 500);
      }

      const campaignId = campaign.id;

      createdResources.push({ type: 'campaign', id: campaignId });

      const message = await this.messages.createEmailCampaignMessage(campaignId, {
        subject: config.subject,
        preheader: config.preheader,
        fromName: config.fromName,
        fromEmail: config.fromEmail,
      });

      if (!message.id) {
        throw new RuleApiError('Failed to create message - no ID returned', 500);
      }

      const messageId = message.id;

      createdResources.push({ type: 'message', id: messageId });

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const template = await this.templates.createEmailTemplate({
        name: `${config.name} - ${Date.now()}`,
        content: resolvedTemplate!, // caller must supply template or brandStyleId
      });

      if (!template.id) {
        throw new RuleApiError('Failed to create template - no ID returned', 500);
      }

      const templateId = template.id;

      createdResources.push({ type: 'template', id: templateId });

      const dynamicSet = await this.dynamicSets.create({
        messageId,
        templateId,
      });

      if (!dynamicSet.id) {
        throw new RuleApiError('Failed to create dynamic set - no ID returned', 500);
      }

      return {
        campaignId,
        messageId,
        templateId,
        dynamicSetId: dynamicSet.id,
      };
    } catch (error) {
      for (const resource of createdResources.reverse()) {
        try {
          switch (resource.type) {
            case 'campaign':
              await this.campaigns.delete(resource.id);
              break;
            case 'message':
              await this.messages.delete(resource.id);
              break;
            case 'template':
              await this.templates.delete(resource.id);
              break;
          }
        } catch (cleanupError) {
          this.transport.log(`Failed to cleanup ${resource.type} ${resource.id}:`, cleanupError);
        }
      }

      throw error;
    }
  }
}
