/**
 * Test-only fetch mocking helpers used by every colocated `*.test.ts` file.
 *
 * Lives in `src/` (not `tests/`) so colocated tests can import it via a short
 * relative path. Production code never imports it because `index.ts` does
 * not re-export this module.
 */

import { vi, type Mock } from 'vitest';

import { HttpTransport, type TransportConfig } from './transport.js';

export type MockFetch = Mock<typeof fetch>;

export function createMockFetch(): MockFetch {
  return vi.fn() as MockFetch;
}

/**
 * Build an `HttpTransport` over a mocked `fetch` for namespace-client tests.
 * Defaults match production base URLs so URL assertions look natural.
 */
export function createMockTransport(
  fetchMock: MockFetch,
  overrides: Partial<TransportConfig> = {}
): HttpTransport {
  return new HttpTransport({
    apiKey: 'test-key',
    baseUrlV2: 'https://app.rule.io/api/v2',
    baseUrlV3: 'https://app.rule.io/api/v3',
    fetch: fetchMock,
    debug: false,
    ...overrides,
  });
}

export function createMockResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    headers: new Headers(),
  } as Response;
}

/** Mock for 204 No Content — `json()` rejects to enforce the no-body contract. */
export function createMock204Response(): Response {
  return {
    ok: true,
    status: 204,
    json: () => Promise.reject(new SyntaxError('Unexpected end of JSON input')),
    text: () => Promise.resolve(''),
    headers: new Headers(),
  } as Response;
}

export function createMockTextResponse(text: string, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(text),
    json: () => Promise.reject(new SyntaxError('not json')),
    headers: new Headers(),
  } as Response;
}

export function createMockErrorResponse(
  body: unknown,
  status: number,
  headers?: Record<string, string>
): Response {
  return {
    ok: false,
    status,
    json: () => Promise.resolve(body),
    text: () =>
      Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
    headers: new Headers(headers),
  } as Response;
}
