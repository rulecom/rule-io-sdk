import { beforeEach, describe, expect, it } from 'vitest';

import { RuleApiError } from '@rulecom/client';
import { RuleClientError } from '@rulecom/client';

import {
  createMockErrorResponse,
  createMockFetch,
  createMockResponse,
  createMockTransport,
  type MockFetch,
} from '../../core/mock-fetch.js';
import { AnalyticsClient } from './analytics.client.js';
import type { RuleAnalyticsParams } from './analytics.types.js';

function createClient(fetchMock: MockFetch): AnalyticsClient {
  return new AnalyticsClient(createMockTransport(fetchMock));
}

describe('AnalyticsClient', () => {
  let fetchMock: MockFetch;

  beforeEach(() => {
    fetchMock = createMockFetch();
  });

  describe('get', () => {
    it('serializes the full query into the URL', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({
          data: [
            {
              id: 123,
              metrics: [
                { metric: 'sent', value: 1000 },
                { metric: 'open_uniq', value: 450 },
              ],
            },
          ],
        })
      );
      const client = createClient(fetchMock);

      const result = await client.get({
        date_from: '2024-01-01',
        date_to: '2024-01-31',
        object_type: 'CAMPAIGN',
        object_ids: ['123'],
        metrics: ['sent', 'open_uniq'],
      });

      expect(result.data?.[0].id).toBe(123);
      const url = fetchMock.mock.calls[0]![0] as string;

      expect(url).toContain('/analytics?');
      expect(url).toContain('date_from=2024-01-01');
      expect(url).toContain('date_to=2024-01-31');
      expect(url).toContain('object_type=CAMPAIGN');
      expect(url).toContain('object_ids%5B%5D=123');
      expect(url).toContain('metrics%5B%5D=sent');
      expect(url).toContain('metrics%5B%5D=open_uniq');
    });

    it('emits one entry per metric and per object id', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ data: [] }));
      const client = createClient(fetchMock);

      await client.get({
        date_from: '2024-01-01',
        date_to: '2024-01-31',
        object_type: 'JOURNEY',
        object_ids: ['10', '20', '30'],
        metrics: ['open', 'click', 'unsubscribe', 'spam'],
      });

      const url = fetchMock.mock.calls[0]![0] as string;

      expect(url.match(/object_ids%5B%5D/g) ?? []).toHaveLength(3);
      expect(url.match(/metrics%5B%5D/g) ?? []).toHaveLength(4);
    });

    it('includes message_type when provided', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ data: [] }));
      const client = createClient(fetchMock);

      await client.get({
        date_from: '2024-01-01',
        date_to: '2024-01-31',
        object_type: 'AUTOMAIL',
        object_ids: ['1'],
        metrics: ['click'],
        message_type: 'email',
      });

      const url = fetchMock.mock.calls[0]![0] as string;

      expect(url).toContain('message_type=email');
    });

    it('omits object_type/object_ids/metrics when only dates are passed', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ data: [] }));
      const client = createClient(fetchMock);

      await client.get({ date_from: '2024-01-01', date_to: '2024-01-31' });

      const url = fetchMock.mock.calls[0]![0] as string;

      expect(url).toContain('date_from=2024-01-01');
      expect(url).not.toContain('object_type');
      expect(url).not.toContain('object_ids');
      expect(url).not.toContain('metrics');
    });

    it('throws RuleClientError when object_ids is empty', async () => {
      const client = createClient(fetchMock);

      await expect(
        client.get({
          date_from: '2024-01-01',
          date_to: '2024-01-31',
          object_type: 'CAMPAIGN',
          object_ids: [],
          metrics: ['sent'],
        })
      ).rejects.toThrow(/object_ids must be a non-empty array/);
    });

    it('throws RuleClientError when metrics is empty', async () => {
      const client = createClient(fetchMock);

      await expect(
        client.get({
          date_from: '2024-01-01',
          date_to: '2024-01-31',
          object_type: 'CAMPAIGN',
          object_ids: ['1'],
          metrics: [],
        })
      ).rejects.toThrow(/metrics must be a non-empty array/);
    });

    it('throws RuleClientError when object_ids/metrics are passed without object_type', async () => {
      const client = createClient(fetchMock);

      await expect(
        client.get({
          date_from: '2024-01-01',
          date_to: '2024-01-31',
          object_ids: ['1'],
          metrics: ['sent'],
        } as RuleAnalyticsParams)
      ).rejects.toThrow(/object_ids and metrics require object_type/);
    });

    it('uses GET', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ data: [] }));
      const client = createClient(fetchMock);

      await client.get({
        date_from: '2024-01-01',
        date_to: '2024-01-31',
        object_type: 'TRANSACTIONAL_NAME',
        object_ids: ['1'],
        metrics: ['sent'],
      });

      const init = fetchMock.mock.calls[0]![1] as RequestInit;

      expect(init.method).toBe('GET');
    });

    it('propagates 422 from the API', async () => {
      const client = createClient(fetchMock);

      fetchMock.mockResolvedValueOnce(createMockErrorResponse({}, 422));

      await expect(
        client.get({
          date_from: '2024-01-31',
          date_to: '2024-01-01',
          object_type: 'CAMPAIGN',
          object_ids: ['1'],
          metrics: ['sent'],
        })
      ).rejects.toBeInstanceOf(RuleApiError);
    });

    it('rejects RuleClientError synchronously without calling fetch', async () => {
      const client = createClient(fetchMock);

      await expect(
        client.get({
          date_from: '2024-01-01',
          date_to: '2024-01-31',
          object_type: 'CAMPAIGN',
          object_ids: [],
          metrics: ['sent'],
        })
      ).rejects.toBeInstanceOf(RuleClientError);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
