# API Feedback for Rule.io v3+ Development

This feedback comes from building and maintaining [rule-io-sdk](https://github.com/rulecom/rule-io-sdk), a TypeScript SDK wrapping the Rule.io v2 and v3 APIs. Every item below is a real friction point we worked around in code. The goal is to help the Rule.io API team prioritize improvements for the next major version.

---

## Critical: Breaks developer expectations

### 1. Trigger type must be UPPERCASE — but error messages say lowercase
The automail trigger `type` field requires `"TAG"` / `"SEGMENT"`, but the API's own validation error message suggests lowercase values. This leads to wasted debugging time and incorrect retry attempts.

**Suggestion:** Accept case-insensitive values, or at minimum fix the error message.

### 2. Two-step automail creation
You cannot set `trigger` or `sendout_type` when creating an automail — you must POST to create, then PUT to update. This forces every consumer to implement a two-step flow with rollback logic.

**Suggestion:** Accept `trigger` and `sendout_type` in the POST creation payload.

### 3. Tag triggers require numeric IDs, obtainable only via v2
Automail triggers need a numeric tag ID, but the only way to resolve a tag name to an ID is `GET /api/v2/tags` (which returns ALL tags, with no search/filter). This creates a cross-version dependency and forces client-side filtering.

**Suggestion:** Accept tag names in triggers, or add a v3 tag lookup endpoint with filtering.

### 4. `phone_number` in requests, `phone` in responses
`POST /subscribers` accepts `phone_number` but the response body returns `phone`. This asymmetry forces SDK authors to maintain separate request/response types for the same resource.

**Suggestion:** Use one consistent field name in both directions.

---

## High: Significant developer friction

### 5. Inconsistent response wrapping
Most v3 endpoints wrap responses in `{ data: {...} }`, but the subscriber create endpoint returns fields directly at the top level. This breaks generic response parsing.

**Suggestion:** Wrap all v3 responses consistently in `{ data: ... }`.

### 6. Validation errors return inconsistent shapes
v3 validation errors sometimes return `{ errors: { field: ["msg"] } }` and sometimes `{ errors: { field: "msg" } }` (bare string instead of array). The SDK normalizes this, but it shouldn't have to.

**Suggestion:** Always return arrays for validation error values.

### 7. v2 `/subscriber/` (singular) vs `/subscribers/` (plural)
Field retrieval uses `GET /subscriber/{email}/fields` while every other subscriber endpoint uses `/subscribers/`. Easy to get wrong.

**Suggestion:** Support both forms, or consolidate on the plural.

### 8. v2 `subscribers` payload is an object, not an array
`POST /subscribers` expects `{ subscribers: { email, fields } }` — singular object despite the plural key. Tags go at the top level instead of inside the subscriber object.

**Suggestion:** For v3+, use `{ subscriber: {...}, tags: [...] }` or nest tags inside the subscriber.

### 9. Template names must be globally unique
The API rejects duplicate template names with no way to namespace them. The SDK appends `Date.now()` as a workaround, creating names like `"Order Confirmation - 1706000000000"`.

**Suggestion:** Scope uniqueness to the automail/message, or allow duplicate names.

### 10. Content-Type charset requirement differs between v2 and v3
v2 accepts `application/json`; v3 requires `application/json;charset=utf-8`. Most HTTP clients default to the former, causing silent failures.

**Suggestion:** Accept `application/json` without charset on v3 as well.

---

## Medium: Rough edges

### 11. DELETE requests with JSON bodies
`DELETE /suppressions/` and `DELETE /subscribers/tags` require JSON request bodies. DELETE request bodies have no generally defined semantics and are inconsistently supported across HTTP clients, servers, and intermediaries (see RFC 9110), which makes these endpoints less interoperable.

**Suggestion:** Use `POST /suppressions/delete` or `POST /subscribers/tags/remove` patterns instead.

### 12. No batch tag removal in v2
Removing N tags from a subscriber requires N separate `DELETE` calls. The SDK parallelizes them, but it's wasteful.

**Suggestion:** Add a batch tag removal endpoint (v3 has `bulkRemoveTags` but it's subscriber-scoped differently).

### 13. Dynamic set silent deactivation
Creating an active dynamic set can silently deactivate a different dynamic set with the same trigger. No error, no warning.

**Suggestion:** Return a warning or conflict error instead of silently mutating other resources.

### 14. Cascade delete behavior is undocumented
Deleting a dynamic set may cascade-delete the linked template. The SDK discovered this through integration test failures, not documentation.

**Suggestion:** Document cascade behavior. Ideally, return the list of cascade-deleted resources in the response.

### 15. Export statistic types differ between filter and response
The filter accepts `'browser'` and `'received'` but never returns them. The response includes `'sent'` which can't be used as a filter. No documentation explains this asymmetry.

**Suggestion:** Align the filter and response type enums, or document the mapping.

### 16. Dispatcher export: 1-day max date range (undocumented)
When the date range exceeds 1 day, the API exhibits inconsistent failure behavior instead of a clear, documented validation response. This limit isn't in the docs.

**Suggestion:** Document the constraint and return a clear validation error with the allowed range.

### 17. Async operations return 204 with no tracking
Bulk operations (suppressions, block/unblock, bulk tags) return `204 No Content` and process asynchronously. There's an optional `callbackUrl` but no job ID or polling endpoint.

**Suggestion:** Return a job ID and provide a status polling endpoint.

---

## Wishlist: Would make the SDK significantly simpler

### 18. Unified API version
The v2/v3 split forces SDK authors to maintain two request pipelines (different base URLs, headers, error formats, response shapes). A single API version covering all functionality would cut SDK complexity roughly in half.

### 19. OpenAPI spec parity
The OpenAPI spec at [app.rule.io/redoc/api-v3.json](https://app.rule.io/redoc/api-v3.json) doesn't cover all endpoints and quirks documented above. A complete, accurate spec would enable auto-generated clients and reduce manual SDK maintenance.

### 20. Idempotency keys
For multi-step operations (automail creation = 5 API calls), an idempotency mechanism would prevent duplicate resources on retry after partial failure.
