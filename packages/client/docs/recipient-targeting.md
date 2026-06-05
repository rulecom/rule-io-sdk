# Recipient Targeting

The `client.recipients` namespace provides lightweight, read-only lists of tags, segments, and subscribers for use when setting up campaign recipients. These endpoints return just the IDs and names you need to configure who receives a campaign — they are not for managing subscribers, tags, or segments themselves.

See [Running Campaigns](./running-campaigns) for how to attach the IDs you find here to a campaign.

## Targeting tags

Tags are the most common targeting mechanism. You look up tag IDs here, then pass them to `client.campaigns.setCampaignTags()` along with an `include`/`exclude` flag (`negative: false` to include, `negative: true` to exclude).

### One page

```typescript
const page = await client.recipients.listTags({ pagination: { pageSize: 50 } });
for (const tag of page) {
  console.log(tag.id, tag.name);
}
```

### All tags at once

```typescript
const tags = await client.recipients.listAllTags();
const vipTagId = tags.find((t) => t.name === 'VIP')?.id;
```

### Stream tag by tag

Memory-efficient for large accounts — processes each tag without loading all into memory:

```typescript
for await (const tag of client.recipients.iterateTags()) {
  console.log(tag.id, tag.name);
}
```

### Stream page by page

Useful when you need control over each page as a batch:

```typescript
for await (const page of client.recipients.iterateTagsPages({ pagination: { pageSize: 100 } })) {
  console.log(`Processing batch of ${page.length} tags`);
}
```

### Using tag IDs in a campaign

Once you have the IDs, attach them to a campaign with `negative: false` to include subscribers with that tag, or `negative: true` to exclude them:

```typescript
await client.campaigns.setCampaignTags(campaignId, [
  { id: vipTagId,        negative: false },  // include VIP subscribers
  { id: unsubscribedId,  negative: true  },  // exclude unsubscribed
]);
```

## Targeting segments

Segments let you target dynamically-computed subscriber groups. Get segment IDs here and pass them to `client.campaigns.setCampaignSegments()`.

### One page

```typescript
const page = await client.recipients.listSegments({ pagination: { pageSize: 50 } });
```

### All segments at once

```typescript
const segments = await client.recipients.listAllSegments();
const segmentId = segments.find((s) => s.name === 'Active customers last 30 days')?.id;
```

### Stream segment by segment

```typescript
for await (const segment of client.recipients.iterateSegments()) {
  console.log(segment.id, segment.name);
}
```

### Stream page by page

```typescript
for await (const page of client.recipients.iterateSegmentsPages({ pagination: { pageSize: 50 } })) {
  // process each page
}
```

### Using segment IDs in a campaign

```typescript
await client.campaigns.setCampaignSegments(campaignId, [
  { id: segmentId, negative: false },
]);
```

## Targeting individual subscribers

For campaigns that target specific people rather than groups. Use the subscriber IDs here with `client.campaigns.setCampaignSubscribers()`.

For most campaigns, tags or segments are more practical. Individual subscriber targeting is best suited for personalised one-off sends.

### One page

```typescript
const page = await client.recipients.listSubscribers({ pagination: { pageSize: 50 } });
```

### All subscribers at once

```typescript
const subscribers = await client.recipients.listAllSubscribers();
const ids = subscribers.map((s) => s.id);
```

The response includes `id`, `email`, `phone`, `customIdentifier`, and `status`.

### Stream subscriber by subscriber

```typescript
for await (const subscriber of client.recipients.iterateSubscribers()) {
  console.log(subscriber.id, subscriber.email);
}
```

### Stream page by page

```typescript
for await (const page of client.recipients.iterateSubscribersPages({ pagination: { pageSize: 50 } })) {
  const ids = page.map((s) => s.id);
  // add to campaign...
}
```

### Using subscriber IDs in a campaign

```typescript
await client.campaigns.setCampaignSubscribers(campaignId, ids);
```

## Which method to use

| Method | When to use |
|--------|-------------|
| `list*()` | UI tables, manual pagination, or retrying a single page |
| `listAll*()` | Simple scripts and accounts with up to a few thousand items |
| `iterate*()` | Processing every item one by one without loading all into memory |
| `iterate*Pages()` | Batch processing with full control over each page as a unit |

`list*()` fetches exactly one page (default 15 items per page). The other three methods all auto-paginate until all items have been yielded.

## Next steps

- Attach recipients to a campaign: [Running Campaigns](./running-campaigns)
- Manage tag definitions: [Managing Tags](./managing-tags)
- Manage subscriber data: [Managing Subscribers](./managing-subscribers)
