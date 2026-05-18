import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RuleApiError } from '../errors.js';

import {
  createMock204Response,
  createMockErrorResponse,
  createMockFetch,
  createMockResponse,
  createMockTextResponse,
  type MockFetch,
} from './mock-fetch.js';
import {
  resolveRateLimitOptions,
  type RateLimitOptions,
} from './rate-limit.js';
import { HttpTransport, type TransportConfig } from './transport.js';

function makeTransport(
  fetchMock: MockFetch,
  debug = false,
  rateLimiting?: RateLimitOptions
): HttpTransport {
  const config: TransportConfig = {
    apiKey: 'test-key',
    baseUrlV2: 'https://app.rule.io/api/v2',
    baseUrlV3: 'https://app.rule.io/api/v3',
    fetch: fetchMock,
    debug,
    ...(rateLimiting ? { rateLimiting: resolveRateLimitOptions(rateLimiting) } : {}),
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

  describe('rate-limit headers (v3 only)', () => {
    it('exposes integer Retry-After + RequestsCount + ErrorPercent on a v3 429 (synthetic)', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockErrorResponse({ error: 'Rate limited' }, 429, {
          'Retry-After': '45',
          'RequestsCount-Allowed': '2000',
          'RequestsCount-Current': '2000',
          'X-ErrorPercent-Limit': '49',
          'X-ErrorPercent-Current': '50',
        })
      );
      const t = makeTransport(fetchMock);

      await expect(t.get('/x')).rejects.toMatchObject({
        statusCode: 429,
        retryAfterSeconds: 45,
        rateLimitLimit: 2000,
        rateLimitRemaining: 0,
        errorPercentLimit: 49,
        errorPercentCurrent: 50,
      });
    });

    it('parses Retry-After in Rule.io v3\'s actual 429 form (YYYY-MM-DD HH:MM:SS, no tz)', async () => {
      // Real-world headers captured from a probe against production v3 in May
      // 2026: Retry-After is a server-local timestamp (no tz), and the
      // RequestsCount pair is *not* echoed on 429s — only X-ErrorPercent-* is.
      // The `Date` header carries the server's "now" — we use it as the
      // reference frame so the tz offset cancels.
      fetchMock.mockResolvedValueOnce(
        createMockErrorResponse(
          'Too Many Requests. You can continue at 2026-05-14 14:22:16.',
          429,
          {
            // Retry-After is 10 minutes after the response Date header.
            'Retry-After': '2026-05-14 14:22:16',
            Date: 'Thu, 14 May 2026 12:12:16 GMT',
            'X-ErrorPercent-Limit': '49',
            'X-ErrorPercent-Current': '0',
          }
        )
      );
      const t = makeTransport(fetchMock);

      await expect(t.get('/x')).rejects.toMatchObject({
        statusCode: 429,
        retryAfterSeconds: 600, // 10 minutes
        errorPercentLimit: 49,
        errorPercentCurrent: 0,
        rateLimitLimit: undefined, // not echoed on 429
        rateLimitRemaining: undefined,
      });
    });

    it('clamps negative retryAfterSeconds to 0 if the timestamp is already in the past', async () => {
      // Edge case: clock skew or stale response. Don't return a negative
      // wait — clamp to 0 so consumers retry immediately rather than
      // hitting an arithmetic surprise.
      fetchMock.mockResolvedValueOnce(
        createMockErrorResponse('', 429, {
          'Retry-After': '2026-05-14 11:00:00',
          Date: 'Thu, 14 May 2026 12:00:00 GMT',
          'X-ErrorPercent-Limit': '49',
        })
      );
      const t = makeTransport(fetchMock);

      await expect(t.get('/x')).rejects.toMatchObject({
        retryAfterSeconds: 0,
      });
    });

    it('leaves retryAfterSeconds undefined for the timestamp form when no Date header is present', async () => {
      // The Date header is what makes the timestamp form parseable without
      // knowing the server's tz — without it we'd have to guess.
      fetchMock.mockResolvedValueOnce(
        createMockErrorResponse('', 429, {
          'Retry-After': '2026-05-14 14:22:16',
          // no Date header
        })
      );
      const t = makeTransport(fetchMock);

      await expect(t.get('/x')).rejects.toMatchObject({
        retryAfterSeconds: undefined,
      });
    });

    it('computes rateLimitRemaining as Allowed − Current on v3 errors', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockErrorResponse({ error: 'oops' }, 503, {
          'RequestsCount-Allowed': '2000',
          'RequestsCount-Current': '7',
        })
      );
      const t = makeTransport(fetchMock);

      await expect(t.get('/x')).rejects.toMatchObject({
        statusCode: 503,
        rateLimitLimit: 2000,
        rateLimitRemaining: 1993,
      });
    });

    it('clamps rateLimitRemaining to 0 if Current exceeds Allowed', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockErrorResponse({ error: 'oops' }, 429, {
          'RequestsCount-Allowed': '2000',
          'RequestsCount-Current': '2050',
        })
      );
      const t = makeTransport(fetchMock);

      await expect(t.get('/x')).rejects.toMatchObject({
        rateLimitRemaining: 0,
      });
    });

    it('prefers documented X-RateLimit-* headers if Rule.io ever ships them', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockErrorResponse({ error: 'Rate limited' }, 429, {
          'X-RateLimit-Limit': '5000',
          'X-RateLimit-Remaining': '12',
          'RequestsCount-Allowed': '2000',
          'RequestsCount-Current': '1999',
        })
      );
      const t = makeTransport(fetchMock);

      await expect(t.get('/x')).rejects.toMatchObject({
        rateLimitLimit: 5000,
        rateLimitRemaining: 12,
      });
    });

    it('leaves rate-limit fields undefined when v3 emits no headers', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse({}, 401));
      const t = makeTransport(fetchMock);

      await expect(t.get('/x')).rejects.toMatchObject({
        statusCode: 401,
        retryAfterSeconds: undefined,
        rateLimitLimit: undefined,
        rateLimitRemaining: undefined,
        errorPercentLimit: undefined,
        errorPercentCurrent: undefined,
      });
    });

    it('ignores the HTTP-date form of Retry-After (TODO: parse it)', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockErrorResponse({ error: 'Rate limited' }, 429, {
          'Retry-After': 'Wed, 21 Oct 2026 07:28:00 GMT',
        })
      );
      const t = makeTransport(fetchMock);

      await expect(t.get('/x')).rejects.toMatchObject({
        statusCode: 429,
        retryAfterSeconds: undefined,
      });
    });

    it('rejects negative header values (parser is non-negative-int)', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockErrorResponse({ error: 'oops' }, 429, {
          'RequestsCount-Allowed': '-1',
          'RequestsCount-Current': '-1',
        })
      );
      const t = makeTransport(fetchMock);

      await expect(t.get('/x')).rejects.toMatchObject({
        rateLimitLimit: undefined,
        rateLimitRemaining: undefined,
      });
    });

    it('exposes rate-limit headers alongside validationErrors on v3 422', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockErrorResponse(
          { errors: { name: ['The name field is required.'] } },
          422,
          {
            'RequestsCount-Allowed': '2000',
            'RequestsCount-Current': '1',
          }
        )
      );
      const t = makeTransport(fetchMock);

      await expect(t.put('/x')).rejects.toMatchObject({
        statusCode: 422,
        validationErrors: { name: ['The name field is required.'] },
        rateLimitLimit: 2000,
        rateLimitRemaining: 1999,
      });
    });

    it('does NOT populate rate-limit fields on a v2 error', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockErrorResponse({ error: 'Rate limited' }, 429, {
          'RequestsCount-Allowed': '2000',
          'RequestsCount-Current': '2000',
          'X-ErrorPercent-Limit': '49',
        })
      );
      const t = makeTransport(fetchMock);

      await expect(t.get('/x', { version: 'v2' })).rejects.toMatchObject({
        statusCode: 429,
        rateLimitLimit: undefined,
        rateLimitRemaining: undefined,
        errorPercentLimit: undefined,
      });
    });
  });

  describe('rate-limit gate (opt-in)', () => {
    it('does not retry or gate when rateLimiting is omitted', async () => {
      // 429 surfaces directly; no retries.
      fetchMock.mockResolvedValueOnce(createMockErrorResponse('', 429));
      const t = makeTransport(fetchMock);

      await expect(t.get('/x')).rejects.toMatchObject({ statusCode: 429 });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('retries on 429 and resolves on the next success', async () => {
      fetchMock
        .mockResolvedValueOnce(createMockErrorResponse('', 429, { 'Retry-After': '1' }))
        .mockResolvedValueOnce(createMockResponse({ ok: true }));

      const sleep = vi.fn(() => Promise.resolve());
      const t = makeTransport(fetchMock, false, {
        maxConcurrency: 1,
        maxRetries: 2,
        sleep,
        random: () => 0,
      });

      await expect(t.get('/x')).resolves.toEqual({ ok: true });
      expect(fetchMock).toHaveBeenCalledTimes(2);
      // First retry waits the server-supplied 1 s (no jitter with random=0).
      expect(sleep).toHaveBeenCalledWith(1000);
    });

    it('honors RuleApiError.retryAfterSeconds parsed from the timestamp form', async () => {
      // Real-world: Rule.io v3 emits Retry-After as a server-local
      // (Stockholm) wall timestamp and the transport parses it into seconds
      // by referencing the response `Date` header. May 2026 = CEST (UTC+2),
      // so 12:22:11 GMT corresponds to 14:22:11 Stockholm wall — a 5 s gap
      // to the retry-after wall time.
      fetchMock
        .mockResolvedValueOnce(
          createMockErrorResponse('', 429, {
            'Retry-After': '2026-05-14 14:22:16',
            Date: 'Thu, 14 May 2026 12:22:11 GMT',
          })
        )
        .mockResolvedValueOnce(createMockResponse({ ok: true }));

      const sleep = vi.fn(() => Promise.resolve());
      const t = makeTransport(fetchMock, false, {
        maxConcurrency: 1,
        maxRetries: 1,
        sleep,
        random: () => 0,
      });

      await t.get('/x');
      // 14:22:16 − 14:22:11 = 5 s
      expect(sleep).toHaveBeenCalledWith(5000);
    });

    it('caps in-flight HTTP requests at maxConcurrency', async () => {
      let inFlight = 0;
      let peak = 0;
      const releases: Array<() => void> = [];

      fetchMock.mockImplementation(
        () =>
          new Promise<Response>((resolve) => {
            inFlight++;
            if (inFlight > peak) peak = inFlight;
            releases.push(() => {
              inFlight--;
              resolve(createMockResponse({ ok: true }));
            });
          })
      );

      const t = makeTransport(fetchMock, false, { maxConcurrency: 2 });
      const all = Promise.all(Array.from({ length: 5 }, () => t.get('/x')));

      // Let the first batch enter fetch.
      for (let i = 0; i < 5; i++) await Promise.resolve();

      while (releases.length > 0) {
        releases.shift()?.();
        for (let i = 0; i < 5; i++) await Promise.resolve();
      }

      await all;

      expect(peak).toBe(2);
      expect(fetchMock).toHaveBeenCalledTimes(5);
    });
  });
});
