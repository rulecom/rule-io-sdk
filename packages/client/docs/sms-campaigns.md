# SMS Campaigns

A campaign is a one-time or scheduled SMS blast sent to a defined set of recipients. The full lifecycle has four stages:

1. **Create** the campaign shell
2. **Attach SMS content** — message, template, dynamic set
3. **Set recipients** — tags, segments, or individual subscribers
4. **Schedule** — send immediately or at a specific time

For building the SMS content (stage 2), see [SMS Messages](./sms-messages), [SMS Templates](./sms-templates), and [Dynamic Sets](./dynamic-sets).

## Creating a campaign

Use `createSmsCampaign()` to create a new SMS campaign shell. The campaign starts with no name and no recipients — add those separately before scheduling.

```typescript
const campaign = await client.campaigns.createSmsCampaign({
  sendoutType: 'marketing',
});
const campaignId = campaign.id!;
```

*→ [`CreateSmsCampaignPayload`](/api/client/src/type-aliases/CreateSmsCampaignPayload)*

## Attaching SMS content

After creating a campaign, attach a message, template, and dynamic set before scheduling. See [SMS Messages](./sms-messages) for the full walkthrough — the process is the same regardless of whether the dispatcher is a campaign or an automation.

## Renaming a campaign

```typescript
await client.campaigns.renameCampaign(campaignId, 'Spring Promo SMS 2025');
```

## Setting sendout type

```typescript
// Marketing (default) — standard bulk SMS
await client.campaigns.setCampaignSendoutType(campaignId, 'marketing');

// Transactional — for order confirmations, OTP codes, etc.
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

To find available tag IDs use `client.recipients.listAllTags()`.

### Segments

```typescript
await client.campaigns.setCampaignSegments(campaignId, [
  { id: 12, negative: false },
]);
```

To find segment IDs use `client.recipients.listAllSegments()`.

### Individual subscribers

```typescript
await client.campaigns.setCampaignSubscribers(campaignId, [101, 102, 103]);
```

You can combine all three types on the same campaign — set whichever combination applies. Subscribers must have a phone number registered to receive SMS — see [Subscriber Identifiers](./subscriber-identifiers) for how phone numbers are matched.

## Updating multiple fields

Use `updateSmsCampaign()` when you want to change several fields in a single operation. It fetches the existing record, merges your changes, and writes the full merged body back. Omitted fields are left as-is.

```typescript
await client.campaigns.updateSmsCampaign(campaignId, {
  name: 'Spring Promo SMS',
  sendoutType: 'marketing',
  tags: [{ id: 42, negative: false }],
  segments: [],
  subscribers: [],
});
```

*→ [`UpdateSmsCampaignPayload`](/api/client/src/type-aliases/UpdateSmsCampaignPayload)*

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

Copy an existing campaign — useful for recurring SMS where the structure stays the same but the content changes each time.

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

The API returns campaigns of all message types. Filter to SMS using the `messageType: 'sms'` filter:

```typescript
// One page — for UI tables, manual pagination, or retrying a specific page
const page = await client.campaigns.listCampaigns({
  filters: { messageType: 'sms' },
  pagination: { page: 1, pageSize: 20 },
});

// All SMS campaigns as a single array
const all = await client.campaigns.listAllCampaigns({ filters: { messageType: 'sms' } });

// Stream individual campaigns — memory-efficient for large lists
for await (const campaign of client.campaigns.iterateCampaigns({ filters: { messageType: 'sms' } })) {
  console.log(campaign.name, campaign.status?.key);
}

// Stream page by page — useful for batched processing
for await (const page of client.campaigns.iterateCampaignsPages({
  filters: { messageType: 'sms' },
  pagination: { pageSize: 50 },
})) {
  console.log(`Batch of ${page.length} SMS campaigns`);
}
```

`listCampaigns()` fetches exactly one page. The iterators auto-paginate until all matching campaigns have been yielded.

## Deleting a campaign

```typescript
await client.campaigns.delete(campaignId);
```

## Next steps

- Build the SMS content: [SMS Messages](./sms-messages)
- Set up a recurring trigger-based SMS instead: [SMS Automations](./sms-automations)
- Review campaign performance after sending: [Analytics](./analytics)
