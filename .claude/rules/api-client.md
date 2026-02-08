---
paths:
  - 'src/client.ts'
---

# API Client Rules

## Rule.io API Quirks

These are documented behaviors. Do NOT "fix" them — work around them:

### 1. Trigger type must be UPPERCASE
```typescript
// WRONG - API silently fails
trigger: { type: 'tag', id: 123 }

// CORRECT
trigger: { type: 'TAG', id: 123 }
```

### 2. Two-step automail creation
Cannot set trigger during creation. Must create, then update:
```typescript
const automail = await client.createAutomail({ name: '...' });
await client.updateAutomail(automail.id, { trigger: { type: 'TAG', id: tagId } });
```

### 3. Template names must be unique
Add timestamp to avoid conflicts:
```typescript
name: `${config.name} - ${Date.now()}`
```

### 4. Tag ID required for triggers
Triggers use numeric tag ID, not tag name. Look up via `getTagIdByName()`.

### 5. Subscriber fields need group prefix
Fields must be prefixed with group name (e.g., `Booking.FirstName`).
The SDK handles this — don't double-prefix.

### 6. Singular vs plural endpoint
- `/subscribers/` (plural) for CRUD operations
- `/subscriber/` (singular) for field retrieval

## Error Handling Pattern

All API methods must:
1. Throw `RuleApiError` with status code for HTTP errors
2. Handle 429 (rate limit) with descriptive message
3. Handle 401 (auth) with clear message
4. Wrap network errors (no raw Error objects escape)

```typescript
try {
  const response = await this.config.fetch(url, options);
  if (!response.ok) {
    throw new RuleApiError(message, response.status);
  }
} catch (error) {
  if (error instanceof RuleApiError) throw error;
  throw new RuleApiError(error.message, 0); // 0 = network error
}
```

## Cleanup on Failure

Multi-step operations (like `createAutomationEmail`) MUST clean up
partially created resources on failure. See the existing pattern.

## Debug Logging

Use `this.log()` (respects `debug` config), never raw `console.log`.
