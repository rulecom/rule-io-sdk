import { beforeEach, describe, expect, it } from 'vitest';

import { RuleApiError } from '@rulecom/core';

import {
  createMockErrorResponse,
  createMockFetch,
  createMockResponse,
  createMockTransport,
  type MockFetch,
} from '../../core/mock-fetch.js';
import { MessagesClient } from './messages.client.js';

function createClient(fetchMock: MockFetch): MessagesClient {
  return new MessagesClient(createMockTransport(fetchMock));
}

describe('MessagesClient', () => {
  let fetchMock: MockFetch;

  beforeEach(() => {
    fetchMock = createMockFetch();
  });

  describe('create', () => {
    it('POSTs to v3 /editor/message', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ data: { id: 10, name: 'M', subject: 'S' } })
      );
      const client = createClient(fetchMock);

      const result = await client.create({
        dispatcher: { id: 1, type: 'automail' },
        type: 1,
        subject: 'S',
      });

      expect(result.data?.id).toBe(10);
      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v3/editor/message');
      expect((init as RequestInit).method).toBe('POST');
    });
  });

  describe('get', () => {
    it('returns the message on 200', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ data: { id: 5, name: 'X', subject: 'Y' } })
      );
      const client = createClient(fetchMock);

      expect((await client.get(5))?.data?.id).toBe(5);
    });

    it('returns null on 404', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse({}, 404));
      const client = createClient(fetchMock);

      expect(await client.get(5)).toBeNull();
    });

    it('rethrows non-404 errors', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse({}, 500));
      const client = createClient(fetchMock);

      await expect(client.get(5)).rejects.toBeInstanceOf(RuleApiError);
    });
  });

  describe('update', () => {
    it('PUTs the partial update body', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ data: { id: 5, name: 'X', subject: 'Updated' } })
      );
      const client = createClient(fetchMock);

      await client.update(5, { subject: 'Updated' });

      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v3/editor/message/5');
      expect((init as RequestInit).method).toBe('PUT');
      const body = JSON.parse((init as RequestInit).body as string);

      expect(body).toEqual({ subject: 'Updated' });
    });
  });

  describe('delete', () => {
    it('DELETEs the message', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ success: true }));
      const client = createClient(fetchMock);

      const result = await client.delete(5);

      expect(result.success).toBe(true);
      const url = fetchMock.mock.calls[0]![0] as string;

      expect(url).toBe('https://app.rule.io/api/v3/editor/message/5');
    });
  });

  describe('list', () => {
    it('requires both id and dispatcher_type and serializes them into the query string', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ data: [{ id: 10, name: 'Msg', subject: 'X' }] })
      );
      const client = createClient(fetchMock);

      const result = await client.list({ id: 123, dispatcher_type: 'automail' });

      expect(result.data).toHaveLength(1);
      const url = fetchMock.mock.calls[0]![0] as string;

      expect(url).toContain('id=123');
      expect(url).toContain('dispatcher_type=automail');
    });
  });
});
