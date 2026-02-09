# SDK Design Principles

## 1. Zero Dependencies

The SDK must have zero runtime dependencies. Consumers should not inherit
transitive dependency risks. We rely only on:
- `fetch` (available in Node.js 18+)
- Standard TypeScript/JavaScript APIs

## 2. Dual Output

Build produces both CJS and ESM via tsup:
- `dist/index.js` — CommonJS (for `require()`)
- `dist/index.mjs` — ESM (for `import`)
- `dist/index.d.ts` — TypeScript declarations

## 3. Consumer-First API Design

### Constructor Flexibility
```typescript
// Simple (most common)
const client = new RuleClient('api-key');

// Advanced
const client = new RuleClient({
  apiKey: 'api-key',
  debug: true,
  fetch: customFetch,
});
```

### Null Over Throw for Lookups
```typescript
// Returns null, doesn't throw
const subscriber = await client.getSubscriber('email@example.com');
```

### Rich Errors for Failures
```typescript
try {
  await client.syncSubscriber(data);
} catch (error) {
  if (error instanceof RuleApiError) {
    error.statusCode;    // HTTP status
    error.isRateLimited(); // Convenience checks
  }
}
```

## 4. Testability

The client accepts a `fetch` function via config, making it trivially testable:
```typescript
const client = new RuleClient({
  apiKey: 'test',
  fetch: mockFetch,
});
```

## 5. Multi-Vertical Support

The SDK must not be opinionated about the consumer's business domain.

**Core SDK (always generic):**
- `RuleClient` — API methods
- RCML element builders — low-level building blocks
- Error handling, auth, rate limiting

**Template layer (vertical-aware but parameterized):**
- Template builders accept config objects
- All text, colors, URLs come from config
- No hardcoded business names, locales, or branding

## 6. API Quirks Documentation

Rule.io's API has undocumented behaviors. These are documented in:
- JSDoc comments on affected methods
- `.claude/RULE_IO_API_REFERENCE.md`

Key quirks:
1. Trigger type must be UPPERCASE ("TAG" not "tag")
2. Automail creation is two-step (create, then update with trigger)
3. Template names must be unique (add timestamp)
4. Tag triggers use tag ID (number), not tag name

## 7. Cleanup on Failure

Multi-step operations (like `createAutomationEmail`) must clean up
previously created resources if a later step fails. This prevents
orphaned resources in the Rule.io account.
