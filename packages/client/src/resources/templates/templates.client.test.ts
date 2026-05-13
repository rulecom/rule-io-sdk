import { beforeEach, describe, expect, it } from 'vitest';

import { RuleApiError } from '@rule-io/core';
import type { RcmlDocument } from '@rule-io/rcml';

import {
  createMockErrorResponse,
  createMockFetch,
  createMockResponse,
  createMockTextResponse,
  createMockTransport,
  type MockFetch,
} from '../../core/mock-fetch.js';
import { TemplatesClient } from './templates.client.js';

function createClient(fetchMock: MockFetch): TemplatesClient {
  return new TemplatesClient(createMockTransport(fetchMock));
}

const MINIMAL_TEMPLATE: RcmlDocument = {
  tagName: 'rcml',
  children: [
    { tagName: 'rc-head', children: [] },
    { tagName: 'rc-body', children: [] },
  ],
};

describe('TemplatesClient', () => {
  let fetchMock: MockFetch;

  beforeEach(() => {
    fetchMock = createMockFetch();
  });

  describe('create', () => {
    it('POSTs to v3 /editor/template with the RCML document', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ data: { id: 456, name: 'T', content: MINIMAL_TEMPLATE } })
      );
      const client = createClient(fetchMock);

      const result = await client.create({
        message_id: 1,
        name: 'T',
        message_type: 'email',
        template: MINIMAL_TEMPLATE,
      });

      expect(result.data?.id).toBe(456);
      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v3/editor/template');
      expect((init as RequestInit).method).toBe('POST');
    });

    it('sends the template document as a single object, not wrapped in an array', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ data: { id: 1, name: 'T', content: MINIMAL_TEMPLATE } })
      );
      const client = createClient(fetchMock);

      await client.create({
        message_id: 1,
        name: 'T',
        message_type: 'email',
        template: MINIMAL_TEMPLATE,
      });

      const body = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);

      expect(body.template).toEqual(MINIMAL_TEMPLATE);
      expect(Array.isArray(body.template)).toBe(false);
    });
  });

  describe('get / update / delete', () => {
    it('GETs and returns the template', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ data: { id: 5, name: 'T', content: MINIMAL_TEMPLATE } })
      );
      const client = createClient(fetchMock);

      expect((await client.get(5))?.data?.id).toBe(5);
    });

    it('returns null on 404 from get', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse({}, 404));
      const client = createClient(fetchMock);

      expect(await client.get(5)).toBeNull();
    });

    it('PUTs the partial body for update', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ data: { id: 5, name: 'Renamed', content: MINIMAL_TEMPLATE } })
      );
      const client = createClient(fetchMock);

      await client.update(5, { name: 'Renamed' });

      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v3/editor/template/5');
      expect((init as RequestInit).method).toBe('PUT');
      const body = JSON.parse((init as RequestInit).body as string);

      expect(body).toEqual({ name: 'Renamed' });
    });

    it('DELETEs the template', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ success: true }));
      const client = createClient(fetchMock);

      expect((await client.delete(5)).success).toBe(true);
    });
  });

  describe('list', () => {
    it('serializes pagination params', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ data: [{ id: 100, name: 'T', content: MINIMAL_TEMPLATE }] })
      );
      const client = createClient(fetchMock);

      await client.list({ page: 1, per_page: 50 });

      const url = fetchMock.mock.calls[0]![0] as string;

      expect(url).toContain('page=1');
      expect(url).toContain('per_page=50');
    });
  });

  describe('render', () => {
    it('returns the rendered HTML on 200', async () => {
      const html = '<html><body><h1>Hello</h1></body></html>';

      fetchMock.mockResolvedValueOnce(createMockTextResponse(html));
      const client = createClient(fetchMock);

      expect(await client.render(42)).toBe(html);
      const url = fetchMock.mock.calls[0]![0] as string;

      expect(url).toBe('https://app.rule.io/api/v3/editor/template/42/render');
    });

    it('appends subscriber_id to the query string', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockTextResponse('<html><body>Hello Anna</body></html>')
      );
      const client = createClient(fetchMock);

      await client.render(42, { subscriber_id: 1001 });

      const url = fetchMock.mock.calls[0]![0] as string;

      expect(url).toContain('/template/42/render?');
      expect(url).toContain('subscriber_id=1001');
    });

    it('returns null on 404', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse('Not found', 404));
      const client = createClient(fetchMock);

      expect(await client.render(99999)).toBeNull();
    });

    it('rethrows non-404 errors', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse({}, 500));
      const client = createClient(fetchMock);

      await expect(client.render(42)).rejects.toBeInstanceOf(RuleApiError);
    });
  });
});
