import { beforeEach, describe, expect, it } from 'vitest';

import { RuleApiError } from '../../errors.js';
import { RuleClientError } from '../../errors.js';

import {
  createMock204Response,
  createMockErrorResponse,
  createMockFetch,
  createMockTransport,
  type MockFetch,
} from '../../core/mock-fetch.js';
import { SuppressionsClient } from './suppressions.client.js';

function createClient(fetchMock: MockFetch): SuppressionsClient {
  return new SuppressionsClient(createMockTransport(fetchMock));
}

describe('SuppressionsClient', () => {
  let fetchMock: MockFetch;

  beforeEach(() => {
    fetchMock = createMockFetch();
  });

  describe('create', () => {
    it('POSTs to /suppressions/ and returns success on 204', async () => {
      fetchMock.mockResolvedValueOnce(createMock204Response());
      const client = createClient(fetchMock);

      const result = await client.create({
        subscribers: [{ email: 'a@b.c' }, { email: 'd@e.f' }],
      });

      expect(result).toEqual({ success: true });
      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v3/suppressions/');
      expect((init as RequestInit).method).toBe('POST');
      const body = JSON.parse((init as RequestInit).body as string);

      expect(body.subscribers).toHaveLength(2);
    });

    it('forwards message_types and callback_url', async () => {
      fetchMock.mockResolvedValueOnce(createMock204Response());
      const client = createClient(fetchMock);

      await client.create({
        subscribers: [{ email: 'a@b.c' }],
        message_types: ['email'],
        callback_url: 'https://example.com/done',
      });

      const body = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);

      expect(body.message_types).toEqual(['email']);
      expect(body.callback_url).toBe('https://example.com/done');
    });

    it('rejects an empty subscribers array without calling fetch', async () => {
      const client = createClient(fetchMock);

      await expect(client.create({ subscribers: [] })).rejects.toThrow(RuleClientError);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('rejects more than 1000 subscribers', async () => {
      const client = createClient(fetchMock);
      const subscribers = Array.from({ length: 1001 }, (_, i) => ({
        email: `u${i}@example.com`,
      }));

      await expect(client.create({ subscribers })).rejects.toThrow(/exceed 1000/);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('propagates non-2xx errors as RuleApiError', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse({}, 429));
      const client = createClient(fetchMock);

      await expect(
        client.create({ subscribers: [{ email: 'a@b.c' }] })
      ).rejects.toBeInstanceOf(RuleApiError);
    });
  });

  describe('delete', () => {
    it('DELETEs to /suppressions/ with the body', async () => {
      fetchMock.mockResolvedValueOnce(createMock204Response());
      const client = createClient(fetchMock);

      const result = await client.delete({
        subscribers: [{ email: 'a@b.c' }],
      });

      expect(result).toEqual({ success: true });
      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v3/suppressions/');
      expect((init as RequestInit).method).toBe('DELETE');
      const body = JSON.parse((init as RequestInit).body as string);

      expect(body.subscribers).toHaveLength(1);
    });

    it('forwards message_types and callback_url', async () => {
      fetchMock.mockResolvedValueOnce(createMock204Response());
      const client = createClient(fetchMock);

      await client.delete({
        subscribers: [{ email: 'a@b.c' }],
        message_types: ['text_message'],
        callback_url: 'https://example.com/done',
      });

      const body = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);

      expect(body.message_types).toEqual(['text_message']);
      expect(body.callback_url).toBe('https://example.com/done');
    });

    it('rejects an empty subscribers array', async () => {
      const client = createClient(fetchMock);

      await expect(client.delete({ subscribers: [] })).rejects.toThrow(RuleClientError);
    });

    it('rejects more than 1000 subscribers', async () => {
      const client = createClient(fetchMock);
      const subscribers = Array.from({ length: 1001 }, (_, i) => ({
        email: `u${i}@example.com`,
      }));

      await expect(client.delete({ subscribers })).rejects.toThrow(/exceed 1000/);
    });
  });
});
