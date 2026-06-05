# Organizing Your Audience with Tags

Tags are labels you attach to subscribers to record their interests, lifecycle stage, purchase history, or any attribute relevant to your messaging. You can then filter subscribers by tag and target campaigns or automations at specific tagged groups.

For managing the tag catalogue itself (creating, listing, renaming, or deleting tags), see [Managing Tags](./managing-tags). For a full description of the subscriber identifier forms used in examples below, see [Subscriber Identifiers](./subscriber-identifiers).

## Assigning a single tag

Use `addSubscriberTag()` to add one tag to one subscriber. The operation is synchronous — the tag is applied before the call returns.

```typescript
await client.subscribers.addSubscriberTag(
  { email: 'jane@example.com' },
  'VIP',
);
```

## Removing a single tag

Use `removeSubscriberTag()` to remove one tag from one subscriber. Like `addSubscriberTag`, this is synchronous.

```typescript
await client.subscribers.removeSubscriberTag(
  { email: 'jane@example.com' },
  'temporary-promo',
);
```

> **Known issue:** Segment membership is not recalculated after tag removal.

## Adding multiple tags to a subscriber

Use `addSubscriberTags()` to add several tags in a single call. This is **asynchronous** — Rule.io accepts the request and applies the tags in the background.

```typescript
await client.subscribers.addSubscriberTags(
  { email: 'jane@example.com' },
  ['VIP', 'order-confirmed', 'newsletter'],
);
```

To be notified when the operation completes, pass a `callbackUrl`:

```typescript
await client.subscribers.addSubscriberTags(
  { email: 'jane@example.com' },
  ['VIP', 'order-confirmed'],
  { callbackUrl: 'https://yourapp.com/webhooks/rule' },
);
```

## Removing multiple tags from a subscriber

Use `removeSubscriberTags()` to remove several tags in a single call. Also asynchronous.

```typescript
await client.subscribers.removeSubscriberTags(
  { email: 'jane@example.com' },
  ['old-promo', 'expired-trial'],
);
```

> **Known issue:** Same segment sync gap as `removeSubscriberTag`.

## Tagging multiple subscribers at once

Use `bulkAddSubscriberTags()` when you need to apply tags to many subscribers in one request. Asynchronous.

```typescript
await client.subscribers.bulkAddSubscriberTags(
  [
    { email: 'alice@example.com' },
    { email: 'bob@example.com' },
    { id: 1042 },
  ],
  ['newsletter', 'promo-may'],
);
```

## Removing tags from multiple subscribers

Use `bulkRemoveSubscriberTags()` to remove tags from many subscribers at once. Asynchronous.

```typescript
await client.subscribers.bulkRemoveSubscriberTags(
  [
    { email: 'alice@example.com' },
    { email: 'bob@example.com' },
  ],
  ['old-campaign'],
  { callbackUrl: 'https://yourapp.com/webhooks/rule' },
);
```

## Checking a subscriber's tags

```typescript
const tags = await client.subscribers.getSubscriberTags('jane@example.com');

const tagNames = tags.map(t => t.name);
// ['VIP', 'order-confirmed', 'newsletter']
```

Returns an empty array (not `null`) when the subscriber doesn't exist.

## Finding subscribers by tag

`subscribers.listSubscribersByTagIds()` returns subscribers that have **all** of the specified tag IDs (intersection, not union). This is useful for building targeted export lists or checking membership.

For a single page:

```typescript
const result = await client.subscribers.listSubscribersByTagIds({
  tagIds: [42, 87],
  pagination: { page: 1, pageSize: 100 },
});

// result.nextPage — pass back as pagination.page to fetch the next page
```

For iterating all matching subscribers across pages:

```typescript
for await (const sub of client.subscribers.iterateSubscribersByTagIds({ tagIds: [42, 87] })) {
  console.log(sub.email);
}
```

To target campaigns at tagged groups, use the `recipients` namespace — see [Running Campaigns](./running-campaigns#selecting-recipients).

*→ [`ListSubscribersByTagIdsParams`](/api/client/src/interfaces/ListSubscribersByTagIdsParams) · [`ListSubscribersByTagIdsResult`](/api/client/src/interfaces/ListSubscribersByTagIdsResult)*

## Next steps

- Manage the tag catalogue (create, update, delete): [Managing Tags](./managing-tags)
- Trigger automations when assigning tags: [Triggering Tag Automations](./tag-automation-modes)
- Set up tag-triggered automations: [Setting Up Automations](./setting-up-automations)
- Use tags to select campaign recipients: [Running Campaigns](./running-campaigns)
