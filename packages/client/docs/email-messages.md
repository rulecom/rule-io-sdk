# Email Messages

A message holds the subject line and sender settings for an email. Every email sent by Rule.io — whether via a campaign or an automation — goes through the same three-layer structure:

```
Dispatcher (campaign or automation)
  └── Message  (subject, sender info)
        └── Dynamic Set
              └── Template  (the RCML email body)
```

The message belongs to a dispatcher and is shared across both dispatchers. You create it the same way regardless of whether the dispatcher is a campaign or an automation.

## Creating a message

Use the dispatcher-specific method — it sets the dispatcher reference and email type automatically:

```typescript
// For a campaign
const message = await client.messages.createEmailCampaignMessage(campaignId, {
  subject: 'Your order is on its way',
  fromName: 'Jane from Acme',
  fromEmail: 'jane@acme.com',
});

// For an automation
const message = await client.messages.createEmailAutomationMessage(automationId, {
  subject: 'Welcome to Acme!',
  fromName: 'Jane from Acme',
  fromEmail: 'jane@acme.com',
  // Optional: control when the automation fires
  automailSetting: { active: true, delayInSeconds: '0' },
});

const messageId = message.id!;
```

*→ [`CreateEmailCampaignMessagePayload`](/api/client/src/interfaces/CreateEmailCampaignMessagePayload) · [`CreateEmailAutomationMessagePayload`](/api/client/src/interfaces/CreateEmailAutomationMessagePayload)*

Once you have a message, create a template and link them with a dynamic set to complete the chain:

- [Email Templates](./email-templates) — create the RCML email body
- [Dynamic Sets](./dynamic-sets) — link the template to the message

## Managing messages

```typescript
// List messages for a campaign
const campaignMessages = await client.messages.listCampaignMessages(campaignId);

// List messages for an automation
const automationMessages = await client.messages.listAutomationMessages(automationId);

// Fetch a single message
const message = await client.messages.get(messageId);

// Update a campaign message
await client.messages.updateEmailCampaignMessage(messageId, { subject: 'New subject line', fromName: 'Bob' });

// Update an automation message (can also change automail delivery settings)
await client.messages.updateEmailAutomationMessage(messageId, {
  subject: 'Updated welcome',
  automailSetting: { active: true, delayInSeconds: '3600' },
});

// Delete
await client.messages.delete(messageId);
```

## Next steps

- Create the email body: [Email Templates](./email-templates)
- Link template to message: [Dynamic Sets](./dynamic-sets)
- Attach to a campaign and schedule it: [Running Campaigns](./running-campaigns)
- Attach to an automation: [Setting Up Automations](./setting-up-automations)
