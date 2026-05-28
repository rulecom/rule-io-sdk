# Setting Up Automations

An automation is a trigger-based email: it sends automatically when a subscriber enters a tag or a segment. Unlike campaigns (which you send once to a snapshot of your list), automations fire for each subscriber individually as they meet the trigger condition.

Common uses: welcome emails, order confirmations, re-engagement flows, onboarding sequences.

## How automations work

1. You create an automation with a **trigger** — a tag or a segment.
2. You attach a message and a template to the automation (same as campaigns).
3. When a subscriber is assigned the trigger tag (or enters the segment), Rule.io sends the email automatically.

## Creating a tag-triggered automation

```typescript
const automation = await client.automations.create({
  name: 'Welcome email',
  sendout_type: 2,
  trigger: {
    type: 'TAG',   // must be uppercase
    id: tagId,
  },
});
const automationId = automation.data!.id!;
```

> **Important**: `trigger.type` must be `'TAG'` or `'SEGMENT'` — uppercase. The API will reject lowercase values.

*→ [`RuleAutomationCreateRequest`](/api/client/src/interfaces/RuleAutomationCreateRequest) · [`RuleAutomationTrigger`](/api/client/src/interfaces/RuleAutomationTrigger)*

## Creating a segment-triggered automation

```typescript
const automation = await client.automations.create({
  name: 'Re-engagement flow',
  sendout_type: 2,
  trigger: {
    type: 'SEGMENT',
    id: segmentId,
  },
});
```

To find segment IDs, call `client.recipients.segments.list()`.

## Attaching email content

Once you have an automation ID, attach a message and template the same way as for campaigns — use `dispatcher_type: 'automail'`:

```typescript
const message = await client.messages.create({
  dispatcher: { id: automationId, type: 'automail' },
  type: 1,
  subject: 'Welcome to Acme!',
});

const template = await client.templates.create({
  message_id: message.data!.id!,
  name: 'Welcome template',
  message_type: 'email',
  template: rcml,
});

await client.dynamicSets.create({
  message_id: message.data!.id!,
  template_id: template.data!.id!,
});
```

See [Building Email Content](./email-content) for the full walkthrough.

## Listing automations

```typescript
// All automations
const automations = await client.automations.list();

// Only active ones
const active = await client.automations.list({ active: true });

// Filter by message type and paginate
const emailAutomations = await client.automations.list({
  message_type: 1,
  page: 1,
  per_page: 20,
});
```

## Updating an automation

```typescript
await client.automations.update(automationId, {
  name: 'Welcome email v2',
  active: true,
});
```

You can change the trigger, name, active state, or send type. The SDK performs a read-modify-write internally, so you only need to pass the fields you want to change.

*→ [`RuleAutomationUpdateRequest`](/api/client/src/interfaces/RuleAutomationUpdateRequest)*

## Disabling and deleting automations

```typescript
// Pause — keeps the automation but stops it from firing
await client.automations.update(automationId, { active: false });

// Remove permanently
await client.automations.delete(automationId);
```

## Triggering the automation when assigning a tag

When you assign a trigger tag to a subscriber, control whether the automation fires using the `automation` option in `subscribers.addSubscriberTags()`:

```typescript
await client.subscribers.addSubscriberTags(
  'jane@example.com',
  {
    tags: ['welcome'],
    automation: 'send',  // fire if not already sent
  },
  'email',
);
```

- `'send'` — fires the automation if it hasn't run for this subscriber yet
- `'force'` — fires it regardless of history
- `'reset'` — resets state and fires again
- `null` — assigns the tag silently, automation does not fire

## Next steps

- Build the email body: [Building Email Content](./email-content)
- Assign trigger tags to subscribers: [Organizing with Tags](./organizing-with-tags)
- Send a one-off blast instead: [Running Campaigns](./running-campaigns)
