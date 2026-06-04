# Running Email Campaigns

A campaign is a one-time or scheduled email blast sent to a defined set of recipients. This guide walks through the full lifecycle: creating a campaign, attaching email content, selecting who receives it, and sending.

## Campaign lifecycle

```
campaigns.create()
    ↓
messages.create()  →  templates.create()  →  dynamicSets.create()
    ↓
campaigns.update()  (set name, recipients)
    ↓
campaigns.schedule()  (send now or at a specific time)
```

For building the email itself (messages, templates, dynamic sets) see [Email Messages](./email-messages).

## Creating a campaign

```typescript
const campaign = await client.campaigns.create({
  message_type: 1,  // 1 = email
  sendout_type: 1,  // 1 = regular campaign
});
const campaignId = campaign.data!.id!;
```

The campaign starts with no name and no recipients — you add those with `update()`.

*→ [`RuleCampaignCreateRequest`](/api/client/src/interfaces/RuleCampaignCreateRequest)*

## Selecting recipients {#selecting-recipients}

Recipients can be tags, dynamic segments, or specific subscriber IDs. Update the campaign with whichever combination applies:

```typescript
await client.campaigns.update(campaignId, {
  name: 'Spring Newsletter',
  sendout_type: 1,
  tags: [
    { id: 42, negative: false },   // include subscribers with tag 42
    { id: 7,  negative: true },    // exclude subscribers with tag 7
  ],
  segments: [],
  subscribers: [],
});
```

To find available tag IDs: `client.tags.list()`. To find segment IDs: `client.recipients.segments.list()`.

You can mix tags, segments, and individual subscribers in the same campaign. Use `negative: true` on a tag to exclude that audience from receiving the campaign.

*→ [`RuleCampaignUpdateRequest`](/api/client/src/interfaces/RuleCampaignUpdateRequest) · [`RuleCampaignRecipientTag`](/api/client/src/interfaces/RuleCampaignRecipientTag)*

## Browsing available recipients

The `recipients` namespace gives you list-only views of tags, segments, and subscribers as they appear in the targeting UI:

```typescript
const tags = await client.recipients.tags.list({ page: 1, per_page: 50 });
const segments = await client.recipients.segments.list({ page: 1, per_page: 50 });
const subscribers = await client.recipients.subscribers.list({ page: 1, per_page: 50 });
```

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

Cancel a scheduled send:

```typescript
await client.campaigns.schedule(campaignId, { type: null });
```

*→ [`RuleCampaignScheduleRequest`](/api/client/src/interfaces/RuleCampaignScheduleRequest)*

## Duplicating a campaign

Copy an existing campaign — useful for recurring newsletters where the structure stays the same but the content changes:

```typescript
const copy = await client.campaigns.copy(campaignId);
const newCampaignId = copy.data!.id!;
```

## Listing and finding campaigns

```typescript
const campaigns = await client.campaigns.list({ page: 1, per_page: 20 });
const campaign = await client.campaigns.get(campaignId);
```

Filter by message type:

```typescript
const emailCampaigns = await client.campaigns.list({ message_type: 1 });
```

## Deleting a campaign

```typescript
await client.campaigns.delete(campaignId);
```

## Next steps

- Build the email content: [Email Messages](./email-messages)
- Set up a recurring trigger-based email instead: [Setting Up Automations](./setting-up-automations)
- Review campaign performance after sending: [Tracking Performance](./tracking-performance)
