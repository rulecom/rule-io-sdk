---
paths:
  - 'src/**/*.ts'
---

# Code Quality Rules

## Zero Dependencies

This SDK has ZERO runtime dependencies. Never add `dependencies` to package.json.
Use `devDependencies` for build/test tools only.

## Type Safety

```typescript
// WRONG - any type
function processResponse(data: any): void { ... }

// CORRECT - specific type
function processResponse(data: RuleApiResponse): RuleSubscriberResponse { ... }
```

Exception: `catch (error)` blocks may use `unknown` (not `any`).

## DRY - Don't Repeat Yourself

Before writing new code, check what exists:

**API helpers in `src/client.ts`:**
- `request<T>()` — v2 API calls with auth
- `requestV3<T>()` — v3 API calls with auth

**RCML utilities in `src/rcml/`:**
- `escapeHtml()` — XSS protection
- `sanitizeUrl()` — URL validation
- `createProseMirrorDoc()` — text content builder
- `createSection()`, `createColumn()` — layout builders

**Error classes in `src/errors.ts`:**
- `RuleApiError` — API failures (with statusCode)
- `RuleConfigError` — Configuration errors

## Debug Logging

Never use bare `console.log`. Use the client's debug flag:

```typescript
// WRONG
console.log('Response:', data);

// CORRECT
this.log('Response:', data);  // Only logs when config.debug is true
```

## Magic Numbers

```typescript
// WRONG
if (response.status === 429) { ... }
const delay = 60;

// BETTER - clear intent
if (response.status === 429) {
  const retryAfter = response.headers.get('Retry-After') || '60';
  ...
}
```

## JSDoc on Public Functions

Every exported function needs JSDoc with at least a description and `@example`:

```typescript
/**
 * Sync a subscriber to Rule.io, creating or updating as needed.
 *
 * @param subscriber - Subscriber data including email, fields, and tags
 * @returns API response with subscriber data
 *
 * @example
 * ```typescript
 * await client.syncSubscriber({
 *   email: 'user@example.com',
 *   fields: { FirstName: 'Anna' },
 *   tags: ['welcome']
 * });
 * ```
 */
async syncSubscriber(subscriber: RuleSubscriber): Promise<RuleSubscriberResponse> { ... }
```
