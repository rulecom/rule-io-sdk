import { beforeEach, describe, expect, it } from 'vitest';

import { RuleApiError } from '@rule-io/core';

import {
  createMock204Response,
  createMockErrorResponse,
  createMockFetch,
  createMockResponse,
  createMockTransport,
  type MockFetch,
} from '../../core/mock-fetch.js';
import { AccountsClient } from './accounts.client.js';

function createClient(fetchMock: MockFetch): AccountsClient {
  return new AccountsClient(createMockTransport(fetchMock));
}

describe('AccountsClient', () => {
  let fetchMock: MockFetch;

  beforeEach(() => {
    fetchMock = createMockFetch();
  });

  describe('list', () => {
    it('GETs /accounts', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({
          data: [
            { id: 1, name: 'A', created_at: '', updated_at: null },
            { id: 2, name: 'B', created_at: '', updated_at: null },
          ],
        })
      );
      const client = createClient(fetchMock);

      const result = await client.list();

      expect(result.data).toHaveLength(2);
      const url = fetchMock.mock.calls[0]![0] as string;

      expect(url).toBe('https://app.rule.io/api/v3/accounts');
    });

    it('propagates 401', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse({}, 401));
      const client = createClient(fetchMock);

      await expect(client.list()).rejects.toBeInstanceOf(RuleApiError);
    });
  });

  describe('create', () => {
    it('POSTs name and language', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({
          data: { id: 99, name: 'New', created_at: '', updated_at: null },
        })
      );
      const client = createClient(fetchMock);

      const result = await client.create({ name: 'New', language: 'en' });

      expect(result.data?.id).toBe(99);
      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v3/accounts');
      expect((init as RequestInit).method).toBe('POST');
      expect(JSON.parse((init as RequestInit).body as string)).toEqual({
        name: 'New',
        language: 'en',
      });
    });
  });

  describe('get', () => {
    it('returns the account by numeric id', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({
          data: { id: 42, name: 'My Account', created_at: '', updated_at: null },
        })
      );
      const client = createClient(fetchMock);

      const result = await client.get(42);

      expect(result?.data?.id).toBe(42);
      const url = fetchMock.mock.calls[0]![0] as string;

      expect(url).toBe('https://app.rule.io/api/v3/accounts/42');
    });

    it('accepts "show" as the accountId', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({
          data: { id: 1, name: 'Current', created_at: null, updated_at: null },
        })
      );
      const client = createClient(fetchMock);

      await client.get('show');

      const url = fetchMock.mock.calls[0]![0] as string;

      expect(url).toBe('https://app.rule.io/api/v3/accounts/show');
    });

    it('appends includes[] query params', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({
          data: {
            id: 42,
            name: 'Account',
            created_at: null,
            updated_at: null,
            sitoo_credentials: [
              { account_id: 42, api_id: 'abc', password: 'secret' },
            ],
          },
        })
      );
      const client = createClient(fetchMock);

      const result = await client.get(42, { includes: ['sitoo_credentials'] });

      expect(result?.data?.sitoo_credentials).toHaveLength(1);
      const url = fetchMock.mock.calls[0]![0] as string;

      expect(url).toBe(
        'https://app.rule.io/api/v3/accounts/42?includes%5B%5D=sitoo_credentials'
      );
    });

    it('returns null on 404', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse({}, 404));
      const client = createClient(fetchMock);

      expect(await client.get(999)).toBeNull();
    });

    it('rethrows non-404 errors', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse({}, 500));
      const client = createClient(fetchMock);

      await expect(client.get(42)).rejects.toBeInstanceOf(RuleApiError);
    });
  });

  describe('delete', () => {
    it('DELETEs the account', async () => {
      fetchMock.mockResolvedValueOnce(createMock204Response());
      const client = createClient(fetchMock);

      const result = await client.delete(42);

      expect(result).toEqual({ success: true });
      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v3/accounts/42');
      expect((init as RequestInit).method).toBe('DELETE');
    });

    it('propagates 403', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse({}, 403));
      const client = createClient(fetchMock);

      await expect(client.delete(42)).rejects.toBeInstanceOf(RuleApiError);
    });
  });
});
