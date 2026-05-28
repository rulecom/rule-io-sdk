# Managing Tags

Tags are labels you define in your Rule.io account and attach to subscribers. This page covers the tag catalogue itself — creating, listing, finding, updating, clearing, and deleting tags.

To assign or remove tags on a specific subscriber, see [Organizing with Tags](./organizing-with-tags).

## Creating a tag

```typescript
const tag = await client.tags.create({
  name: 'VIP',
  description: 'High-value customers',
});

const tagId = tag.data!.id!;
```

*→ [`RuleTagEntity`](/api/client/src/interfaces/RuleTagEntity)*

## Listing tags

```typescript
const tags = await client.tags.list();           // up to 100 by default

const tags = await client.tags.list({ limit: 50 });
```

## Finding a tag

`tags.get()` accepts a name or a numeric ID and returns `null` when no match is found:

```typescript
const tag = await client.tags.get('VIP');    // by name
const tag = await client.tags.get(42);       // by ID

// or explicitly:
const tag = await client.tags.getByName('VIP');
const tag = await client.tags.getById(42);
```

Pass `{ withCount: true }` to include the number of subscribers currently associated with the tag:

```typescript
const tag = await client.tags.get('VIP', { withCount: true });

console.log(tag?.data?.count); // e.g. 1204
```

## Updating a tag

```typescript
await client.tags.update('VIP', { name: 'Platinum', description: 'Platinum tier customers' });

// or by ID:
await client.tags.update(42, { name: 'Platinum' });
```

## Clearing a tag

`tags.clear()` removes all subscriber associations from a tag without deleting the tag itself. Use this to reset a seasonal or campaign tag between runs while keeping the tag definition in place:

```typescript
await client.tags.clear('summer-2024');

await client.tags.clear(42); // by ID
```

## Deleting a tag

```typescript
await client.tags.delete('old-tag');

await client.tags.delete(42); // by ID
```

## Next steps

- Assign and remove tags on subscribers: [Organizing with Tags](./organizing-with-tags)
- Add tags to many subscribers at once: [Bulk Operations](./bulk-operations)
- Trigger automations when tags are assigned: [Setting Up Automations](./setting-up-automations)
