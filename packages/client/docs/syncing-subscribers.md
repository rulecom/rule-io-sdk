# Syncing Subscribers

`subscribers.sync()` creates a subscriber if they don't exist yet, then writes custom field data and assigns tags — all in one logical call. It's the recommended entry point for any integration that needs to ensure a subscriber exists _and_ associate data with them in a single operation.

## When to use `sync()` vs `create()`

Use `create()` when you only need to register a subscriber — no fields, no tags, just the identity record. Use `sync()` when you also need to write custom field data or assign tags alongside the create-or-update. Because `sync()` is idempotent, it works equally well as an upsert on repeated calls: running it again with the same email won't create a duplicate; it will update the existing subscriber's data.

## Basic sync

The `subscriber` property accepts the same fields as `create()`: `email`, `phoneNumber`, `customIdentifier`, `status`, and `language`. At least one identifier is required.

```typescript
await client.subscribers.sync({
  subscriber: { email: 'jane@example.com' },
  customFieldData: {
    Profile: { FirstName: 'Jane', Language: 'sv' },
    Order:   { OrderRef: 'ORD-9921', Total: '149.00' },
  },
  tags: ['Newsletter', 'VIP'],
});
```

You can include any `create()` fields alongside the identifier — for example to set `status` and `language` at the same time as writing custom fields:

```typescript
await client.subscribers.sync({
  subscriber: {
    email: 'jane@example.com',
    status: 'ACTIVE',
    language: 'sv',
  },
  customFieldData: {
    Profile: { FirstName: 'Jane' },
  },
  tags: ['Newsletter'],
});
```

## Auto-creating fields, groups, and tags

Field groups, fields, and tags are created automatically if they don't exist yet — you don't need to pre-register them. You can write fields into as many groups as you need in a single call. Group names must be non-empty and must not contain dots.

## Historical custom field data

For fields that should be recorded as an append-only history (each sync adds a new entry rather than overwriting), use `historicalCustomFieldData` instead of `customFieldData`:

```typescript
await client.subscribers.sync({
  subscriber: { email: 'jane@example.com' },
  customFieldData: {
    Profile: { MemberTier: 'Gold' },
  },
  historicalCustomFieldData: {
    Purchases: { OrderRef: 'ORD-9921', Total: '149.00' },
  },
  tags: ['purchased'],
});
```

See [Custom Fields](./custom-fields) for details on how fields, groups, and historical groups work.

*→ [`SubscriberSyncPayload`](/api/client/src/interfaces/SubscriberSyncPayload) · [`CreateSubscriberPayload`](/api/client/src/interfaces/CreateSubscriberPayload)*

## See also

- [Custom Fields](./custom-fields) — how field groups, value types, and historical fields work
- [Organizing with Tags](./organizing-with-tags) — managing tags and segmenting subscribers
