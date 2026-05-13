import { beforeEach, describe, expect, it } from 'vitest';

import { RuleApiError } from '@rulecom/client';

import {
  createMockErrorResponse,
  createMockFetch,
  createMockResponse,
  createMockTransport,
  type MockFetch,
} from '../../core/mock-fetch.js';
import { DynamicSetsClient } from './dynamic-sets.client.js';

function createClient(fetchMock: MockFetch): DynamicSetsClient {
  return new DynamicSetsClient(createMockTransport(fetchMock));
}

describe('DynamicSetsClient', () => {
  let fetchMock: MockFetch;

  beforeEach(() => {
    fetchMock = createMockFetch();
  });

  describe('create', () => {
    it('POSTs to v3 /editor/dynamic-set', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ data: { id: 200, message_id: 1, template_id: 2 } })
      );
      const client = createClient(fetchMock);

      const result = await client.create({ message_id: 1, template_id: 2 });

      expect(result.data?.id).toBe(200);
      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v3/editor/dynamic-set');
      expect((init as RequestInit).method).toBe('POST');
    });
  });

  describe('get', () => {
    it('returns the dynamic set on 200', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ data: { id: 5, message_id: 1, template_id: 2 } })
      );
      const client = createClient(fetchMock);

      expect((await client.get(5))?.data?.id).toBe(5);
    });

    it('returns null on 404', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse({}, 404));
      const client = createClient(fetchMock);

      expect(await client.get(99999)).toBeNull();
    });

    it('rethrows non-404 errors', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse({}, 500));
      const client = createClient(fetchMock);

      await expect(client.get(5)).rejects.toBeInstanceOf(RuleApiError);
    });
  });

  describe('update', () => {
    it('PUTs the update body', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ data: { id: 200, message_id: 456, template_id: 101 } })
      );
      const client = createClient(fetchMock);

      const result = await client.update(200, {
        message_id: 456,
        template_id: 101,
        active: true,
      });

      expect(result.data?.id).toBe(200);
      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v3/editor/dynamic-set/200');
      expect((init as RequestInit).method).toBe('PUT');
      const body = JSON.parse((init as RequestInit).body as string);

      expect(body).toEqual({ message_id: 456, template_id: 101, active: true });
    });
  });

  describe('delete', () => {
    it('DELETEs the dynamic set', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ success: true }));
      const client = createClient(fetchMock);

      const result = await client.delete(5);

      expect(result.success).toBe(true);
    });
  });

  describe('list', () => {
    it('requires message_id and serializes it into the query string', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ data: [{ id: 200, message_id: 456, template_id: 789 }] })
      );
      const client = createClient(fetchMock);

      const result = await client.list({ message_id: 456 });

      expect(result.data).toHaveLength(1);
      const url = fetchMock.mock.calls[0]![0] as string;

      expect(url).toContain('message_id=456');
    });
  });
});
