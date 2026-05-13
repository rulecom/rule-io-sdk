import { beforeEach, describe, expect, it } from 'vitest';

import { RuleApiError } from '@rulecom/core';

import {
  createMock204Response,
  createMockErrorResponse,
  createMockFetch,
  createMockResponse,
  createMockTextResponse,
  type MockFetch,
} from './mock-fetch.js';
import { HttpTransport, type TransportConfig } from './transport.js';

function makeTransport(fetchMock: MockFetch, debug = false): HttpTransport {
  const config: TransportConfig = {
    apiKey: 'test-key',
    baseUrlV2: 'https://app.rule.io/api/v2',
    baseUrlV3: 'https://app.rule.io/api/v3',
    fetch: fetchMock,
    debug,
  };

  return new HttpTransport(config);
}

describe('HttpTransport', () => {
  let fetchMock: MockFetch;

  beforeEach(() => {
    fetchMock = createMockFetch();
  });

  describe('URL + headers', () => {
    it('uses v3 base URL and v3 content-type by default', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ ok: true }));
      const t = makeTransport(fetchMock);

      await t.get('/anything');

      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v3/anything');
      expect((init as RequestInit).method).toBe('GET');
      const headers = (init as RequestInit).headers as Record<string, string>;

      expect(headers['Authorization']).toBe('Bearer test-key');
      expect(headers['Content-Type']).toBe('application/json;charset=utf-8');
    });

    it('uses v2 base URL and v2 content-type when version is v2', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ ok: true }));
      const t = makeTransport(fetchMock);

      await t.get('/subscribers', { version: 'v2' });

      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v2/subscribers');
      const headers = (init as RequestInit).headers as Record<string, string>;

      expect(headers['Content-Type']).toBe('application/json');
    });

    it('merges caller-provided headers over defaults', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ ok: true }));
      const t = makeTransport(fetchMock);

      await t.post('/x', { headers: { 'X-Custom': '1' } });

      const headers = (fetchMock.mock.calls[0]![1] as RequestInit)
        .headers as Record<string, string>;

      expect(headers['X-Custom']).toBe('1');
      expect(headers['Authorization']).toBe('Bearer test-key');
    });

    it('forwards body to fetch', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ ok: true }));
      const t = makeTransport(fetchMock);

      await t.post('/x', { body: '{"a":1}' });

      expect((fetchMock.mock.calls[0]![1] as RequestInit).body).toBe('{"a":1}');
    });
  });

  describe('JSON parsing', () => {
    it('returns parsed JSON for 2xx', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ data: 42 }));
      const t = makeTransport(fetchMock);

      const result = await t.get<{ data: number }>('/x');

      expect(result.data).toBe(42);
    });

    it('returns { success: true } for 204 without parsing the body', async () => {
      fetchMock.mockResolvedValueOnce(createMock204Response());
      const t = makeTransport(fetchMock);

      const result = await t.delete<{ success: boolean }>('/x');

      expect(result.success).toBe(true);
    });
  });

  describe('text responses', () => {
    it('returns response.text() from requestText', async () => {
      fetchMock.mockResolvedValueOnce(createMockTextResponse('<html/>'));
      const t = makeTransport(fetchMock);

      expect(await t.requestText('GET', '/render')).toBe('<html/>');
    });
  });

  describe('error mapping', () => {
    it('maps 429 to RuleApiError(rate limited)', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockErrorResponse('', 429, { 'Retry-After': '120' })
      );
      const t = makeTransport(fetchMock);

      await expect(t.get('/x')).rejects.toMatchObject({
        name: 'RuleApiError',
        statusCode: 429,
      });
    });

    it('maps 401 to RuleApiError(invalid API key)', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse({}, 401));
      const t = makeTransport(fetchMock);

      await expect(t.get('/x')).rejects.toMatchObject({ statusCode: 401 });
    });

    it('extracts error.message from a JSON body', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockErrorResponse({ message: 'boom' }, 500)
      );
      const t = makeTransport(fetchMock);

      await expect(t.get('/x')).rejects.toMatchObject({
        statusCode: 500,
        message: 'boom',
      });
    });

    it('normalizes v3 field-validation errors (string and array)', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockErrorResponse(
          {
            errors: {
              email: ['is required', 'is invalid'],
              age: 'must be a number',
            },
          },
          422
        )
      );
      const t = makeTransport(fetchMock);

      try {
        await t.put('/x');
        throw new Error('expected throw');
      } catch (error) {
        if (!(error instanceof RuleApiError)) throw error;
        expect(error.statusCode).toBe(422);
        expect(error.validationErrors).toEqual({
          email: ['is required', 'is invalid'],
          age: ['must be a number'],
        });
        expect(error.message).toContain('email: is required');
        expect(error.message).toContain('age: must be a number');
      }
    });

    it('falls back to default message when body is not valid JSON', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse('garbage', 502));
      const t = makeTransport(fetchMock);

      await expect(t.get('/x')).rejects.toMatchObject({
        statusCode: 502,
        message: 'Rule.io v3 API error',
      });
    });

    it('uses the v2 default message when version is v2', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse('garbage', 500));
      const t = makeTransport(fetchMock);

      await expect(t.get('/x', { version: 'v2' })).rejects.toMatchObject({
        message: 'Rule.io API error',
      });
    });

    it('wraps fetch network errors as RuleApiError(0)', async () => {
      fetchMock.mockRejectedValueOnce(new Error('connection refused'));
      const t = makeTransport(fetchMock);

      await expect(t.get('/x')).rejects.toMatchObject({
        statusCode: 0,
        message: 'connection refused',
      });
    });
  });
});
