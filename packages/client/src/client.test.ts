/**
 * Root `RuleClient` tests.
 *
 * Scope:
 * 1. Lazy singleton invariants (doc §9):
 *    - `client.subscribers === client.subscribers`
 *    - `client.recipients.segments === client.recipients.segments`
 *    - Namespaces are not instantiated until accessed.
 *    - Every namespace shares the same `HttpTransport`.
 * 2. Deprecated-alias delegation smoke tests — a representative subset of
 *    wrappers, not exhaustive. The existing `tests/client.test.ts` exercises
 *    each deprecated method's HTTP behavior; here we just verify the wrapper
 *    forwards to the namespaced method.
 *
 * Constructor / config validation is covered by `config.test.ts` and by the
 * legacy `tests/client.test.ts` constructor block.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RuleApiError, RuleConfigError } from '@rule-io/core';
import type { RcmlDocument } from '@rule-io/rcml';

import {
  createMock204Response,
  createMockErrorResponse,
  createMockFetch,
  createMockResponse,
  type MockFetch,
} from './core/mock-fetch.js';
import { AccountsClient } from './resources/accounts/accounts.client.js';
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
import { RecipientSubscribersClient } from './resources/recipients/subscribers/recipient-subscribers.client.js';
import { RecipientTagsClient } from './resources/recipients/tags/recipient-tags.client.js';
import { SegmentsClient } from './resources/recipients/segments/segments.client.js';
import { SubscribersClient } from './resources/subscribers/subscribers.client.js';
import { SuppressionsClient } from './resources/suppressions/suppressions.client.js';
import { TagsClient } from './resources/tags/tags.client.js';
import { TemplatesClient } from './resources/templates/templates.client.js';
import { RuleClient } from './client.js';

function makeClient(fetchMock: MockFetch): RuleClient {
  return new RuleClient({ apiKey: 'test-key', fetch: fetchMock });
}

describe('RuleClient — namespaced API', () => {
  let fetchMock: MockFetch;

  beforeEach(() => {
    fetchMock = createMockFetch();
  });

  describe('namespace types', () => {
    it('exposes one instance of each documented namespace client', () => {
      const client = makeClient(fetchMock);

      expect(client.subscribers).toBeInstanceOf(SubscribersClient);
      expect(client.tags).toBeInstanceOf(TagsClient);
      expect(client.automations).toBeInstanceOf(AutomationsClient);
      expect(client.messages).toBeInstanceOf(MessagesClient);
      expect(client.templates).toBeInstanceOf(TemplatesClient);
      expect(client.dynamicSets).toBeInstanceOf(DynamicSetsClient);
      expect(client.campaigns).toBeInstanceOf(CampaignsClient);
      expect(client.suppressions).toBeInstanceOf(SuppressionsClient);
      expect(client.brandStyles).toBeInstanceOf(BrandStylesClient);
      expect(client.apiKeys).toBeInstanceOf(ApiKeysClient);
      expect(client.exports).toBeInstanceOf(ExportsClient);
      expect(client.analytics).toBeInstanceOf(AnalyticsClient);
      expect(client.recipients).toBeInstanceOf(RecipientsClient);
      expect(client.accounts).toBeInstanceOf(AccountsClient);
      expect(client.customFieldData).toBeInstanceOf(CustomFieldDataClient);
    });

    it('exposes nested recipient namespaces of the right type', () => {
      const client = makeClient(fetchMock);

      expect(client.recipients.segments).toBeInstanceOf(SegmentsClient);
      expect(client.recipients.subscribers).toBeInstanceOf(RecipientSubscribersClient);
      expect(client.recipients.tags).toBeInstanceOf(RecipientTagsClient);
    });
  });

  describe('lazy singleton invariants', () => {
    it('returns the same instance on repeated top-level access', () => {
      const client = makeClient(fetchMock);

      expect(client.subscribers).toBe(client.subscribers);
      expect(client.automations).toBe(client.automations);
      expect(client.brandStyles).toBe(client.brandStyles);
      expect(client.recipients).toBe(client.recipients);
    });

    it('returns the same instance on repeated nested access', () => {
      const client = makeClient(fetchMock);

      expect(client.recipients.segments).toBe(client.recipients.segments);
      expect(client.recipients.subscribers).toBe(client.recipients.subscribers);
      expect(client.recipients.tags).toBe(client.recipients.tags);
    });

    it('does not instantiate namespaces that are never accessed', () => {
      const client = makeClient(fetchMock);

      // Reach into the inherited cache. Newly-constructed client touched no
      // namespaces, so the cache should be empty.
      const cacheSize = (client as unknown as { cache: { size: number } }).cache.size;

      expect(cacheSize).toBe(0);
    });

    it('caches a namespace exactly once per access', () => {
      const client = makeClient(fetchMock);

      void client.tags;
      void client.tags;
      void client.tags;

      const cacheSize = (client as unknown as { cache: { size: number } }).cache.size;

      // Only `tags` should have been cached.
      expect(cacheSize).toBe(1);
    });
  });

  describe('shared transport', () => {
    it('every namespace points at the same HttpTransport instance', () => {
      const client = makeClient(fetchMock);

      // Reach into the protected `transport` field; this is a load-bearing
      // architectural invariant from the doc (§2.4 "one client → one transport").
      type WithTransport = { transport: unknown };
      const rootTransport = (client as unknown as WithTransport).transport;
      const namespaces = [
        client.subscribers,
        client.tags,
        client.automations,
        client.messages,
        client.templates,
        client.dynamicSets,
        client.campaigns,
        client.suppressions,
        client.brandStyles,
        client.apiKeys,
        client.exports,
        client.analytics,
        client.recipients,
        client.accounts,
        client.customFieldData,
      ];

      for (const ns of namespaces) {
        expect((ns as unknown as WithTransport).transport).toBe(rootTransport);
      }

      // Nested clients also share the same transport.
      expect((client.recipients.segments as unknown as WithTransport).transport).toBe(
        rootTransport
      );
      expect((client.recipients.subscribers as unknown as WithTransport).transport).toBe(
        rootTransport
      );
      expect((client.recipients.tags as unknown as WithTransport).transport).toBe(
        rootTransport
      );
    });
  });
});

describe('RuleClient — deprecated-alias delegation', () => {
  let fetchMock: MockFetch;

  beforeEach(() => {
    fetchMock = createMockFetch();
  });

  it('createAutomation delegates to automations.create', async () => {
    const client = makeClient(fetchMock);
    const spy = vi.spyOn(client.automations, 'create');

    fetchMock.mockResolvedValueOnce(createMockResponse({ data: { id: 1, name: 'X' } }));
    await client.createAutomation({ name: 'X' });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({ name: 'X' });
  });

  it('createAutomail delegates to automations.create (legacy alias)', async () => {
    const client = makeClient(fetchMock);
    const spy = vi.spyOn(client.automations, 'create');

    fetchMock.mockResolvedValueOnce(createMockResponse({ data: { id: 1, name: 'X' } }));
    await client.createAutomail({ name: 'X' });

    expect(spy).toHaveBeenCalledWith({ name: 'X' });
  });

  it('syncSubscriber delegates to subscribers.sync', async () => {
    const client = makeClient(fetchMock);
    const spy = vi.spyOn(client.subscribers, 'sync');

    fetchMock.mockResolvedValueOnce(createMockResponse({ success: true }));
    await client.syncSubscriber({ email: 'a@b.c', tags: ['t'] });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]![0]).toEqual({ email: 'a@b.c', tags: ['t'] });
  });

  it('getAnalytics delegates to analytics.get', async () => {
    const client = makeClient(fetchMock);
    const spy = vi.spyOn(client.analytics, 'get');

    fetchMock.mockResolvedValueOnce(createMockResponse({ data: [] }));
    await client.getAnalytics({ date_from: '2024-01-01', date_to: '2024-01-31' });

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('listBrandStyles delegates to brandStyles.list', async () => {
    const client = makeClient(fetchMock);
    const spy = vi.spyOn(client.brandStyles, 'list');

    fetchMock.mockResolvedValueOnce(createMockResponse({ data: [] }));
    await client.listBrandStyles();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('listSegments delegates to recipients.segments.list (nested)', async () => {
    const client = makeClient(fetchMock);
    const spy = vi.spyOn(client.recipients.segments, 'list');

    fetchMock.mockResolvedValueOnce(createMockResponse({ data: [] }));
    await client.listSegments();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('addSubscriberTagsV3 delegates to subscribers.addTags', async () => {
    const client = makeClient(fetchMock);
    const spy = vi.spyOn(client.subscribers, 'addTags');

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 204,
      headers: new Headers(),
    } as Response);
    await client.addSubscriberTagsV3('user@example.com', { tags: ['vip'] }, 'email');

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]![0]).toBe('user@example.com');
    expect(spy.mock.calls[0]![1]).toEqual({ tags: ['vip'] });
    expect(spy.mock.calls[0]![2]).toBe('email');
  });

  it('preserves the original v2 endpoint for addSubscriberTags (does NOT route through subscribers.addTags v3)', async () => {
    const client = makeClient(fetchMock);
    const spy = vi.spyOn(client.subscribers, 'addTags');

    fetchMock.mockResolvedValueOnce(createMockResponse({ success: true }));
    await client.addSubscriberTags('user@example.com', ['vip']);

    // The v2 wrapper must NOT delegate to the v3 namespace method.
    expect(spy).not.toHaveBeenCalled();
    // It calls v2 directly.
    const url = fetchMock.mock.calls[0]![0] as string;

    expect(url).toContain('/api/v2/subscribers/');
  });
});

const MINIMAL_TEMPLATE: RcmlDocument = {
  tagName: 'rcml',
  children: [
    { tagName: 'rc-head', children: [] },
    { tagName: 'rc-body', children: [] },
  ],
};

describe('createAutomationEmail orchestration', () => {
  let fetchMock: MockFetch;

  beforeEach(() => {
    fetchMock = createMockFetch();
  });

  it('rejects when neither template nor brandStyleId is provided', async () => {
    const client = makeClient(fetchMock);

    await expect(
      client.createAutomationEmail({
        name: 'Test',
        triggerType: 'tag',
        triggerValue: 'Newsletter',
        subject: 'Test',
      })
    ).rejects.toThrow(RuleConfigError);
  });

  it('rejects when both template and brandStyleId are provided', async () => {
    const client = makeClient(fetchMock);

    await expect(
      client.createAutomationEmail({
        name: 'Test',
        triggerType: 'tag',
        triggerValue: 'Newsletter',
        subject: 'Test',
        template: MINIMAL_TEMPLATE,
        brandStyleId: 976,
      })
    ).rejects.toThrow(RuleConfigError);
  });

  it('auto-fetches the brand style and builds RCML when brandStyleId is provided', async () => {
    fetchMock
      .mockResolvedValueOnce(
        createMockResponse({
          data: {
            id: 976,
            account_id: 1,
            name: 'Test Brand',
            is_default: true,
            colours: [
              { id: 1, brand_style_id: 976, type: 'accent', hex: '#FF0000', brightness: 50 },
              { id: 2, brand_style_id: 976, type: 'dark', hex: '#111111', brightness: 10 },
              { id: 3, brand_style_id: 976, type: 'light', hex: '#FAFAFA', brightness: 95 },
              { id: 4, brand_style_id: 976, type: 'brand', hex: '#0066CC', brightness: 40 },
            ],
            fonts: [],
            images: [],
          },
        })
      )
      .mockResolvedValueOnce(createMockResponse({ tags: [{ id: 10, name: 'Newsletter' }] }))
      .mockResolvedValueOnce(createMockResponse({ data: { id: 100 } })) // automation
      .mockResolvedValueOnce(createMockResponse({ data: { id: 200 } })) // message
      .mockResolvedValueOnce(createMockResponse({ data: { id: 300 } })) // template
      .mockResolvedValueOnce(createMockResponse({ data: { id: 400 } })); // dynamic set
    const client = makeClient(fetchMock);

    const result = await client.createAutomationEmail({
      name: 'Welcome',
      triggerType: 'tag',
      triggerValue: 'Newsletter',
      subject: 'Welcome!',
      brandStyleId: 976,
    });

    expect(result.automationId).toBe(100);
    expect(result.automailId).toBe(100);
    expect(result.messageId).toBe(200);
    expect(result.templateId).toBe(300);
    expect(result.dynamicSetId).toBe(400);

    // The 5th call (template create) embeds the auto-built RCML.
    const templateBody = JSON.parse(fetchMock.mock.calls[4]![1]!.body as string);
    const rcml = JSON.stringify(templateBody.template);

    expect(rcml).toContain('rc-brand-style');
    expect(rcml).toContain('rcml-h1-style');
    expect(rcml).toContain('Replace this title');
    expect(rcml).toContain('Click me!');
    expect(rcml).toContain('Certified by Rule');
  });

  it('throws RuleApiError when the brand style is not found', async () => {
    fetchMock.mockResolvedValueOnce(createMockErrorResponse({ error: 'Not found' }, 404));
    const client = makeClient(fetchMock);

    await expect(
      client.createAutomationEmail({
        name: 'Test',
        triggerType: 'tag',
        triggerValue: 'Newsletter',
        subject: 'Test',
        brandStyleId: 99999,
      })
    ).rejects.toThrow(RuleApiError);
  });

  it('cleans up automation + message when template creation fails', async () => {
    fetchMock
      .mockResolvedValueOnce(createMockResponse({ data: { id: 100 } })) // automation
      .mockResolvedValueOnce(createMockResponse({ data: { id: 200 } })) // message
      .mockRejectedValueOnce(new Error('Template creation failed'))
      .mockResolvedValueOnce(createMock204Response()) // delete message
      .mockResolvedValueOnce(createMock204Response()); // delete automation
    const client = makeClient(fetchMock);

    await expect(
      client.createAutomationEmail({
        name: 'Test',
        subject: 'Test',
        triggerType: 'segment',
        triggerValue: '12345',
        template: MINIMAL_TEMPLATE,
      })
    ).rejects.toThrow('Template creation failed');

    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it('cleans up the automation when message creation fails', async () => {
    fetchMock
      .mockResolvedValueOnce(createMockResponse({ data: { id: 100 } })) // automation
      .mockRejectedValueOnce(new Error('Message creation failed'))
      .mockResolvedValueOnce(createMock204Response()); // delete automation
    const client = makeClient(fetchMock);

    await expect(
      client.createAutomationEmail({
        name: 'Test',
        subject: 'Test',
        triggerType: 'segment',
        triggerValue: '12345',
        template: MINIMAL_TEMPLATE,
      })
    ).rejects.toThrow('Message creation failed');

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

describe('createCampaignEmail orchestration', () => {
  let fetchMock: MockFetch;

  beforeEach(() => {
    fetchMock = createMockFetch();
  });

  it('rejects when neither template nor brandStyleId is provided', async () => {
    const client = makeClient(fetchMock);

    await expect(
      client.createCampaignEmail({ name: 'Test', subject: 'Test' })
    ).rejects.toThrow(RuleConfigError);
  });

  it('rejects when both template and brandStyleId are provided', async () => {
    const client = makeClient(fetchMock);

    await expect(
      client.createCampaignEmail({
        name: 'Test',
        subject: 'Test',
        template: MINIMAL_TEMPLATE,
        brandStyleId: 976,
      })
    ).rejects.toThrow(RuleConfigError);
  });

  it('auto-fetches brand style and builds RCML when brandStyleId is provided', async () => {
    fetchMock
      .mockResolvedValueOnce(
        createMockResponse({
          data: {
            id: 976,
            account_id: 1,
            name: 'Test Brand',
            is_default: true,
            colours: [
              { id: 1, brand_style_id: 976, type: 'accent', hex: '#FF0000', brightness: 50 },
              { id: 2, brand_style_id: 976, type: 'dark', hex: '#111111', brightness: 10 },
              { id: 3, brand_style_id: 976, type: 'side', hex: '#FF5204', brightness: 50 },
              { id: 4, brand_style_id: 976, type: 'brand', hex: '#0066CC', brightness: 40 },
            ],
            fonts: [],
            images: [],
          },
        })
      )
      .mockResolvedValueOnce(createMockResponse({ data: { id: 100 } })) // campaign
      .mockResolvedValueOnce(createMockResponse({ data: { id: 200 } })) // message
      .mockResolvedValueOnce(createMockResponse({ data: { id: 300 } })) // template
      .mockResolvedValueOnce(createMockResponse({ data: { id: 400 } })); // dynamic set
    const client = makeClient(fetchMock);

    const result = await client.createCampaignEmail({
      name: 'Welcome Campaign',
      subject: 'Welcome!',
      brandStyleId: 976,
      tags: [{ id: 42, negative: false }],
    });

    expect(result.campaignId).toBe(100);
    expect(result.messageId).toBe(200);
    expect(result.templateId).toBe(300);
    expect(result.dynamicSetId).toBe(400);

    const templateBody = JSON.parse(fetchMock.mock.calls[3]![1]!.body as string);
    const rcml = JSON.stringify(templateBody.template);

    expect(rcml).toContain('rc-brand-style');
    expect(rcml).toContain('Replace this title');
    expect(rcml).toContain('Certified by Rule');
  });

  it('uses the provided template directly when no brandStyleId is set', async () => {
    fetchMock
      .mockResolvedValueOnce(createMockResponse({ data: { id: 100 } })) // campaign
      .mockResolvedValueOnce(createMockResponse({ data: { id: 200 } })) // message
      .mockResolvedValueOnce(createMockResponse({ data: { id: 300 } })) // template
      .mockResolvedValueOnce(createMockResponse({ data: { id: 400 } })); // dynamic set
    const client = makeClient(fetchMock);

    const result = await client.createCampaignEmail({
      name: 'Direct Template',
      subject: 'Test',
      template: MINIMAL_TEMPLATE,
    });

    expect(result.campaignId).toBe(100);
    expect(fetchMock).toHaveBeenCalledTimes(4); // No brand-style fetch.
  });

  it('cleans up campaign + message when template creation fails', async () => {
    fetchMock
      .mockResolvedValueOnce(
        createMockResponse({
          data: {
            id: 976,
            account_id: 1,
            name: 'Test',
            is_default: true,
            colours: [],
            fonts: [],
            images: [],
          },
        })
      )
      .mockResolvedValueOnce(createMockResponse({ data: { id: 100 } })) // campaign
      .mockResolvedValueOnce(createMockResponse({ data: { id: 200 } })) // message
      .mockRejectedValueOnce(new Error('Template creation failed'))
      .mockResolvedValueOnce(createMock204Response()) // delete message
      .mockResolvedValueOnce(createMock204Response()); // delete campaign
    const client = makeClient(fetchMock);

    await expect(
      client.createCampaignEmail({
        name: 'Test',
        subject: 'Test',
        brandStyleId: 976,
      })
    ).rejects.toThrow('Template creation failed');
  });
});

describe('Deprecated automail aliases', () => {
  let fetchMock: MockFetch;

  beforeEach(() => {
    fetchMock = createMockFetch();
  });

  it('createAutomail produces the same HTTP call as createAutomation', async () => {
    fetchMock.mockResolvedValueOnce(
      createMockResponse({ data: { id: 1, name: 'Test' } })
    );
    const client = makeClient(fetchMock);

    const result = await client.createAutomail({ name: 'Test' });

    expect(result.data?.id).toBe(1);
    const url = fetchMock.mock.calls[0]![0] as string;

    expect(url).toBe('https://app.rule.io/api/v3/editor/automail');
  });

  it('getAutomail / updateAutomail / deleteAutomail / listAutomails all forward correctly', async () => {
    fetchMock
      .mockResolvedValueOnce(createMockResponse({ data: { id: 1, name: 'A' } }))
      .mockResolvedValueOnce(createMockResponse({ data: { id: 1, name: 'Updated' } }))
      .mockResolvedValueOnce(createMock204Response())
      .mockResolvedValueOnce(createMockResponse({ data: [] }));
    const client = makeClient(fetchMock);

    expect((await client.getAutomail(1))?.data?.id).toBe(1);
    expect((await client.updateAutomail(1, { name: 'Updated' })).data?.name).toBe('Updated');
    expect((await client.deleteAutomail(1)).success).toBe(true);
    expect((await client.listAutomails()).data).toEqual([]);
  });
});
