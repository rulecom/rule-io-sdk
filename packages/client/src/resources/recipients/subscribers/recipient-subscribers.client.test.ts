import { beforeEach, describe, expect, it } from 'vitest';

import {
  createMockFetch,
  createMockResponse,
  createMockTransport,
  type MockFetch,
} from '../../../core/mock-fetch.js';
import { RecipientSubscribersClient } from './recipient-subscribers.client.js';

function createClient(fetchMock: MockFetch): RecipientSubscribersClient {
  return new RecipientSubscribersClient(createMockTransport(fetchMock));
}

describe('RecipientSubscribersClient', () => {
  let fetchMock: MockFetch;

  beforeEach(() => {
    fetchMock = createMockFetch();
  });

  it('GETs /editor/recipients/subscribers with no params', async () => {
    fetchMock.mockResolvedValueOnce(
      createMockResponse({
        data: [{ id: 10, email: 'user@example.com', phone: null }],
      })
    );
    const client = createClient(fetchMock);

    const result = await client.list();

    expect(result.data?.[0].email).toBe('user@example.com');
    const url = fetchMock.mock.calls[0]![0] as string;

    expect(url).toBe('https://app.rule.io/api/v3/editor/recipients/subscribers');
  });

  it('serializes per_page into the query string', async () => {
    fetchMock.mockResolvedValueOnce(createMockResponse({ data: [] }));
    const client = createClient(fetchMock);

    await client.list({ per_page: 2 });

    const url = fetchMock.mock.calls[0]![0] as string;

    expect(url).toBe('https://app.rule.io/api/v3/editor/recipients/subscribers?per_page=2');
  });
});
