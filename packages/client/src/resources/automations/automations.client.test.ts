import { beforeEach, describe, expect, it } from 'vitest';

import { RuleApiError } from '@rulecom/core';

import {
  createMockErrorResponse,
  createMockFetch,
  createMockResponse,
  createMockTransport,
  type MockFetch,
} from '../../core/mock-fetch.js';
import { AutomationsClient } from './automations.client.js';

function createClient(fetchMock: MockFetch): AutomationsClient {
  return new AutomationsClient(createMockTransport(fetchMock));
}

describe('AutomationsClient', () => {
  let fetchMock: MockFetch;

  beforeEach(() => {
    fetchMock = createMockFetch();
  });

  describe('create', () => {
    it('POSTs to v3 /editor/automail with json content-type', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ data: { id: 123, name: 'Test Automation' } })
      );
      const client = createClient(fetchMock);

      const result = await client.create({ name: 'Test Automation' });

      expect(result.data?.id).toBe(123);
      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v3/editor/automail');
      expect((init as RequestInit).method).toBe('POST');
      const headers = (init as RequestInit).headers as Record<string, string>;

      expect(headers['Content-Type']).toBe('application/json;charset=utf-8');
    });

    it('forwards trigger and sendout_type in the body', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({
          data: { id: 456, name: 'Triggered', trigger: { type: 'TAG', id: 42 } },
        })
      );
      const client = createClient(fetchMock);

      await client.create({
        name: 'Triggered',
        trigger: { type: 'TAG', id: 42 },
        sendout_type: 2,
      });

      const body = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);

      expect(body.trigger).toEqual({ type: 'TAG', id: 42 });
      expect(body.sendout_type).toBe(2);
    });
  });

  describe('get', () => {
    it('returns the automation on 200', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ data: { id: 1, name: 'A' } })
      );
      const client = createClient(fetchMock);

      const result = await client.get(1);

      expect(result?.data?.id).toBe(1);
      const url = fetchMock.mock.calls[0]![0] as string;

      expect(url).toBe('https://app.rule.io/api/v3/editor/automail/1');
    });

    it('returns null on 404', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse({ error: 'Not found' }, 404));
      const client = createClient(fetchMock);

      expect(await client.get(99999)).toBeNull();
    });

    it('rethrows non-404 errors', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse({}, 500));
      const client = createClient(fetchMock);

      await expect(client.get(1)).rejects.toBeInstanceOf(RuleApiError);
    });
  });

  describe('update', () => {
    it('PUTs the full update body when provided', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ data: { id: 1, name: 'Updated', active: true } })
      );
      const client = createClient(fetchMock);

      await client.update(1, {
        name: 'Updated',
        active: true,
        trigger: { type: 'TAG', id: 42 },
        sendout_type: 2,
      });

      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v3/editor/automail/1');
      expect((init as RequestInit).method).toBe('PUT');
      const body = JSON.parse((init as RequestInit).body as string);

      expect(body).toEqual({
        name: 'Updated',
        active: true,
        trigger: { type: 'TAG', id: 42 },
        sendout_type: 2,
      });
    });

    it('does a read-modify-write for a partial update (only name provided)', async () => {
      // GET call: returns existing automation with all required fields
      fetchMock.mockResolvedValueOnce(
        createMockResponse({
          data: {
            id: 1,
            name: 'Old Name',
            active: true,
            trigger: { type: 'TAG', id: 10 },
            sendout_type: { value: 1, key: 'CAMPAIGN', description: 'Campaign' },
          },
        })
      );
      // PUT call: returns updated automation
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ data: { id: 1, name: 'Renamed' } })
      );
      const client = createClient(fetchMock);

      await client.update(1, { name: 'Renamed' });

      // First call should be the GET
      const [getUrl] = fetchMock.mock.calls[0]!;

      expect((getUrl as string)).toContain('/editor/automail/1');
      expect((fetchMock.mock.calls[0]![1] as RequestInit).method).toBe('GET');

      // Second call should be the PUT with the merged full body
      const [putUrl, putInit] = fetchMock.mock.calls[1]!;

      expect(putUrl as string).toContain('/editor/automail/1');
      expect((putInit as RequestInit).method).toBe('PUT');
      const body = JSON.parse((putInit as RequestInit).body as string);

      expect(body).toEqual({
        name: 'Renamed',
        active: true,
        trigger: { type: 'TAG', id: 10 },
        sendout_type: 1,
      });
    });
  });

  describe('delete', () => {
    it('DELETEs the automation', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ success: true }));
      const client = createClient(fetchMock);

      const result = await client.delete(1);

      expect(result.success).toBe(true);
      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v3/editor/automail/1');
      expect((init as RequestInit).method).toBe('DELETE');
    });
  });

  describe('list', () => {
    it('serializes filtering params into the query string', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({
          data: [{ id: 1, name: 'Auto 1' }, { id: 2, name: 'Auto 2' }],
        })
      );
      const client = createClient(fetchMock);

      const result = await client.list({ page: 2, per_page: 20, active: true });

      expect(result.data).toHaveLength(2);
      const url = fetchMock.mock.calls[0]![0] as string;

      expect(url).toContain('/editor/automail?');
      expect(url).toContain('page=2');
      expect(url).toContain('per_page=20');
      expect(url).toContain('active=true');
    });

    it('omits the query string when no params are provided', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ data: [] }));
      const client = createClient(fetchMock);

      await client.list();

      const url = fetchMock.mock.calls[0]![0] as string;

      expect(url).toBe('https://app.rule.io/api/v3/editor/automail');
      expect(url).not.toContain('?');
    });

    it('passes the `query` filter through', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ data: [{ id: 1, name: 'Welcome' }] })
      );
      const client = createClient(fetchMock);

      await client.list({ query: 'Welcome' });

      const url = fetchMock.mock.calls[0]![0] as string;

      expect(url).toContain('query=Welcome');
    });
  });
});
