# Managing Subscribers

## v3 API (recommended)

```typescript
// Create
await client.createSubscriberV3({
  email: 'customer@example.com',
  status: 'ACTIVE',
  language: 'en',
});

// Add tags (with automation trigger)
await client.addSubscriberTagsV3('customer@example.com', {
  tags: ['vip', 'returning'],
  automation: 'force', // 'send' | 'force' | 'reset' | null
});

// Remove a tag
await client.removeSubscriberTagV3('customer@example.com', 'temporary-tag');

// Delete (supports email, phone_number, id, custom_identifier)
await client.deleteSubscriberV3('customer@example.com', 'email');
```

## Bulk operations

```typescript
await client.blockSubscribers([{ email: 'spam@example.com' }]);
await client.unblockSubscribers([{ email: 'restored@example.com' }]);

await client.bulkAddTags({
  subscribers: [{ email: 'a@example.com' }, { email: 'b@example.com' }],
  tags: ['campaign-2024'],
});
await client.bulkRemoveTags({
  subscribers: [{ email: 'a@example.com' }],
  tags: ['old-tag'],
});
```

## v2 API (legacy)

```typescript
// These still work but v3 equivalents are preferred
const subscriber = await client.getSubscriber('customer@example.com');
const tags = await client.getSubscriberTags('customer@example.com');
const fields = await client.getSubscriberFields('customer@example.com');
await client.syncSubscriber({
  email: 'customer@example.com',
  fields: { FirstName: 'Anna' },
  tags: ['vip'],
});
```
