# Custom Fields

Custom field groups let you attach structured data to subscribers — contact preferences, order history, booking details, or any other domain-specific information. Each group contains one or more typed fields.

This page covers managing the **schema** — defining groups and fields. For reading and writing actual subscriber field **values**, see [Custom Fields](./custom-fields).

## Listing groups

Use the method that fits your use case:

```typescript
// One page — for UI tables or manual pagination
const page = await client.customField.listGroups({ limit: 20 });

// All groups as a single array — convenient for small accounts
const all = await client.customField.listAllGroups();

// Stream individual groups — memory-efficient for large accounts
for await (const group of client.customField.iterateGroups()) {
  console.log(group.name, group.fields.map((f) => f.name));
}

// Stream page by page — useful for batched processing
for await (const page of client.customField.iterateGroupsPages({ limit: 20 })) {
  console.log(`Batch of ${page.length} groups`);
}
```

`listGroups()` fetches exactly one page. The iterators auto-paginate until all groups have been yielded.

## Fetching a single group

Use `getGroupById()` or `getGroupByName()` to fetch a single group. Both return `null` if the group does not exist.

```typescript
// By ID
const group = await client.customField.getGroupById(42);
if (group) {
  console.log(group.name, group.fields);
}

// By name
const group = await client.customField.getGroupByName('Booking');
```

The response includes the group's fields with their IDs, names, and types.

## Creating groups and fields

`createGroups()` accepts an array of field definitions using the `"GroupName.FieldName"` key format. Both the group and the field are created if they do not already exist — the operation is idempotent.

```typescript
await client.customField.createGroups([
  { key: 'Booking.FirstName', type: 'text' },
  { key: 'Booking.LastName',  type: 'text' },
  { key: 'Booking.Date',      type: 'date' },
  { key: 'Order.TotalAmount', type: 'text' },
]);
```

If `type` is omitted, it defaults to `'text'`.

### Supported field types

| Type | Description |
|------|-------------|
| `'text'` | Free-form text (default) |
| `'single'` | Single-select |
| `'multiple'` | Multi-select |
| `'json'` | Arbitrary JSON value |
| `'date'` | Date (`YYYY-MM-DD`) |
| `'datetime'` | Date and time |
| `'time'` | Time only |

## Next steps

- Read and write subscriber field values: [Custom Fields](./custom-fields)
- Sync subscribers with field values in one call: [Syncing Subscribers](./syncing-subscribers)
