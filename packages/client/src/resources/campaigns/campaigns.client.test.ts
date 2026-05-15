import { beforeEach, describe, expect, it } from 'vitest';

import { RuleApiError } from '../../errors.js';

import {
  createMockErrorResponse,
  createMockFetch,
  createMockResponse,
  createMockTransport,
  type MockFetch,
} from '../../core/mock-fetch.js';
import { CampaignsClient } from './campaigns.client.js';

function createClient(fetchMock: MockFetch): CampaignsClient {
  return new CampaignsClient(createMockTransport(fetchMock));
}

describe('CampaignsClient', () => {
  let fetchMock: MockFetch;

  beforeEach(() => {
    fetchMock = createMockFetch();
  });

  describe('create', () => {
    it('POSTs to v3 /editor/campaign', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ data: { id: 100, name: 'C' } })
      );
      const client = createClient(fetchMock);

      const result = await client.create({
        name: 'C',
        message_type: 1,
        sendout_type: 1,
        tags: [{ id: 42, negative: false }],
      });

      expect(result.data?.id).toBe(100);
      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v3/editor/campaign');
      expect((init as RequestInit).method).toBe('POST');
      const body = JSON.parse((init as RequestInit).body as string);

      expect(body.tags).toEqual([{ id: 42, negative: false }]);
    });
  });

  describe('get', () => {
    it('returns the campaign on 200', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ data: { id: 1, name: 'C' } })
      );
      const client = createClient(fetchMock);

      expect((await client.get(1))?.data?.id).toBe(1);
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

  describe('update', () => {
    it('fast path: PUTs full body when all required fields provided', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ data: { id: 1, name: 'Updated' } })
      );
      const client = createClient(fetchMock);

      await client.update(1, {
        name: 'Updated',
        sendout_type: 1,
        tags: [{ id: 42, negative: false }],
      });

      // Only one call — no GET
      expect(fetchMock.mock.calls.length).toBe(1);
      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v3/editor/campaign/1');
      expect((init as RequestInit).method).toBe('PUT');
      const body = JSON.parse((init as RequestInit).body as string);

      expect(body).toEqual({
        name: 'Updated',
        sendout_type: 1,
        tags: [{ id: 42, negative: false }],
        segments: undefined,
        subscribers: undefined,
      });
    });

    it('slow path: read-modify-write for partial updates', async () => {
      // GET response — existing campaign
      fetchMock.mockResolvedValueOnce(
        createMockResponse({
          data: {
            id: 1,
            name: 'Old Name',
            sendout_type: { value: 1, key: 'marketing', description: 'Marketing' },
            recipients: {
              tags: [{ id: 42, negative: false }],
              segments: [],
              subscribers: [],
            },
          },
        })
      );
      // PUT response — updated campaign
      fetchMock.mockResolvedValueOnce(
        createMockResponse({
          data: {
            id: 1,
            name: 'New Name',
            sendout_type: { value: 1, key: 'marketing', description: 'Marketing' },
            recipients: {
              tags: [{ id: 42, negative: false }],
              segments: [],
              subscribers: [],
            },
          },
        })
      );
      const client = createClient(fetchMock);

      await client.update(1, { name: 'New Name' });

      // Two calls: GET, then PUT
      expect(fetchMock.mock.calls.length).toBe(2);

      // First call: GET
      const [getUrl, getInit] = fetchMock.mock.calls[0]!;

      expect(getUrl).toBe('https://app.rule.io/api/v3/editor/campaign/1');
      expect((getInit as RequestInit).method).toBe('GET');

      // Second call: PUT with merged full body
      const [putUrl, putInit] = fetchMock.mock.calls[1]!;

      expect(putUrl).toBe('https://app.rule.io/api/v3/editor/campaign/1');
      expect((putInit as RequestInit).method).toBe('PUT');
      const putBody = JSON.parse((putInit as RequestInit).body as string);

      expect(putBody).toEqual({
        name: 'New Name', // from update
        sendout_type: 1, // coerced from { value: 1, ... }
        tags: [{ id: 42, negative: false }], // from existing
        segments: [],
        subscribers: [],
      });
    });

    it('throws 404 when campaign does not exist', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse({}, 404));
      const client = createClient(fetchMock);

      await expect(client.update(999, { name: 'New' })).rejects.toThrow(
        /Campaign 999 not found/
      );
    });

    it('throws RuleClientError when merged record lacks sendout_type', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({
          data: {
            id: 1,
            name: 'C',
            recipients: {
              tags: [{ id: 42, negative: false }],
            },
          },
        })
      );
      const client = createClient(fetchMock);

      await expect(client.update(1, { name: 'New' })).rejects.toThrow(
        /existing record has no sendout_type/
      );
    });

    it('throws RuleClientError when merged record lacks tags', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({
          data: {
            id: 1,
            name: 'C',
            sendout_type: { value: 1, key: 'marketing', description: 'Marketing' },
            recipients: {},
          },
        })
      );
      const client = createClient(fetchMock);

      await expect(client.update(1, { name: 'New' })).rejects.toThrow(
        /existing record has no tags/
      );
    });

    it('accepts numeric sendout_type in fast path', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ data: { id: 1, name: 'Updated' } })
      );
      const client = createClient(fetchMock);

      await client.update(1, {
        name: 'Updated',
        sendout_type: 2, // numeric
        tags: [],
      });

      const putBody = JSON.parse(
        (fetchMock.mock.calls[0]![1] as RequestInit).body as string,
      );

      expect(putBody.sendout_type).toBe(2);
    });

    it('coerces response wrapper sendout_type in slow path', async () => {
      // GET response with sendout_type as response wrapper
      fetchMock.mockResolvedValueOnce(
        createMockResponse({
          data: {
            id: 1,
            name: 'C',
            sendout_type: { value: 2, key: 'transactional', description: 'Transactional' },
            recipients: { tags: [] },
          },
        })
      );
      fetchMock.mockResolvedValueOnce(
        createMockResponse({
          data: { id: 1, name: 'Updated' },
        })
      );
      const client = createClient(fetchMock);

      await client.update(1, { name: 'Updated' });

      const putBody = JSON.parse(
        (fetchMock.mock.calls[1]![1] as RequestInit).body as string,
      );

      expect(putBody.sendout_type).toBe(2); // coerced to numeric
    });
  });

  describe('delete', () => {
    it('DELETEs the campaign', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ success: true }));
      const client = createClient(fetchMock);

      const result = await client.delete(1);

      expect(result.success).toBe(true);
    });
  });

  describe('list', () => {
    it('serializes pagination + filter params', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ data: [{ id: 1, name: 'A' }] })
      );
      const client = createClient(fetchMock);

      await client.list({ page: 2, per_page: 20, message_type: 1 });

      const url = fetchMock.mock.calls[0]![0] as string;

      expect(url).toContain('/editor/campaign?');
      expect(url).toContain('page=2');
      expect(url).toContain('per_page=20');
      expect(url).toContain('message_type=1');
    });

    it('omits the query string when no params are provided', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ data: [] }));
      const client = createClient(fetchMock);

      await client.list();

      const url = fetchMock.mock.calls[0]![0] as string;

      expect(url).toBe('https://app.rule.io/api/v3/editor/campaign');
    });
  });

  describe('copy', () => {
    it('POSTs to /editor/campaign/{id}/copy', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ data: { id: 2, name: 'C copy' } })
      );
      const client = createClient(fetchMock);

      const result = await client.copy(1);

      expect(result.data?.id).toBe(2);
      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v3/editor/campaign/1/copy');
      expect((init as RequestInit).method).toBe('POST');
    });
  });

  describe('schedule', () => {
    it('sends now', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ success: true }));
      const client = createClient(fetchMock);

      await client.schedule(1, { type: 'now' });

      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v3/editor/campaign/1/schedule');
      const body = JSON.parse((init as RequestInit).body as string);

      expect(body).toEqual({ type: 'now' });
    });

    it('schedules with a datetime', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ success: true }));
      const client = createClient(fetchMock);

      await client.schedule(1, { type: 'schedule', datetime: '2025-06-15 10:00:00' });

      const body = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);

      expect(body).toEqual({ type: 'schedule', datetime: '2025-06-15 10:00:00' });
    });

    it('cancels with type: null', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ success: true }));
      const client = createClient(fetchMock);

      await client.schedule(1, { type: null });

      const body = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);

      expect(body).toEqual({ type: null });
    });
  });
});
