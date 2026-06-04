# Running Email Campaigns

A campaign is a one-time or scheduled email blast sent to a defined set of recipients. The full lifecycle has four stages:

1. **Create** the campaign shell
2. **Attach email content** — message, template, dynamic set
3. **Set recipients** — tags, segments, or individual subscribers
4. **Schedule** — send immediately or at a specific time

For building the email content (stage 2), see [Email Messages](./email-messages), [Email Templates](./email-templates), and [Dynamic Sets](./dynamic-sets).

## Creating a campaign

Use `createEmailCampaign()` to create a new email campaign shell. The campaign starts with no name and no recipients — add those separately before scheduling.

```typescript
const campaign = await client.campaigns.createEmailCampaign({
  sendoutType: 'marketing',
});
const campaignId = campaign.id!;
```

*→ [`CreateEmailCampaignPayload`](/api/client/src/interfaces/CreateEmailCampaignPayload)*

## Attaching email content

After creating a campaign, attach a message, template, and dynamic set before scheduling. See [Email Messages](./email-messages) for the full walkthrough — the process is the same regardless of whether the dispatcher is a campaign or an automation.

## Renaming a campaign

```typescript
await client.campaigns.renameCampaign(campaignId, 'Spring Newsletter 2025');
```

## Setting sendout type

```typescript
// Marketing (default) — standard bulk email
await client.campaigns.setCampaignSendoutType(campaignId, 'marketing');

// Transactional — for order confirmations, receipts, etc.
await client.campaigns.setCampaignSendoutType(campaignId, 'transactional');
```

## Setting recipients

### Tags

Use tags to target groups of subscribers. Set `negative: true` to exclude subscribers with that tag.

```typescript
await client.campaigns.setCampaignTags(campaignId, [
  { id: 42, negative: false },  // include subscribers with tag 42
  { id: 7,  negative: true },   // exclude subscribers with tag 7
]);
```

To find available tag IDs use `client.tags.list()`.

### Segments

```typescript
await client.campaigns.setCampaignSegments(campaignId, [
  { id: 12, negative: false },
]);
```

To find segment IDs use `client.recipients.segments.list()`.

### Individual subscribers

```typescript
await client.campaigns.setCampaignSubscribers(campaignId, [101, 102, 103]);
```

You can combine all three types on the same campaign — set whichever combination applies.

## Updating multiple fields

Use `updateEmailCampaign()` when you want to change several fields in a single operation. It fetches the existing record, merges your changes, and writes the full merged body back. Omitted fields are left as-is.

```typescript
await client.campaigns.updateEmailCampaign(campaignId, {
  name: 'Spring Newsletter',
  sendoutType: 'marketing',
  tags: [{ id: 42, negative: false }],
  segments: [],
  subscribers: [],
});
```

*→ [`UpdateEmailCampaignPayload`](/api/client/src/interfaces/UpdateEmailCampaignPayload)*

## Scheduling a campaign

Send immediately:

```typescript
await client.campaigns.schedule(campaignId, { type: 'now' });
```

Schedule for a specific date and time (ISO 8601):

```typescript
await client.campaigns.schedule(campaignId, {
  type: 'schedule',
  datetime: '2025-09-15T09:00:00+02:00',
});
```

Cancel a scheduled send (moves the campaign back to draft):

```typescript
await client.campaigns.schedule(campaignId, { type: null });
```

*→ [`ScheduleCampaignPayload`](/api/client/src/interfaces/ScheduleCampaignPayload)*

## Duplicating a campaign

Copy an existing campaign — useful for recurring newsletters where the structure stays the same but the content changes each time.

```typescript
const copy = await client.campaigns.copy(campaignId);
const newCampaignId = copy.id!;
```

## Fetching a campaign

Retrieve a single campaign by ID. Returns `null` if the campaign does not exist.

```typescript
const campaign = await client.campaigns.get(campaignId);
if (campaign) {
  console.log(campaign.name, campaign.status?.key);
}
```

## Listing campaigns

The API returns campaigns of all message types. Use the method that fits your use case:

```typescript
// One page — for UI tables, manual pagination, or retrying a specific page
const page = await client.campaigns.listCampaigns({
  filters: { messageType: 'email' },
  pagination: { page: 1, pageSize: 20 },
});

// All campaigns as a single array
const all = await client.campaigns.listAllCampaigns({ filters: { messageType: 'email' } });

// Stream individual campaigns — memory-efficient for large lists
for await (const campaign of client.campaigns.iterateCampaigns()) {
  console.log(campaign.name, campaign.status?.key);
}

// Stream page by page — useful for batched processing
for await (const page of client.campaigns.iterateCampaignsPages({ pagination: { pageSize: 50 } })) {
  console.log(`Batch of ${page.length} campaigns`);
}
```

`listCampaigns()` fetches exactly one page. The iterators auto-paginate until all campaigns have been yielded.

## Deleting a campaign

```typescript
await client.campaigns.delete(campaignId);
```

## Next steps

- Build the email content: [Email Messages](./email-messages)
- Set up a recurring trigger-based email instead: [Setting Up Automations](./setting-up-automations)
- Review campaign performance after sending: [Tracking Performance](./tracking-performance)
