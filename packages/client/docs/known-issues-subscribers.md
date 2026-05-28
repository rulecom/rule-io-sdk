# Known Issues — Subscribers API

## Tag removal does not sync segment membership

**Affected method:** `client.subscribers.removeSubscriberTag()`

When you remove a tag from a subscriber using the V3 API, segment membership is **not recalculated**. Any dynamic segments that include or exclude subscribers based on that tag will reflect stale data until something else triggers a sync.

This is a gap in the V3 implementation. The older V2 endpoint (`DELETE /api/v2/subscribers/{subscriber}/tags/{tag}`) explicitly queued a segment sync after tag removal; the V3 endpoint does not.

**The V2 endpoint is not a viable workaround** because it does not support `custom_identifier` as a subscriber identifier — only `email`, `phone_number`, and `id` are accepted. If you identify subscribers by custom identifier, the V2 endpoint cannot be used.

**Impact:** A subscriber removed from a tag may continue to appear in tag-based segments, or continue to be excluded from segments that require that tag, until their segments are recalculated by another operation.

**Workaround:** There is no direct "sync segments" endpoint in the V3 API. The closest available workaround is to call `addSubscriberTags` with the subscriber's current tags (no net change) and `syncSegments: true`, which triggers a background segment recalculation as a side effect:

```typescript
// Trigger a segment sync without changing any tags.
// You must know the subscriber's current tags to use this workaround.
await client.subscribers.addSubscriberTags(
  { email: 'customer@example.com' },
  ['existing-tag'],
  { syncSegments: true },
);
```

This is indirect and requires knowing the subscriber's current tags.

---

## No lookup by custom identifier

**Affected method:** `client.subscribers.getBy*`

The SDK exposes four ways to retrieve a subscriber:

| Method | Identifier |
|--------|-----------|
| `getById(id)` | Numeric ID |
| `getByEmail(email)` | Email address |
| `getByPhone(phone)` | Phone number |
| *(missing)* | Custom identifier |

There is no `getByCustomIdentifier()` method, and `customIdentifier` is not accepted by any fetch operation.

This is inconsistent with delete operations, which support all four identifier types:

| Method | Identifier |
|--------|-----------|
| `deleteById(id)` | Numeric ID |
| `deleteByEmail(email)` | Email address |
| `deleteByPhoneNumber(phone)` | Phone number |
| `deleteByCustomIdentifier(identifier)` | Custom identifier ✓ |

The `SubscriberIdentifier` discriminated union — used by `addSubscriberTag`, `removeSubscriberTag`, `block`, `unblock`, and `bulkAddTags` — also accepts `{ customIdentifier }`. This means you can delete, tag, block, and unblock a subscriber by custom identifier, but you cannot retrieve them the same way.

**Impact:** If your system tracks subscribers only by a custom identifier (e.g. an external user ID), you cannot look them up to read their profile, tags, or custom field data.

**Workaround:** None available through the current API. If you need to read subscriber data, you must first know the subscriber's email, phone, or numeric Rule.io ID.
