import { beforeEach, describe, expect, it } from 'vitest';

import { RuleApiError } from '@rulecom/client';

import {
  createMock204Response,
  createMockErrorResponse,
  createMockFetch,
  createMockResponse,
  createMockTransport,
  type MockFetch,
} from '../../core/mock-fetch.js';
import { ApiKeysClient } from './api-keys.client.js';

function createClient(fetchMock: MockFetch): ApiKeysClient {
  return new ApiKeysClient(createMockTransport(fetchMock));
}

describe('ApiKeysClient', () => {
  let fetchMock: MockFetch;

  beforeEach(() => {
    fetchMock = createMockFetch();
  });

  describe('list', () => {
    it('GETs /api-keys', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({
          data: [
            { id: 1, name: 'Production', key: 'abc', created_at: '', updated_at: '' },
            { id: 2, name: 'Staging', key: 'def', created_at: '', updated_at: '' },
          ],
        })
      );
      const client = createClient(fetchMock);

      const result = await client.list();

      expect(result.data).toHaveLength(2);
      const url = fetchMock.mock.calls[0]![0] as string;

      expect(url).toBe('https://app.rule.io/api/v3/api-keys');
    });

    it('propagates 401', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse({}, 401));
      const client = createClient(fetchMock);

      await expect(client.list()).rejects.toBeInstanceOf(RuleApiError);
    });
  });

  describe('create', () => {
    it('POSTs the request body', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({
          data: { id: 3, name: 'New Key', key: 'ghi789', created_at: '', updated_at: '' },
        })
      );
      const client = createClient(fetchMock);

      const result = await client.create({ name: 'New Key' });

      expect(result.data?.key).toBe('ghi789');
      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v3/api-keys');
      expect((init as RequestInit).method).toBe('POST');
      expect(JSON.parse((init as RequestInit).body as string)).toEqual({ name: 'New Key' });
    });
  });

  describe('update', () => {
    it('PUTs the new name', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({
          data: { id: 5, name: 'Renamed', created_at: '', updated_at: '' },
        })
      );
      const client = createClient(fetchMock);

      await client.update(5, { name: 'Renamed' });

      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v3/api-keys/5');
      expect((init as RequestInit).method).toBe('PUT');
      expect(JSON.parse((init as RequestInit).body as string)).toEqual({ name: 'Renamed' });
    });
  });

  describe('delete', () => {
    it('DELETEs and returns success on 204', async () => {
      fetchMock.mockResolvedValueOnce(createMock204Response());
      const client = createClient(fetchMock);

      const result = await client.delete(5);

      expect(result).toEqual({ success: true });
      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v3/api-keys/5');
      expect((init as RequestInit).method).toBe('DELETE');
    });
  });
});
