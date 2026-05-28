# SubscribersClient — API Surface Investigation

## Overview

The `SubscribersClient` wraps two generations of the Rule.io API (v2 and v3) behind a single namespace. The underlying APIs were designed at different times and make different naming and structural choices. As a result, the SDK currently leaks those inconsistencies directly to consumers: the same concept (a phone number, a subscriber entity, a 404 response) is represented differently depending on which method you call.

This document catalogues ten concrete inconsistencies, shows the friction each creates for SDK consumers, and proposes a normalization layer that absorbs the raw API's rough edges so consumers never have to think about them.

---

## Inconsistencies

### 1. `phone` vs `phone_number` — Split Naming Across API Versions

The v2 API uses `phone_number` throughout; the v3 API uses `phone` in responses. Both leak through the SDK unchanged:

| Location | Field name |
|---|---|
| `CreateSubscriberRequest` (v3 request body) | `phone_number` |
| `CreateSubscriberResponse.data` (v3 response) | `phone` |
| `GetSubscriberResponse.subscriber` (v2 response) | `phone_number` |
| `SubscriberRecord` (v2 list response) | `phone_number` |
| `Subscriber` (v3 entity type, unused by methods today) | `phone` |
| `BulkSubscriberIdentifier` | `phone_number` |

**Consumer friction:**

```typescript
// Send with phone_number
const result = await client.subscribers.create({ phone_number: '+46700000001' });

// But read back as phone — silently different field name
console.log(result.data.phone);        // ✓
console.log(result.data.phone_number); // undefined — TypeScript doesn't catch this
                                       // because phone_number is not on CreateSubscriberResponse.data
```

**Proposed normalization:** Choose one canonical SDK-level field name — `phone` is shorter and aligns with `email` / `custom_identifier`. Map both raw spellings to `phone` in all SDK response types. Request types that must match the wire format (`phone_number`) stay as-is internally but can be hidden behind a normalized `CreateSubscriberParams` type.

---

### 2. Four Incompatible "Subscriber" Entity Shapes

Four types all represent "a subscriber" but differ in field names, optionality, and which fields exist:

| Type | Used by | `email` | Phone field | `tags` |
|---|---|---|---|---|
| `Subscriber` | v3 entity (currently unused by methods) | `?: string\|null` | `phone?: string\|null` | absent |
| `GetSubscriberResponse.subscriber` | `getById`, `getByEmail`, `getByPhone` | `string` (required) | `phone_number?: string` | `Array<{id, name}>\|undefined` |
| `SubscriberRecord` | `listSubscribersByTagIds` | `string\|null` | `phone_number: string\|null` | `Array<{id, name}>\|null\|undefined` |
| `CreateSubscriberResponse.data` | `create` | `string\|null` | `phone: string\|null` | absent |

**Consumer friction:**

```typescript
// Generic function that processes any subscriber — impossible to write correctly
function processSubscriber(sub: ???) {
  console.log(sub.email);
  // Which phone field? sub.phone? sub.phone_number?
  // Are tags always present? Optional? Null?
}

// Must write four separate overloads or cast everywhere
```

**Proposed normalization:** Define a single `SubscriberEntity` type the SDK always returns from lookup and list methods. Map each raw API shape to `SubscriberEntity` at the transport boundary. Consumers only ever see one shape.

```typescript
interface SubscriberEntity {
  id: number;
  email: string | null;
  phone: string | null;             // canonical name
  custom_identifier: string | null;
  status?: string;
  language?: string;
  tags?: Array<{ id: number; name: string }>;
  created_at?: string;
  updated_at?: string;
}
```

---

### 3. Response Envelope Inconsistency

Every method puts the useful data at a different path:

| Method | Where data lives | How to access subscriber ID |
|---|---|---|
| `create()` | `result.data.id` | `result.data.id` |
| `getById()` | `result.subscriber.id` | `result.subscriber.id` |
| `listCustomFieldData()` | `result.data` (array) | N/A |
| `searchCustomFieldData()` | `result.data` (single object) | N/A |
| `sync()`, write ops | `result.success` | not returned |

**Consumer friction:**

```typescript
const created = await client.subscribers.create({ email: 'a@example.com' });
const createdId = created.data.id; // must unwrap .data

const found = await client.subscribers.getByEmail('a@example.com');
const foundId = found?.subscriber.id; // must unwrap .subscriber

// These should be the same thing but require different accessors
```

**Proposed normalization:** SDK methods return the entity directly, not inside an envelope. `create()` and `getByEmail()` both return `SubscriberEntity | null`. Write operations consistently return `void` (or `{ success: true }` if a response object is needed for backwards compatibility).

---

### 4. `getFields()` Returns a Flat Map; `sync()` Writes a Nested Map

The same custom field data is represented differently depending on the direction:

- **Write path (`sync`):** `{ customFieldData: { Order: { OrderRef: 'ORD-123' } } }` — nested two-level map
- **Read path (`getFields`):** `{ 'Order.OrderRef': 'ORD-123' }` — flat dot-keyed map

**Consumer friction:**

```typescript
// Read
const fields = await client.subscribers.getFields('a@example.com');
// { 'Order.OrderRef': 'ORD-123', 'Order.Total': '149.00' }

// Now modify and write back — must manually reconstruct the nested structure
const nested: Record<string, Record<string, string>> = {};
for (const [key, value] of Object.entries(fields)) {
  const [group, field] = key.split('.');      // assumes no dots in names
  nested[group] ??= {};
  nested[group][field] = value ?? '';
}

await client.subscribers.sync({
  subscriber: { email: 'a@example.com' },
  customFieldData: nested,                    // finally writable
});
```

**Proposed normalization:** `getFields()` should return `CustomFieldGroupDataRecord` — the same nested format that `sync()` accepts. The flat representation could remain available as a utility export (`flattenCustomFields(record)` and `unflattenCustomFields(flat)`) for consumers who specifically need it.

---

### 5. `getTagNames()` Discards Tag IDs

`getTagNames()` extracts only the name from each `{ id, name }` tag object the API returns, throwing away the ID. But `listSubscribersByTagIds()` requires numeric IDs — so resolving tag names to IDs requires going through `client.tags`, a completely separate namespace.

| Operation | Accepts | Returns |
|---|---|---|
| `addTags()` | `(string\|number)[]` — names or IDs | — |
| `removeTag()` | `string\|number` — name or ID | — |
| `getTagNames()` | email | `string[]` — **names only** |
| `listSubscribersByTagIds()` | `{ tag_ids: number[] }` | subscribers |
| All response `tags` arrays | — | `Array<{id: number, name: string}>` |

**Consumer friction:**

```typescript
// Want to list subscribers with the 'newsletter' tag
// Step 1: resolve the name to an ID (must leave subscribers namespace)
const allTags = await client.tags.list();
const newsletterId = allTags.find(t => t.name === 'newsletter')?.id;

// Step 2: now can filter
const result = await client.subscribers.listSubscribersByTagIds({
  tag_ids: [newsletterId!],
});
// The subscribers namespace alone is not self-sufficient for this common pattern
```

**Proposed normalization:** Rename `getTagNames()` to `getTags()` and return `Array<{id: number, name: string}>`. The API already provides both fields — no extra request needed, just stop discarding the ID.

---

### 6. Client-Side Intersection Filtering and Inconsistent `limit` vs `per_page`

`listSubscribersByTagIds()` fetches a full page from the API and filters client-side, because the Rule.io API has no native tag-intersection endpoint. This creates two problems:

**6a. Surprising filtering semantics:**

The `limit` parameter controls raw page size, not the number of results returned. A page of 500 raw subscribers might yield 0 results after filtering. `result.scanned` vs `result.matched` expose the gap, but callers typically expect `limit` to bound the result set.

**6b. Inconsistent pagination param name:**

- `listSubscribersByTagIds()` uses `limit` (v2 convention)
- `listCustomFieldData()` uses `per_page` (v3 convention)

Same concept, two names, same namespace client.

**Consumer friction:**

```typescript
// Caller expects up to 50 results
const result = await client.subscribers.listSubscribersByTagIds({
  tag_ids: [10, 20, 30],
  limit: 50,                // this is raw page size, not result count
});

// result.matched could be 0 even with limit: 50
// And the next call uses per_page, not limit
const cfd = await client.subscribers.listCustomFieldData(id, {
  per_page: 50,             // different param name for same concept
});
```

**Proposed normalization:**
- Expose a single `pageSize` param in all list methods; map to `limit` or `per_page` internally.
- Add an async generator `fetchAllByTagIds(params)` that paginates transparently and yields `SubscriberRecord` items one at a time.
- Document prominently that `listSubscribersByTagIds()` does client-side filtering.

---

### 7. `BulkSubscriberIdentifier` — All Optional, No Client-Side Validation

```typescript
interface BulkSubscriberIdentifier {
  email?: string;
  phone_number?: string;
  id?: number;
  custom_identifier?: string;  // all four fields optional
}
```

The API requires exactly one field. Passing zero or two identifiers produces a server error. No client-side check exists. This affects `block()`, `unblock()`, `bulkAddTags()`, and `bulkRemoveTags()`.

**Consumer friction:**

```typescript
// Silently wrong — two identifiers will cause a 400 from the server
await client.subscribers.bulkAddTags({
  subscribers: [{ email: 'a@example.com', id: 123 }],
  tags: ['newsletter'],
});

// TypeScript raises no error — both fields are optional
```

**Proposed normalization:** Replace `BulkSubscriberIdentifier` with a discriminated union:

```typescript
type SubscriberIdentifier =
  | { email: string }
  | { phone_number: string }
  | { id: number }
  | { custom_identifier: string };
```

TypeScript will then prevent providing multiple identifier fields, and the constraint is enforced at compile time rather than at runtime on the server.

---

### 8. 404 Handling — Three Different Conventions

| Method | On 404 | Ambiguity |
|---|---|---|
| `getById()`, `getByEmail()`, `getByPhone()` | `null` | None — clear signal |
| `searchCustomFieldData()` | `null` | None — clear signal |
| `getFields()` | `{}` (empty object) | Cannot distinguish "not found" from "found, no fields" |
| `getTagNames()` | `[]` (empty array) | Cannot distinguish "not found" from "found, no tags" |

**Consumer friction:**

```typescript
const fields = await client.subscribers.getFields('missing@example.com');
// {} — subscriber does not exist

const fields2 = await client.subscribers.getFields('exists@example.com');
// {} — subscriber exists but has no custom fields

// fields === fields2 === {} — identical responses, different situations
// Cannot distinguish without a separate getByEmail() round-trip

const tags = await client.subscribers.getTagNames('new@example.com');
// [] — is this new user not found, or found with no tags?
```

**Proposed normalization:** `getFields()` and `getTags()` should return `null` when the subscriber is not found (HTTP 404), and an empty collection when the subscriber exists but has no data. This aligns them with `getById()` and `searchCustomFieldData()`.

---

### 9. `sync()` Swallows the Resolved Subscriber ID

`sync()` internally creates or resolves the subscriber, uses the numeric ID to write fields and tags in parallel, then returns only `{ success: true }`. The resolved ID is unavailable to the caller.

**Consumer friction:**

```typescript
await client.subscribers.sync({
  subscriber: { email: 'customer@example.com' },
  customFieldData: { Order: { Ref: 'ORD-123' } },
  tags: ['confirmed'],
});

// Now need the subscriber ID for a subsequent operation
const sub = await client.subscribers.getByEmail('customer@example.com'); // extra round-trip
const subscriberId = sub?.subscriber.id;
```

**Proposed normalization:** `sync()` should return the resolved subscriber ID (or a `SubscriberEntity`):

```typescript
const { id } = await client.subscribers.sync({ subscriber: { email: '...' }, ... });
// No extra round-trip needed
```

---

### 10. `getFields()` vs `listCustomFieldData()` — Overlapping Concerns, Opposite Behavior

Both methods read a subscriber's custom field values. They differ in every significant way:

| Aspect | `getFields()` | `listCustomFieldData()` |
|---|---|---|
| Input identifier | email string | subscriber numeric ID |
| API endpoint | v2 `/subscriber/{email}/fields` | v3 `/custom-field-data/{id}` |
| Output shape | flat `Record<"Group.Field", string\|null>` | typed `CustomFieldDataRecord[]` |
| On 404 | `{}` — silent empty object | throws `RuleApiError` |
| Field type info | strings only | `text`, `datetime`, `date`, `time`, `multiple`, `json` |

The 404 behavior difference is especially dangerous: a caller who switches from `getFields()` to `listCustomFieldData()` for performance reasons must also add a try/catch that wasn't needed before.

**Proposed normalization:**
- Normalize 404 behavior: both methods return `null` for missing subscriber, empty collection for found-but-empty.
- Document the intended use case for each: `getFields()` is the ergonomic fast read for simple string values; `listCustomFieldData()` is for typed, structured access. Different tools for different jobs — but the 404 contract should be identical.

---

## Summary Table

| # | Issue | Affected methods | Proposed change |
|---|---|---|---|
| 1 | `phone` vs `phone_number` | All response types | Canonical `phone` in SDK response types |
| 2 | Four subscriber entity shapes | `create`, `getById/Email/Phone`, `listSubscribersByTagIds` | Single `SubscriberEntity` type |
| 3 | Response envelope inconsistency | `create`, `getById`, `listCustomFieldData`, `searchCustomFieldData` | Unwrap to direct entity return |
| 4 | Flat vs nested custom field map | `getFields`, `sync` | `getFields` returns `CustomFieldGroupDataRecord` |
| 5 | `getTagNames` discards IDs | `getTagNames` | Rename to `getTags`, return `{id, name}[]` |
| 6 | Client-side filtering + `limit` vs `per_page` | `listSubscribersByTagIds`, `listCustomFieldData` | `pageSize` param; async generator `fetchAllByTagIds` |
| 7 | `BulkSubscriberIdentifier` all-optional | `block`, `unblock`, `bulkAddTags`, `bulkRemoveTags` | Discriminated union `SubscriberIdentifier` |
| 8 | 404 returns `{}` / `[]` not `null` | `getFields`, `getTagNames` | `null` on 404, empty collection on found-but-empty |
| 9 | `sync()` swallows subscriber ID | `sync` | Return `SubscriberEntity` (or `{ id }`) |
| 10 | `getFields` vs `listCustomFieldData` 404 mismatch | `getFields`, `listCustomFieldData` | Normalize 404 contract; document intended use |

---

## What Is Already Consistent

These areas work well and should be preserved as-is:

- **Timestamps:** `created_at` / `updated_at` are uniformly snake_case ISO 8601 strings across all response types.
- **Write return convention:** All write operations (`addTags`, `removeTag`, `createCustomFieldData`, `deleteByEmail`, etc.) consistently return `{ success: true }`. No surprises here.
- **Phone URL encoding:** `getByPhone()` automatically URL-encodes the phone number before embedding it in the URL path. Consistent and transparent.
- **Error re-throw:** Every method that catches a `RuleApiError` re-throws anything that isn't the specifically handled status code (404). No silent swallowing of unexpected errors.
- **`custom_identifier` naming:** Consistent across request and response types — no v2/v3 split.
- **Explicit `identifiedBy` methods:** `deleteByEmail`, `deleteById`, `deleteByPhoneNumber`, `deleteByCustomIdentifier` are clearer than a single polymorphic `delete(identifier, type)`. The same pattern is used for `getBy*` methods.
