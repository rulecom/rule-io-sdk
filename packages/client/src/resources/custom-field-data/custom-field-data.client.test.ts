import { beforeEach, describe, expect, it } from 'vitest';

import {
  createMock204Response,
  createMockErrorResponse,
  createMockFetch,
  createMockResponse,
  createMockTransport,
  type MockFetch,
} from '../../core/mock-fetch.js';
import { CustomFieldDataClient } from './custom-field-data.client.js';

function createClient(fetchMock: MockFetch): CustomFieldDataClient {
  return new CustomFieldDataClient(createMockTransport(fetchMock));
}

describe('CustomFieldDataClient', () => {
  let fetchMock: MockFetch;

  beforeEach(() => {
    fetchMock = createMockFetch();
  });

  describe('list', () => {
    it('GETs /custom-field-data/{id} without params', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({
          data: [
            {
              id: 1,
              group_id: 10,
              group_name: 'Order',
              values: [
                {
                  field_id: 100,
                  field_name: 'Ref',
                  field_type: 'text',
                  field_value: 'ORD-1',
                },
              ],
            },
          ],
          meta: { page: 1, per_page: 15 },
        })
      );
      const client = createClient(fetchMock);

      const result = await client.list(42);

      expect(result.data).toHaveLength(1);
      const url = fetchMock.mock.calls[0]![0] as string;

      expect(url).toBe('https://app.rule.io/api/v3/custom-field-data/42');
    });

    it('serializes pagination + group filters', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ data: [], meta: { page: 2, per_page: 10 } })
      );
      const client = createClient(fetchMock);

      await client.list(42, {
        page: 2,
        per_page: 10,
        groups_id: [1, 2],
        groups_name: ['Order', 'Profile'],
      });

      const url = fetchMock.mock.calls[0]![0] as string;

      expect(url).toContain('page=2');
      expect(url).toContain('per_page=10');
      expect(url).toContain('groups_id%5B%5D=1');
      expect(url).toContain('groups_id%5B%5D=2');
      expect(url).toContain('groups_name%5B%5D=Order');
      expect(url).toContain('groups_name%5B%5D=Profile');
    });
  });

  describe('create', () => {
    it('POSTs to /custom-field-data/{id}', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ success: true }, 201));
      const client = createClient(fetchMock);

      await client.create(42, {
        groups: [
          {
            group: 'Order',
            create_if_not_exists: true,
            values: [{ field: 'Ref', create_if_not_exists: true, value: 'ORD-123' }],
          },
        ],
      });

      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v3/custom-field-data/42');
      expect((init as RequestInit).method).toBe('POST');
      const body = JSON.parse((init as RequestInit).body as string);

      expect(body.groups[0].group).toBe('Order');
    });
  });

  describe('update', () => {
    it('PUTs to /custom-field-data/{id} and returns success on 204', async () => {
      fetchMock.mockResolvedValueOnce(createMock204Response());
      const client = createClient(fetchMock);

      const result = await client.update(42, {
        identifier: { group: 'Order', field: 'Ref', value: 'ORD-123' },
        values: [{ field: 'Status', value: 'shipped' }],
      });

      expect(result.success).toBe(true);
      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v3/custom-field-data/42');
      expect((init as RequestInit).method).toBe('PUT');
      const body = JSON.parse((init as RequestInit).body as string);

      expect(body.identifier.group).toBe('Order');
      expect(body.values[0].field).toBe('Status');
    });
  });

  describe('listByGroup', () => {
    it('GETs by group name', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ data: [] }));
      const client = createClient(fetchMock);

      await client.listByGroup(42, 'Order');

      const url = fetchMock.mock.calls[0]![0] as string;

      expect(url).toContain('/custom-field-data/42/group/Order');
    });

    it('GETs by group id with pagination + fields filter', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ data: [] }));
      const client = createClient(fetchMock);

      await client.listByGroup(42, 5, { page: 1, fields: ['Ref', 'Status'] });

      const url = fetchMock.mock.calls[0]![0] as string;

      expect(url).toContain('/custom-field-data/42/group/5');
      expect(url).toContain('page=1');
      expect(url).toContain('fields%5B%5D=Ref');
      expect(url).toContain('fields%5B%5D=Status');
    });
  });

  describe('deleteByGroup', () => {
    it('DELETEs the group', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ success: true }));
      const client = createClient(fetchMock);

      await client.deleteByGroup(42, 'Order');

      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toContain('/custom-field-data/42/group/Order');
      expect((init as RequestInit).method).toBe('DELETE');
    });
  });

  describe('search', () => {
    it('returns the matching record', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ data: { id: 1, group_name: 'Order', values: [] } })
      );
      const client = createClient(fetchMock);

      const result = await client.search(42, {
        group: 'Order',
        field: 'Ref',
        value: 'ORD-123',
      });

      expect(result?.data?.group_name).toBe('Order');
      const url = fetchMock.mock.calls[0]![0] as string;

      expect(url).toContain('/custom-field-data/42/search');
      expect(url).toContain('group=Order');
      expect(url).toContain('field=Ref');
      expect(url).toContain('value=ORD-123');
    });

    it('returns null on 404', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse({}, 404));
      const client = createClient(fetchMock);

      expect(await client.search(42, { data_id: 999 })).toBeNull();
    });
  });
});
