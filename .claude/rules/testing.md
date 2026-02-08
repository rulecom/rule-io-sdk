---
paths:
  - 'tests/**/*.test.ts'
---

# Testing Rules

## Every Feature Needs Tests

Cover these scenarios:

1. **Happy path** — Normal successful operation
2. **Edge cases** — Empty input, max values, special characters
3. **Error cases** — API failures, invalid input, rate limits

## Test Structure

```typescript
describe('RuleClient', () => {
  describe('syncSubscriber', () => {
    it('syncs a subscriber with fields and tags', async () => {
      // Happy path
    });

    it('filters out empty field values', async () => {
      // Edge case
    });

    it('throws RuleApiError on 401', async () => {
      // Error case
    });

    it('throws RuleApiError on rate limit (429)', async () => {
      // Error case
    });
  });
});
```

## Mock the Fetch Function

Use the client's `fetch` config option for testability:

```typescript
const mockFetch = vi.fn();
const client = new RuleClient({
  apiKey: 'test-key',
  fetch: mockFetch,
});

mockFetch.mockResolvedValueOnce({
  ok: true,
  status: 200,
  json: async () => ({ success: true }),
  headers: new Headers(),
});
```

## XSS Test Cases

Always test template builders with malicious input:

```typescript
it('escapes HTML in user-provided content', () => {
  const template = createTemplate({
    guestName: '<script>alert("xss")</script>',
  });

  const json = JSON.stringify(template);
  expect(json).not.toContain('<script>');
  expect(json).toContain('&lt;script&gt;');
});
```

## RCML Validation

Template tests should verify structure:

```typescript
it('produces valid RCML document', () => {
  const doc = createRCMLDocument({ ... });

  expect(doc).toHaveProperty('head');
  expect(doc).toHaveProperty('body');
  expect(doc.body).toHaveProperty('sections');
  expect(doc.body.sections.length).toBeGreaterThan(0);
});
```

## Running Tests

```bash
npm run test              # All tests
npm run test:watch        # Watch mode
npm run test -- client    # Filter by name
npm run test -- --coverage  # With coverage
```
