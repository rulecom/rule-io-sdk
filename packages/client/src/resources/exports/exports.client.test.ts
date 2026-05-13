import { beforeEach, describe, expect, it } from 'vitest';

import { RuleApiError } from '@rulecom/client';

import {
  createMockErrorResponse,
  createMockFetch,
  createMockResponse,
  createMockTransport,
  type MockFetch,
} from '../../core/mock-fetch.js';
import { ExportsClient } from './exports.client.js';

function createClient(fetchMock: MockFetch): ExportsClient {
  return new ExportsClient(createMockTransport(fetchMock));
}

describe('ExportsClient', () => {
  let fetchMock: MockFetch;

  beforeEach(() => {
    fetchMock = createMockFetch();
  });

  describe('dispatchers', () => {
    it('GETs /export/dispatcher with date range', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({
          data: [
            {
              created_at: '2024-01-01',
              updated_at: '2024-01-01',
              account_id: 1,
              account_name: 'A',
              dispatcher_id: 100,
              dispatcher_name: 'X',
              dispatcher_type: 'automail',
              channel: 'email',
              filters: '',
              utm_campaign: '',
              utm_term: '',
              journey_id: '',
              journey_name: '',
              variable_set_ids: '',
            },
          ],
        })
      );
      const client = createClient(fetchMock);

      const result = await client.dispatchers({
        date_from: '2024-01-01',
        date_to: '2024-01-02',
      });

      expect(result.data).toHaveLength(1);
      const url = fetchMock.mock.calls[0]![0] as string;

      expect(url).toContain('/api/v3/export/dispatcher');
      expect(url).toContain('date_from=2024-01-01');
      expect(url).toContain('date_to=2024-01-02');
    });

    it('returns empty data unchanged', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ data: [] }));
      const client = createClient(fetchMock);

      const result = await client.dispatchers({
        date_from: '2024-01-01',
        date_to: '2024-01-02',
      });

      expect(result.data).toEqual([]);
    });

    it('propagates API errors', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse({}, 401));
      const client = createClient(fetchMock);

      await expect(
        client.dispatchers({ date_from: '2024-01-01', date_to: '2024-01-02' })
      ).rejects.toBeInstanceOf(RuleApiError);
    });
  });

  describe('subscribers', () => {
    it('GETs /export/subscriber with date range', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({
          data: [
            {
              created_at: '2024-01-10',
              updated_at: '2024-01-10',
              account_id: 1,
              account_name: 'A',
              subscriber_id: 500,
              email: 'u@example.com',
              phone_number: '+46701234567',
              opt_in_date: '2024-01-10',
            },
          ],
        })
      );
      const client = createClient(fetchMock);

      const result = await client.subscribers({
        date_from: '2024-01-01',
        date_to: '2024-01-31',
      });

      expect(result.data?.[0].subscriber_id).toBe(500);
      const url = fetchMock.mock.calls[0]![0] as string;

      expect(url).toContain('/api/v3/export/subscriber');
    });
  });

  describe('statistics', () => {
    it('GETs /export/statistics with token-based pagination params', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ data: [], next_page_token: null })
      );
      const client = createClient(fetchMock);

      await client.statistics({
        date_from: '2024-01-01',
        date_to: '2024-01-31',
        next_page_token: 'token-abc',
        statistic_types: ['open', 'link'],
      });

      const url = fetchMock.mock.calls[0]![0] as string;

      expect(url).toContain('next_page_token=token-abc');
      expect(url).toContain('statistic_types%5B%5D=open');
      expect(url).toContain('statistic_types%5B%5D=link');
    });

    it('omits next_page_token when empty', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ data: [] }));
      const client = createClient(fetchMock);

      await client.statistics({
        date_from: '2024-01-01',
        date_to: '2024-01-31',
        next_page_token: '',
      });

      const url = fetchMock.mock.calls[0]![0] as string;

      expect(url).not.toContain('next_page_token');
    });

    it('decodes base64 message names by default', async () => {
      // "VG9kYXkncyBNb3JuaW5nIEJyZWFr" → "Today's Morning Break"
      fetchMock.mockResolvedValueOnce(
        createMockResponse({
          data: [
            {
              statistic_id: 'stat-msg',
              statistic_type: 'sent',
              event_id: 'evt-msg',
              subscriber_id: 'sub-msg',
              message_type: 'email',
              created_at: '2024-01-15T10:00:00Z',
              object: {
                id: 'msg-1',
                name: 'VG9kYXkncyBNb3JuaW5nIEJyZWFr',
                type: 'message',
              },
            },
          ],
        })
      );
      const client = createClient(fetchMock);

      const result = await client.statistics({
        date_from: '2024-01-01',
        date_to: '2024-01-31',
      });

      expect(result.data?.[0].object.name).toBe("Today's Morning Break");
    });

    it('handles multi-byte UTF-8 in decoded message names', async () => {
      // "w6Vrw6Ugw6RsZ2VuIPCfjIg=" → "åkå älgen 🌈"
      fetchMock.mockResolvedValueOnce(
        createMockResponse({
          data: [
            {
              statistic_id: 'stat-utf8',
              statistic_type: 'open',
              event_id: 'evt-utf8',
              subscriber_id: 'sub-utf8',
              message_type: 'email',
              created_at: '2024-01-15T10:00:00Z',
              object: {
                id: 'msg-utf8',
                name: 'w6Vrw6Ugw6RsZ2VuIPCfjIg=',
                type: 'message',
              },
            },
          ],
        })
      );
      const client = createClient(fetchMock);

      const result = await client.statistics({
        date_from: '2024-01-01',
        date_to: '2024-01-31',
      });

      expect(result.data?.[0].object.name).toBe('åkå älgen 🌈');
    });

    it('does not decode names for non-message object types', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({
          data: [
            {
              statistic_id: 'stat-camp',
              statistic_type: 'open',
              event_id: 'evt-camp',
              subscriber_id: 'sub-camp',
              message_type: 'email',
              created_at: '2024-01-15T10:00:00Z',
              object: {
                id: 'camp-1',
                name: 'VG9kYXkncyBNb3JuaW5nIEJyZWFr',
                type: 'campaign',
              },
            },
          ],
        })
      );
      const client = createClient(fetchMock);

      const result = await client.statistics({
        date_from: '2024-01-01',
        date_to: '2024-01-31',
      });

      expect(result.data?.[0].object.name).toBe('VG9kYXkncyBNb3JuaW5nIEJyZWFr');
    });

    it('passes through values that do not round-trip cleanly', async () => {
      // Canonical form is "aGVsbG8=" (with padding); without padding the
      // round-trip guard treats it as plain text.
      fetchMock.mockResolvedValueOnce(
        createMockResponse({
          data: [
            {
              statistic_id: 'stat-noroundtrip',
              statistic_type: 'open',
              event_id: 'evt-noroundtrip',
              subscriber_id: 'sub-noroundtrip',
              message_type: 'email',
              created_at: '2024-01-15T10:00:00Z',
              object: { id: 'msg-noroundtrip', name: 'aGVsbG8', type: 'message' },
            },
          ],
        })
      );
      const client = createClient(fetchMock);

      const result = await client.statistics({
        date_from: '2024-01-01',
        date_to: '2024-01-31',
      });

      expect(result.data?.[0].object.name).toBe('aGVsbG8');
    });

    it('skips decoding when decodeNames is false', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({
          data: [
            {
              statistic_id: 'stat-optout',
              statistic_type: 'sent',
              event_id: 'evt-optout',
              subscriber_id: 'sub-optout',
              message_type: 'email',
              created_at: '2024-01-15T10:00:00Z',
              object: {
                id: 'msg-optout',
                name: 'VG9kYXkncyBNb3JuaW5nIEJyZWFr',
                type: 'message',
              },
            },
          ],
        })
      );
      const client = createClient(fetchMock);

      const result = await client.statistics({
        date_from: '2024-01-01',
        date_to: '2024-01-31',
        decodeNames: false,
      });

      expect(result.data?.[0].object.name).toBe('VG9kYXkncyBNb3JuaW5nIEJyZWFr');
    });
  });
});
