import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RuleApiError } from '../../errors.js';

import {
  createMockErrorResponse,
  createMockFetch,
  createMockResponse,
  createMockTransport,
  type MockFetch,
} from '../../core/mock-fetch.js';
import { CampaignsClient } from './campaigns.client.js';

const WIRE_CAMPAIGN = {
  id: 100,
  name: 'Spring Newsletter',
  status: { value: 1, key: 'draft', description: 'Draft' },
  message_type: { value: 1, key: 'email', description: 'Email' },
  sendout_type: { value: 1, key: 'marketing', description: 'Marketing' },
  number_of_recipients: 500,
  total_sent: null,
  recipients: {
    tags: [{ id: 42, name: 'VIP', negative: false }],
    segments: [],
    subscribers: [{ id: 1, email: 'a@b.com', phone_number: '+1234567890' }],
  },
  created_at: '2024-01-01 10:00:00',
  updated_at: '2024-01-02 10:00:00',
};

function createClient(fetchMock: MockFetch): CampaignsClient {
  return new CampaignsClient(createMockTransport(fetchMock));
}

describe('CampaignsClient', () => {
  let fetchMock: MockFetch;

  beforeEach(() => {
    fetchMock = createMockFetch();
  });

  describe('createEmailCampaign', () => {
    it('POSTs with message_type=1 hardcoded and maps response to camelCase', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ data: WIRE_CAMPAIGN }));
      const client = createClient(fetchMock);

      const result = await client.createEmailCampaign({
        sendoutType: 'marketing',
        tags: [{ id: 42, negative: false }],
      });

      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v3/editor/campaign');
      expect((init as RequestInit).method).toBe('POST');

      const body = JSON.parse((init as RequestInit).body as string);

      expect(body.message_type).toBe('1');
      expect(body.sendout_type).toBe('1');
      expect(body).not.toHaveProperty('messageType');
      expect(body).not.toHaveProperty('sendoutType');

      expect(result.id).toBe(100);
      expect(result.messageType.key).toBe('email');
      expect(result.sendoutType.key).toBe('marketing');
    });

    it('maps sendoutType: transactional → sendout_type: 2', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ data: WIRE_CAMPAIGN }));
      const client = createClient(fetchMock);

      await client.createEmailCampaign({ sendoutType: 'transactional' });

      const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);

      expect(body.sendout_type).toBe('2');
    });
  });

  describe('get', () => {
    it('returns the campaign as a camelCase entity on 200', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ data: WIRE_CAMPAIGN }));
      const client = createClient(fetchMock);

      const result = await client.get(100);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(100);
      expect(result!.messageType.key).toBe('email');
    });

    it('returns null on 404', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse({}, 404));
      const client = createClient(fetchMock);

      expect(await client.get(1)).toBeNull();
    });

    it('rethrows non-404 errors', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse({}, 500));
      const client = createClient(fetchMock);

      await expect(client.get(1)).rejects.toBeInstanceOf(RuleApiError);
    });
  });

  describe('setEmailCampaign', () => {
    it('PUTs full body in snake_case — no messageType in payload or body', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ data: WIRE_CAMPAIGN }));
      const client = createClient(fetchMock);

      const result = await client.setEmailCampaign(100, {
        name: 'Updated',
        sendoutType: 'marketing',
        tags: [{ id: 42, negative: false }],
        segments: [{ id: 7, negative: false }],
        subscribers: [101, 102],
      });

      expect(fetchMock.mock.calls).toHaveLength(1);
      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v3/editor/campaign/100');
      expect((init as RequestInit).method).toBe('PUT');

      const body = JSON.parse((init as RequestInit).body as string);

      expect(body).toEqual({
        name: 'Updated',
        sendout_type: '1',
        tags: [{ id: 42, negative: false }],
        segments: [{ id: 7, negative: false }],
        subscribers: [101, 102],
      });
      // messageType must NOT appear in the wire body (it's hardcoded as 1 on create only)
      expect(body).not.toHaveProperty('message_type');
      expect(result.id).toBe(100);
    });

    it('falls back to POST with message_type=1 when campaign does not exist (404)', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse({}, 404));
      fetchMock.mockResolvedValueOnce(createMockResponse({ data: WIRE_CAMPAIGN }));
      const client = createClient(fetchMock);

      await client.setEmailCampaign(1, {
        name: 'New',
        sendoutType: 'marketing',
        tags: [],
        segments: [],
        subscribers: [],
      });

      expect(fetchMock.mock.calls).toHaveLength(2);
      expect((fetchMock.mock.calls[0]![1] as RequestInit).method).toBe('PUT');
      expect((fetchMock.mock.calls[1]![1] as RequestInit).method).toBe('POST');

      const postBody = JSON.parse((fetchMock.mock.calls[1]![1] as RequestInit).body as string);

      // hardcoded email create
      expect(postBody.message_type).toBe('1');
    });

    it('rethrows non-404 errors', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse({}, 500));
      const client = createClient(fetchMock);

      await expect(
        client.setEmailCampaign(1, { name: 'N', sendoutType: 'marketing', tags: [], segments: [], subscribers: [] })
      ).rejects.toBeInstanceOf(RuleApiError);
    });
  });

  describe('updateEmailCampaign', () => {
    it('always does read-modify-write (GET + PUT)', async () => {
      fetchMock
        .mockResolvedValueOnce(createMockResponse({ data: WIRE_CAMPAIGN }))
        .mockResolvedValueOnce(createMockResponse({ data: WIRE_CAMPAIGN }));
      const client = createClient(fetchMock);

      await client.updateEmailCampaign(100, { name: 'New Name' });

      expect(fetchMock.mock.calls).toHaveLength(2);
      expect((fetchMock.mock.calls[0]![1] as RequestInit).method).toBe('GET');
      expect((fetchMock.mock.calls[1]![1] as RequestInit).method).toBe('PUT');
    });

    it('merges partial input — name-only update preserves existing recipients', async () => {
      fetchMock
        .mockResolvedValueOnce(createMockResponse({ data: WIRE_CAMPAIGN }))
        .mockResolvedValueOnce(createMockResponse({ data: WIRE_CAMPAIGN }));
      const client = createClient(fetchMock);

      await client.updateEmailCampaign(100, { name: 'New Name' });

      const putBody = JSON.parse((fetchMock.mock.calls[1]![1] as RequestInit).body as string);

      expect(putBody).toEqual({
        name: 'New Name',
        sendout_type: '1',
        tags: [{ id: 42, name: 'VIP', negative: false }],
        segments: [],
        subscribers: [1],
      });
    });

    it('maps sendoutType string to numeric wire value', async () => {
      fetchMock
        .mockResolvedValueOnce(createMockResponse({
          data: { ...WIRE_CAMPAIGN, sendout_type: { value: 1, key: 'marketing', description: 'Marketing' } },
        }))
        .mockResolvedValueOnce(createMockResponse({ data: WIRE_CAMPAIGN }));
      const client = createClient(fetchMock);

      await client.updateEmailCampaign(100, { sendoutType: 'transactional' });

      const putBody = JSON.parse((fetchMock.mock.calls[1]![1] as RequestInit).body as string);

      expect(putBody.sendout_type).toBe('2');
    });

    it('throws RuleApiError(404) when campaign does not exist', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse({}, 404));
      const client = createClient(fetchMock);

      await expect(client.updateEmailCampaign(999, { name: 'New' })).rejects.toThrow(/Campaign 999 not found/);
    });

    it('throws RuleClientError when existing record has no sendoutType', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ data: { id: 1, name: 'C', recipients: { tags: [] } } })
      );
      const client = createClient(fetchMock);

      await expect(client.updateEmailCampaign(1, { name: 'New' })).rejects.toThrow(/no sendout_type/);
    });
  });

  describe('convenience methods', () => {
    it('renameCampaign delegates to updateEmailCampaign with {name}', async () => {
      const client = createClient(fetchMock);
      const spy = vi.spyOn(client, 'updateEmailCampaign').mockResolvedValueOnce({} as never);

      await client.renameCampaign(42, 'New Name');

      expect(spy).toHaveBeenCalledWith(42, { name: 'New Name' });
    });

    it('setCampaignSendoutType delegates to updateEmailCampaign with {sendoutType}', async () => {
      const client = createClient(fetchMock);
      const spy = vi.spyOn(client, 'updateEmailCampaign').mockResolvedValueOnce({} as never);

      await client.setCampaignSendoutType(42, 'transactional');

      expect(spy).toHaveBeenCalledWith(42, { sendoutType: 'transactional' });
    });

    it('setCampaignTags delegates to updateEmailCampaign with {tags}', async () => {
      const client = createClient(fetchMock);
      const spy = vi.spyOn(client, 'updateEmailCampaign').mockResolvedValueOnce({} as never);
      const tags = [{ id: 10, negative: false }];

      await client.setCampaignTags(42, tags);

      expect(spy).toHaveBeenCalledWith(42, { tags });
    });

    it('setCampaignSegments delegates to updateEmailCampaign with {segments}', async () => {
      const client = createClient(fetchMock);
      const spy = vi.spyOn(client, 'updateEmailCampaign').mockResolvedValueOnce({} as never);
      const segments = [{ id: 5, negative: false }];

      await client.setCampaignSegments(42, segments);

      expect(spy).toHaveBeenCalledWith(42, { segments });
    });

    it('setCampaignSubscribers delegates to updateEmailCampaign with {subscribers}', async () => {
      const client = createClient(fetchMock);
      const spy = vi.spyOn(client, 'updateEmailCampaign').mockResolvedValueOnce({} as never);

      await client.setCampaignSubscribers(42, [101, 102]);

      expect(spy).toHaveBeenCalledWith(42, { subscribers: [101, 102] });
    });
  });

  describe('delete', () => {
    it('DELETEs the campaign and returns void', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ success: true }));
      const client = createClient(fetchMock);

      const result = await client.delete(1);

      expect(result).toBeUndefined();
    });
  });

  describe('copy', () => {
    it('POSTs to /editor/campaign/{id}/copy and returns camelCase entity', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ data: { ...WIRE_CAMPAIGN, id: 200 } }));
      const client = createClient(fetchMock);

      const result = await client.copy(100);

      expect(result.id).toBe(200);
      expect(fetchMock.mock.calls[0]![0]).toBe('https://app.rule.io/api/v3/editor/campaign/100/copy');
    });
  });

  describe('schedule', () => {
    it('sends now and returns void', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ success: true }));
      const client = createClient(fetchMock);

      const result = await client.schedule(1, { type: 'now' });

      expect(result).toBeUndefined();
      expect(JSON.parse((fetchMock.mock.calls[0]![1]!.body as string))).toEqual({ type: 'now' });
    });

    it('schedules with a datetime', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ success: true }));
      const client = createClient(fetchMock);

      await client.schedule(1, { type: 'schedule', datetime: '2025-06-15T10:00:00+02:00' });

      const body = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);

      expect(body).toEqual({ type: 'schedule', datetime: '2025-06-15T10:00:00+02:00' });
    });

    it('cancels with type: null', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ success: true }));
      const client = createClient(fetchMock);

      await client.schedule(1, { type: null });

      expect(JSON.parse(fetchMock.mock.calls[0]![1]!.body as string)).toEqual({ type: null });
    });
  });

  describe('listCampaigns', () => {
    it('returns Campaign[] and maps nested params to flat wire params', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ data: [WIRE_CAMPAIGN] }));
      const client = createClient(fetchMock);

      const result = await client.listCampaigns({
        filters: { messageType: 'email' },
        pagination: { page: 2, pageSize: 20 },
      });

      expect(result).toHaveLength(1);
      expect(result[0]!.messageType.key).toBe('email');

      const url = fetchMock.mock.calls[0]![0] as string;

      expect(url).toContain('page=2');
      expect(url).toContain('per_page=20');
      expect(url).toContain('message_type=1');
    });

    it('omits query string when no params provided', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ data: [] }));
      const client = createClient(fetchMock);

      await client.listCampaigns();

      expect(fetchMock.mock.calls[0]![0]).toBe('https://app.rule.io/api/v3/editor/campaign');
    });
  });

  describe('iterateCampaignsPages', () => {
    it('yields page arrays and stops when a page is smaller than pageSize', async () => {
      fetchMock
        .mockResolvedValueOnce(createMockResponse({ data: [WIRE_CAMPAIGN, WIRE_CAMPAIGN] }))
        .mockResolvedValueOnce(createMockResponse({ data: [WIRE_CAMPAIGN] }));
      const client = createClient(fetchMock);

      const pages: number[] = [];

      for await (const page of client.iterateCampaignsPages({ pagination: { pageSize: 2 } })) {
        pages.push(page.length);
      }

      expect(pages).toEqual([2, 1]);
    });
  });

  describe('listAllCampaigns', () => {
    it('collects all campaigns from all pages', async () => {
      const c2 = { ...WIRE_CAMPAIGN, id: 200 };

      fetchMock
        .mockResolvedValueOnce(createMockResponse({ data: [WIRE_CAMPAIGN, c2] }))
        .mockResolvedValueOnce(createMockResponse({ data: [] }));
      const client = createClient(fetchMock);

      const result = await client.listAllCampaigns({ pagination: { pageSize: 2 } });

      expect(result.map((c) => c.id)).toEqual([100, 200]);
    });
  });
});
