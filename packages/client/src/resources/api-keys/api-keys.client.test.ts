import { beforeEach, describe, expect, it } from 'vitest';

import { RuleApiError } from '../../errors.js';

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
    it('GETs /api-keys and returns mapped entities', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({
          data: [
            { id: 1, name: 'Production', key: 'abc', created_at: '2024-01-01', updated_at: '2024-01-02' },
            { id: 2, name: 'Staging', key: 'def', created_at: '2024-02-01', updated_at: '2024-02-02' },
          ],
        })
      );
      const client = createClient(fetchMock);

      const result = await client.list();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 1,
        name: 'Production',
        key: 'abc',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02',
      });
      const url = fetchMock.mock.calls[0]![0] as string;

      expect(url).toBe('https://app.rule.io/api/v3/api-keys');
    });

    it('returns empty array when data is missing', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({}));
      const client = createClient(fetchMock);

      const result = await client.list();

      expect(result).toEqual([]);
    });

    it('propagates 401', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse({}, 401));
      const client = createClient(fetchMock);

      await expect(client.list()).rejects.toBeInstanceOf(RuleApiError);
    });
  });

  describe('create', () => {
    it('POSTs the request body and returns mapped entity', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({
          data: { id: 3, name: 'New Key', key: 'ghi789', created_at: '2024-03-01', updated_at: '2024-03-01' },
        })
      );
      const client = createClient(fetchMock);

      const result = await client.create({ name: 'New Key' });

      expect(result.id).toBe(3);
      expect(result.name).toBe('New Key');
      expect(result.key).toBe('ghi789');
      expect(result.createdAt).toBe('2024-03-01');

      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v3/api-keys');
      expect((init as RequestInit).method).toBe('POST');
      expect(JSON.parse((init as RequestInit).body as string)).toEqual({ name: 'New Key' });
    });
  });

  describe('update', () => {
    it('PUTs the new name and returns mapped entity', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({
          data: { id: 5, name: 'Renamed', created_at: '2024-01-01', updated_at: '2024-04-01' },
        })
      );
      const client = createClient(fetchMock);

      const result = await client.update(5, { name: 'Renamed' });

      expect(result.id).toBe(5);
      expect(result.name).toBe('Renamed');
      expect(result.updatedAt).toBe('2024-04-01');

      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v3/api-keys/5');
      expect((init as RequestInit).method).toBe('PUT');
      expect(JSON.parse((init as RequestInit).body as string)).toEqual({ name: 'Renamed' });
    });
  });

  describe('delete', () => {
    it('DELETEs and resolves on 204', async () => {
      fetchMock.mockResolvedValueOnce(createMock204Response());
      const client = createClient(fetchMock);

      await expect(client.delete(5)).resolves.toBeUndefined();

      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v3/api-keys/5');
      expect((init as RequestInit).method).toBe('DELETE');
    });
  });
});
