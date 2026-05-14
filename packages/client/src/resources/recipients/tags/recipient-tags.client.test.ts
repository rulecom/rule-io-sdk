import { beforeEach, describe, expect, it } from 'vitest';

import {
  createMockFetch,
  createMockResponse,
  createMockTransport,
  type MockFetch,
} from '../../../core/mock-fetch.js';
import { RecipientTagsClient } from './recipient-tags.client.js';

function createClient(fetchMock: MockFetch): RecipientTagsClient {
  return new RecipientTagsClient(createMockTransport(fetchMock));
}

describe('RecipientTagsClient', () => {
  let fetchMock: MockFetch;

  beforeEach(() => {
    fetchMock = createMockFetch();
  });

  it('GETs /editor/recipients/tags with no params', async () => {
    fetchMock.mockResolvedValueOnce(
      createMockResponse({
        data: [
          { id: 100, name: 'newsletter' },
          { id: 101, name: 'abandoned-cart' },
        ],
      })
    );
    const client = createClient(fetchMock);

    const result = await client.list();

    expect(result.data?.[1].name).toBe('abandoned-cart');
    const url = fetchMock.mock.calls[0]![0] as string;

    expect(url).toBe('https://app.rule.io/api/v3/editor/recipients/tags');
  });

  it('serializes pagination params', async () => {
    fetchMock.mockResolvedValueOnce(createMockResponse({ data: [] }));
    const client = createClient(fetchMock);

    await client.list({ page: 1, per_page: 5 });

    const url = fetchMock.mock.calls[0]![0] as string;

    expect(url).toBe(
      'https://app.rule.io/api/v3/editor/recipients/tags?page=1&per_page=5'
    );
  });
});
