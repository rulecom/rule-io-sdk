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

import { RuleApiError, RuleConfigError } from '@rule-io/core';

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
  RuleCampaignCreateRequest,
  RuleCampaignListParams,
  RuleCampaignListResponse,
  RuleCampaignResponse,
  RuleCampaignScheduleRequest,
  RuleCampaignUpdateRequest,
} from './resources/campaigns/campaigns.types.js';
import type {
  CreateCustomFieldDataRequestBody,
  RuleCustomFieldDataGroupParams,
  RuleCustomFieldDataListParams,
  RuleCustomFieldDataResponse,
  RuleCustomFieldDataSearchParams,
  RuleCustomFieldDataSingleResponse,
  RuleCustomFieldDataUpdateRequest,
} from './resources/custom-field-data/custom-field-data.types.js';
import type {
  RuleDynamicSetCreateRequest,
  RuleDynamicSetListParams,
  RuleDynamicSetListResponse,
  RuleDynamicSetResponse,
  RuleDynamicSetUpdateRequest,
} from './resources/dynamic-sets/dynamic-sets.types.js';
import type {
  RuleExportDispatcherParams,
  RuleExportDispatcherResponse,
  RuleExportStatisticsParams,
  RuleExportStatisticsResponse,
  RuleExportSubscriberParams,
  RuleExportSubscriberResponse,
} from './resources/exports/exports.types.js';
import type {
  RuleMessageCreateRequest,
  RuleMessageListParams,
  RuleMessageListResponse,
  RuleMessageResponse,
} from './resources/messages/messages.types.js';
import type {
  RuleRecipientSubscriberListResponse,
  RuleRecipientTagListResponse,
  RuleRecipientsListParams,
  RuleSegmentListResponse,
} from './resources/recipients/recipients.types.js';
import type {
  RuleBulkSubscriberIdentifier,
  RuleBulkTagsRequest,
  RuleSubscriber,
  GetSubscriberV2Response,
  RuleSubscriberTagsV3Request,
  CreateSubscriberV3Request,
  CreateSubscriberV3Response,
} from './resources/subscribers/subscribers.types.js';
import type { RuleSuppressionRequest } from './resources/suppressions/suppressions.types.js';
import type { RuleTagsResponse } from './resources/tags/tags.types.js';
import type {
  RuleRenderTemplateParams,
  RuleTemplateCreateRequest,
  RuleTemplateListParams,
  RuleTemplateListResponse,
  RuleTemplateResponse,
} from './resources/templates/templates.types.js';
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

  get customFieldData(): CustomFieldDataClient {
    return this.lazy('customFieldData', () => new CustomFieldDataClient(this.transport));
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

  /** @deprecated Use `client.subscribers.sync()` instead. */
  syncSubscriber(subscriber: RuleSubscriber, fieldGroupPrefix: string): Promise<RuleApiResponse> {
    return this.subscribers.sync(subscriber, fieldGroupPrefix);
  }

  /** @deprecated Use `client.subscribers.getByEmail()` instead. */
  getSubscriber(email: string): Promise<GetSubscriberV2Response | null> {
    return this.subscribers.getByEmail(email);
  }

  /** @deprecated Use `client.subscribers.getFields()` instead. */
  getSubscriberFields(email: string): Promise<Record<string, string | null>> {
    return this.subscribers.getFields(email);
  }

  /** @deprecated Use `client.subscribers.getTagNames()` instead. */
  getSubscriberTags(email: string): Promise<string[]> {
    return this.subscribers.getTagNames(email);
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
   * @deprecated Use `client.subscribers.removeTag()` for single-tag removal,
   * or `client.subscribers.bulkRemoveTags()` for bulk operations (both v3).
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
    subscriber: CreateSubscriberV3Request
  ): Promise<CreateSubscriberV3Response> {
    return this.subscribers.create(subscriber);
  }

  /** @deprecated Use `client.subscribers.delete()` instead. */
  deleteSubscriberV3(
    subscriber: string | number,
    identifiedBy: V2SubscriberIdentifierBy = 'email'
  ): Promise<RuleApiResponse> {
    return this.subscribers.delete(subscriber, identifiedBy);
  }

  /** @deprecated Use `client.subscribers.block()` instead. */
  blockSubscribers(
    subscribers: RuleBulkSubscriberIdentifier[],
    callbackUrl?: string
  ): Promise<RuleApiResponse> {
    return this.subscribers.block(subscribers, callbackUrl);
  }

  /** @deprecated Use `client.subscribers.unblock()` instead. */
  unblockSubscribers(
    subscribers: RuleBulkSubscriberIdentifier[],
    callbackUrl?: string
  ): Promise<RuleApiResponse> {
    return this.subscribers.unblock(subscribers, callbackUrl);
  }

  /** @deprecated Use `client.subscribers.bulkAddTags()` instead. */
  bulkAddTags(request: RuleBulkTagsRequest): Promise<RuleApiResponse> {
    return this.subscribers.bulkAddTags(request);
  }

  /** @deprecated Use `client.subscribers.bulkRemoveTags()` instead. */
  bulkRemoveTags(request: RuleBulkTagsRequest): Promise<RuleApiResponse> {
    return this.subscribers.bulkRemoveTags(request);
  }

  /** @deprecated Use `client.subscribers.addTags()` instead. */
  addSubscriberTagsV3(
    subscriber: string | number,
    request: RuleSubscriberTagsV3Request,
    identifiedBy: V2SubscriberIdentifierBy = 'email'
  ): Promise<RuleApiResponse> {
    return this.subscribers.addTags(subscriber, request, identifiedBy);
  }

  /** @deprecated Use `client.subscribers.removeTag()` instead. */
  removeSubscriberTagV3(
    subscriber: string | number,
    tag: string | number,
    identifiedBy: V2SubscriberIdentifierBy = 'email'
  ): Promise<RuleApiResponse> {
    return this.subscribers.removeTag(subscriber, tag, identifiedBy);
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

  // ── Messages ──────────────────────────────────────────────────────────────

  /** @deprecated Use `client.messages.create()` instead. */
  createMessage(req: RuleMessageCreateRequest): Promise<RuleMessageResponse> {
    return this.messages.create(req);
  }

  /** @deprecated Use `client.messages.get()` instead. */
  getMessage(id: number): Promise<RuleMessageResponse | null> {
    return this.messages.get(id);
  }

  /** @deprecated Use `client.messages.update()` instead. */
  updateMessage(
    id: number,
    message: Partial<RuleMessageCreateRequest>
  ): Promise<RuleMessageResponse> {
    return this.messages.update(id, message);
  }

  /** @deprecated Use `client.messages.delete()` instead. */
  deleteMessage(id: number): Promise<RuleApiResponse> {
    return this.messages.delete(id);
  }

  /** @deprecated Use `client.messages.list()` instead. */
  listMessages(params: RuleMessageListParams): Promise<RuleMessageListResponse> {
    return this.messages.list(params);
  }

  // ── Templates ─────────────────────────────────────────────────────────────

  /** @deprecated Use `client.templates.create()` instead. */
  createTemplate(req: RuleTemplateCreateRequest): Promise<RuleTemplateResponse> {
    return this.templates.create(req);
  }

  /** @deprecated Use `client.templates.get()` instead. */
  getTemplate(id: number): Promise<RuleTemplateResponse | null> {
    return this.templates.get(id);
  }

  /** @deprecated Use `client.templates.update()` instead. */
  updateTemplate(
    id: number,
    template: Partial<RuleTemplateCreateRequest>
  ): Promise<RuleTemplateResponse> {
    return this.templates.update(id, template);
  }

  /** @deprecated Use `client.templates.delete()` instead. */
  deleteTemplate(id: number): Promise<RuleApiResponse> {
    return this.templates.delete(id);
  }

  /** @deprecated Use `client.templates.list()` instead. */
  listTemplates(params?: RuleTemplateListParams): Promise<RuleTemplateListResponse> {
    return this.templates.list(params);
  }

  /** @deprecated Use `client.templates.render()` instead. */
  renderTemplate(
    id: number,
    params?: RuleRenderTemplateParams
  ): Promise<string | null> {
    return this.templates.render(id, params);
  }

  // ── Dynamic sets ──────────────────────────────────────────────────────────

  /** @deprecated Use `client.dynamicSets.create()` instead. */
  createDynamicSet(req: RuleDynamicSetCreateRequest): Promise<RuleDynamicSetResponse> {
    return this.dynamicSets.create(req);
  }

  /** @deprecated Use `client.dynamicSets.get()` instead. */
  getDynamicSet(id: number): Promise<RuleDynamicSetResponse | null> {
    return this.dynamicSets.get(id);
  }

  /** @deprecated Use `client.dynamicSets.update()` instead. */
  updateDynamicSet(
    id: number,
    update: RuleDynamicSetUpdateRequest
  ): Promise<RuleDynamicSetResponse> {
    return this.dynamicSets.update(id, update);
  }

  /** @deprecated Use `client.dynamicSets.delete()` instead. */
  deleteDynamicSet(id: number): Promise<RuleApiResponse> {
    return this.dynamicSets.delete(id);
  }

  /** @deprecated Use `client.dynamicSets.list()` instead. */
  listDynamicSets(params: RuleDynamicSetListParams): Promise<RuleDynamicSetListResponse> {
    return this.dynamicSets.list(params);
  }

  // ── Campaigns ─────────────────────────────────────────────────────────────

  /** @deprecated Use `client.campaigns.list()` instead. */
  listCampaigns(params?: RuleCampaignListParams): Promise<RuleCampaignListResponse> {
    return this.campaigns.list(params);
  }

  /** @deprecated Use `client.campaigns.create()` instead. */
  createCampaign(req: RuleCampaignCreateRequest): Promise<RuleCampaignResponse> {
    return this.campaigns.create(req);
  }

  /** @deprecated Use `client.campaigns.get()` instead. */
  getCampaign(id: number): Promise<RuleCampaignResponse | null> {
    return this.campaigns.get(id);
  }

  /** @deprecated Use `client.campaigns.update()` instead. */
  updateCampaign(
    id: number,
    update: Partial<RuleCampaignUpdateRequest>
  ): Promise<RuleCampaignResponse> {
    return this.campaigns.update(id, update);
  }

  /** @deprecated Use `client.campaigns.delete()` instead. */
  deleteCampaign(id: number): Promise<RuleApiResponse> {
    return this.campaigns.delete(id);
  }

  /** @deprecated Use `client.campaigns.copy()` instead. */
  copyCampaign(id: number): Promise<RuleCampaignResponse> {
    return this.campaigns.copy(id);
  }

  /** @deprecated Use `client.campaigns.schedule()` instead. */
  scheduleCampaign(
    id: number,
    schedule: RuleCampaignScheduleRequest
  ): Promise<RuleApiResponse> {
    return this.campaigns.schedule(id, schedule);
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

  // ── Custom field data (deprecated by Rule.io) ─────────────────────────────

  /** @deprecated Use `client.customFieldData.list()` instead. */
  getCustomFieldData(
    subscriberId: number,
    params?: RuleCustomFieldDataListParams
  ): Promise<RuleCustomFieldDataResponse> {
    return this.customFieldData.list(subscriberId, params);
  }

  /** @deprecated Use `client.customFieldData.create()` instead. */
  createCustomFieldData(
    subscriberId: number,
    request: CreateCustomFieldDataRequestBody
  ): Promise<RuleApiResponse> {
    return this.customFieldData.create(subscriberId, request);
  }

  /** @deprecated Use `client.customFieldData.update()` instead. */
  updateCustomFieldData(
    subscriberId: number,
    request: RuleCustomFieldDataUpdateRequest
  ): Promise<RuleApiResponse> {
    return this.customFieldData.update(subscriberId, request);
  }

  /** @deprecated Use `client.customFieldData.listByGroup()` instead. */
  getCustomFieldDataByGroup(
    subscriberId: number,
    group: number | string,
    params?: RuleCustomFieldDataGroupParams
  ): Promise<RuleCustomFieldDataResponse> {
    return this.customFieldData.listByGroup(subscriberId, group, params);
  }

  /** @deprecated Use `client.customFieldData.deleteByGroup()` instead. */
  deleteCustomFieldDataByGroup(
    subscriberId: number,
    group: number | string
  ): Promise<RuleApiResponse> {
    return this.customFieldData.deleteByGroup(subscriberId, group);
  }

  /** @deprecated Use `client.customFieldData.search()` instead. */
  searchCustomFieldData(
    subscriberId: number,
    params: RuleCustomFieldDataSearchParams
  ): Promise<RuleCustomFieldDataSingleResponse | null> {
    return this.customFieldData.search(subscriberId, params);
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
      throw new RuleConfigError(
        'createAutomationEmail: provide either "template" (full RCML) or "brandStyleId" to auto-build the template.'
      );
    }

    if (config.template && config.brandStyleId) {
      throw new RuleConfigError(
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
        throw new RuleConfigError(
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
        throw new RuleConfigError(
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

      const messageResponse = await this.messages.create({
        dispatcher: { id: automationId, type: 'automail' },
        type: 1,
        subject: config.subject,
        preheader: config.preheader,
        from_name: config.fromName,
        from_email: config.fromEmail,
        reply_to: config.replyTo,
        automail_setting: {
          active: true,
          delay_in_seconds: config.delayInSeconds || '0',
        },
      });

      if (!messageResponse.data?.id) {
        throw new RuleApiError('Failed to create message - no ID returned', 500);
      }

      const messageId = messageResponse.data.id;

      createdResources.push({ type: 'message', id: messageId });

      const templateResponse = await this.templates.create({
        message_id: messageId,
        name: `${config.name} - ${Date.now()}`,
        message_type: 'email',
        template: resolvedTemplate!,
      });

      if (!templateResponse.data?.id) {
        throw new RuleApiError('Failed to create template - no ID returned', 500);
      }

      const templateId = templateResponse.data.id;

      createdResources.push({ type: 'template', id: templateId });

      const dynamicSetResponse = await this.dynamicSets.create({
        message_id: messageId,
        template_id: templateId,
      });

      if (!dynamicSetResponse.data?.id) {
        throw new RuleApiError('Failed to create dynamic set - no ID returned', 500);
      }

      const dynamicSetId = dynamicSetResponse.data.id;

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
      throw new RuleConfigError(
        'createCampaignEmail: provide either "template" (full RCML) or "brandStyleId" to auto-build the template.'
      );
    }

    if (config.template && config.brandStyleId) {
      throw new RuleConfigError(
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
      const campaignResponse = await this.campaigns.create({
        name: config.name,
        message_type: 1,
        sendout_type: config.sendoutType || 1,
        ...(config.tags ? { tags: config.tags } : {}),
        ...(config.segments ? { segments: config.segments } : {}),
        ...(config.subscribers ? { subscribers: config.subscribers } : {}),
      });

      if (!campaignResponse.data?.id) {
        throw new RuleApiError('Failed to create campaign - no ID returned', 500);
      }

      const campaignId = campaignResponse.data.id;

      createdResources.push({ type: 'campaign', id: campaignId });

      const messageResponse = await this.messages.create({
        dispatcher: { id: campaignId, type: 'campaign' },
        type: 1,
        subject: config.subject,
        preheader: config.preheader,
        from_name: config.fromName,
        from_email: config.fromEmail,
        reply_to: config.replyTo,
      });

      if (!messageResponse.data?.id) {
        throw new RuleApiError('Failed to create message - no ID returned', 500);
      }

      const messageId = messageResponse.data.id;

      createdResources.push({ type: 'message', id: messageId });

      const templateResponse = await this.templates.create({
        message_id: messageId,
        name: `${config.name} - ${Date.now()}`,
        message_type: 'email',
        template: resolvedTemplate!,
      });

      if (!templateResponse.data?.id) {
        throw new RuleApiError('Failed to create template - no ID returned', 500);
      }

      const templateId = templateResponse.data.id;

      createdResources.push({ type: 'template', id: templateId });

      const dynamicSetResponse = await this.dynamicSets.create({
        message_id: messageId,
        template_id: templateId,
      });

      if (!dynamicSetResponse.data?.id) {
        throw new RuleApiError('Failed to create dynamic set - no ID returned', 500);
      }

      return {
        campaignId,
        messageId,
        templateId,
        dynamicSetId: dynamicSetResponse.data.id,
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
