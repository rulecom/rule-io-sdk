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

Once you have an automation ID, attach a message and template using the automation-specific method:

```typescript
const message = await client.messages.createEmailAutomationMessage(automationId, {
  subject: 'Welcome to Acme!',
});

const template = await client.templates.createEmailTemplate({
  name: 'Welcome template',
  content: rcml,
});

await client.dynamicSets.create({
  message_id: message.id!,
  template_id: template.id,
});
```

See [Email Messages](./email-messages) for the full walkthrough.

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

Use one of the dedicated automation methods when you assign a trigger tag:

```typescript
// Fire once — safe to repeat, no-op if already triggered
await client.subscribers.triggerTagAutomation({ email: 'jane@example.com' }, 'welcome');

// Always start a new pass (pending messages from any in-progress pass remain scheduled)
await client.subscribers.forceTagAutomation({ email: 'jane@example.com' }, 'welcome');

// Cancel pending messages and restart from the beginning
await client.subscribers.resetTagAutomation({ email: 'jane@example.com' }, 'welcome');
```

To add the tag silently without triggering any automation, use `addSubscriberTag()`.

For a full breakdown of each mode's behaviour — including what happens when an automation is already in progress — see [Triggering Tag Automations](./tag-automation-modes).

## Next steps

- Control automation firing in detail: [Triggering Tag Automations](./tag-automation-modes)
- Build the email body: [Email Messages](./email-messages)
- Assign trigger tags to subscribers: [Organizing with Tags](./organizing-with-tags)
- Send a one-off blast instead: [Running Campaigns](./running-campaigns)
