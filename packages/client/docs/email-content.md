# Building Email Content

Every email in Rule.io — whether sent by a campaign or an automation — is built from three connected objects:

```
Dispatcher (campaign or automation)
  └── Message  (subject, sender info)
        └── Dynamic Set
              └── Template  (the RCML email body)
```

This guide walks through creating each layer.

## Step 1: Create a message

A message belongs to a dispatcher (a campaign or an automation) and holds the subject line and sender settings:

```typescript
const message = await client.messages.create({
  dispatcher: {
    id: campaignId,          // or automationId
    type: 'campaign',        // or 'automail' for automations
  },
  type: 1,                   // 1 = email
  subject: 'Your order is on its way',
  from_name: 'Jane from Acme',
  from_email: 'jane@acme.com',
});
const messageId = message.data!.id!;
```

*→ [`RuleMessageCreateRequest`](/api/client/src/interfaces/RuleMessageCreateRequest)*

## Step 2: Create a template

A template holds the email body written in [RCML](/packages/rcml/). The template must reference the message it belongs to:

```typescript
import { buildRcmlDocument } from '@rulecom/rcml';

const rcml = buildRcmlDocument({ /* ... your template ... */ });

const template = await client.templates.create({
  message_id: messageId,
  name: 'Order shipped — v1',
  message_type: 'email',
  template: rcml,
});
const templateId = template.data!.id!;
```

See the [@rulecom/rcml documentation](/packages/rcml/) for how to build the RCML document.

*→ [`RuleTemplateCreateRequest`](/api/client/src/interfaces/RuleTemplateCreateRequest)*

## Step 3: Connect the template to the message

A dynamic set links a template to a message, completing the chain:

```typescript
const ds = await client.dynamicSets.create({
  message_id: messageId,
  template_id: templateId,
});
```

Once all three layers are in place, the campaign or automation is ready to send.

*→ [`RuleDynamicSetCreateRequest`](/api/client/src/interfaces/RuleDynamicSetCreateRequest)*

## Previewing a rendered template

`templates.render()` returns the HTML output of a template, optionally with a specific subscriber's merge tag values substituted in:

```typescript
// Render without subscriber context (merge tags shown as placeholders)
const html = await client.templates.render(templateId);

// Render with a subscriber's actual data
const html = await client.templates.render(templateId, { subscriber_id: 42 });
```

This is useful for checking the visual output before sending.

## Managing templates

```typescript
// List all templates (paginated)
const templates = await client.templates.list({ page: 1, per_page: 20 });

// Fetch a single template
const template = await client.templates.get(templateId);

// Update template content
await client.templates.update(templateId, {
  message_id: messageId,
  name: 'Order shipped — v2',
  message_type: 'email',
  template: updatedRcml,
});

// Delete a template
await client.templates.delete(templateId);
```

## Managing messages

```typescript
// List messages for a campaign
const messages = await client.messages.list({
  id: campaignId,
  dispatcher_type: 'campaign',
});

// Fetch a single message
const message = await client.messages.get(messageId);

// Update subject
await client.messages.update(messageId, { subject: 'New subject line' });

// Delete
await client.messages.delete(messageId);
```

## Managing dynamic sets

```typescript
// List dynamic sets for a message
const sets = await client.dynamicSets.list({ message_id: messageId });

// Swap in a different template (e.g. for A/B testing variants)
await client.dynamicSets.update(dynamicSetId, {
  message_id: messageId,
  template_id: newTemplateId,
});

await client.dynamicSets.delete(dynamicSetId);
```

## Next steps

- Learn to build RCML templates: [@rulecom/rcml documentation](/packages/rcml/)
- Attach content to a campaign and schedule it: [Running Campaigns](./running-campaigns)
- Attach content to an automation: [Setting Up Automations](./setting-up-automations)
