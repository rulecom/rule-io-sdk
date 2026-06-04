# Managing Tags

Tags are labels you define in your Rule.io account and attach to subscribers. This page covers the tag catalogue itself — listing, finding, updating, clearing, and deleting tags.

Tags are created automatically when you assign them to subscribers (see [Organizing with Tags](./organizing-with-tags)). There is no separate create API.

To assign or remove tags on a specific subscriber, see [Organizing with Tags](./organizing-with-tags).

## Listing tags

Use the method that fits your use case:

```typescript
// One page — for UI tables, manual pagination, or retrying a specific page
const page = await client.tags.listTags({ pagination: { page: 1, pageSize: 20 } });

// All tags as a single array — convenient for scripts and small accounts
const all = await client.tags.listAllTags();

// Stream individual tags — memory-efficient for large accounts
for await (const tag of client.tags.iterateTags()) {
  console.log(tag.name);
}

// Stream page by page — useful for batched processing
for await (const page of client.tags.iterateTagsPages({ pagination: { pageSize: 50 } })) {
  console.log(`Batch of ${page.length} tags`);
}
```

`listTags()` fetches exactly one page (up to 100 tags, default). The iterators auto-paginate until all tags have been yielded.

## Finding a tag

`tags.get()` accepts a name or a numeric ID and returns `null` when no match is found:

```typescript
const tag = await client.tags.get('VIP');    // by name
const tag = await client.tags.get(42);       // by ID

// or explicitly:
const tag = await client.tags.getByName('VIP');
const tag = await client.tags.getById(42);
```

Pass `withCount: true` to include the number of subscribers currently associated with the tag:

```typescript
const tag = await client.tags.getById(42, { withCount: true });

console.log(tag?.recipientCount); // e.g. 1204
```

## Updating a tag

```typescript
await client.tags.update('VIP', { name: 'Platinum', description: 'Platinum tier customers' });

// or by ID:
await client.tags.update(42, { name: 'Platinum' });
```

Throws a `409 DuplicateTag` error if the new name is already taken.

## Clearing a tag

`tags.clear()` removes all subscriber associations from a tag without deleting the tag itself. Use this to reset a seasonal or campaign tag between runs while keeping the tag definition in place.

Resolves without error when the tag does not exist.

```typescript
await client.tags.clear('summer-2024');

await client.tags.clear(42); // by ID
```

## Deleting a tag

Resolves without error when the tag does not exist.

```typescript
await client.tags.delete('old-tag');

await client.tags.delete(42); // by ID
```

## Next steps

- Assign and remove tags on subscribers: [Organizing with Tags](./organizing-with-tags)
- Add tags to many subscribers at once: [Bulk Operations](./bulk-operations)
- Trigger automations when tags are assigned: [Setting Up Automations](./setting-up-automations)
