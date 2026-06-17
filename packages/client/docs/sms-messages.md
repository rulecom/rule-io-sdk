# SMS Messages

A message holds the SMS body text and optional UTM tracking parameters for an SMS. It sits between a dispatcher and a template in the SMS chain:

```
Dispatcher (campaign or automation)
  └── Message  (SMS body, UTM)
        └── Dynamic Set
              └── Template  (RCML SMS body)
```

Each dispatcher has its own message. Once you have a message ID, create a template and connect them with a dynamic set to complete the chain. See [SMS Templates](./sms-templates) and [Dynamic Sets](./dynamic-sets).

## SMS message fields

An SMS message has fewer fields than its email counterpart. There is no
`fromName`, no `fromEmail`, no `preheader` — the platform's configured sender
number is used for delivery, and the only content the message itself carries
is the body text plus optional UTM tracking and (for automations) automail
delivery settings.

| Field | Description |
|-------|-------------|
| `subject` | The SMS body text. The field name reads as "subject" for wire-format consistency with email; in SMS it is the entire message body. |
| `utmCampaign` | UTM campaign parameter appended to tracked links. |
| `utmTerm` | UTM term parameter appended to tracked links. |
| `automailSetting` | Automation-only. Controls active state and send delay. |

## Creating a campaign message

Use `createSmsCampaignMessage()` to create a message attached to an SMS campaign. Provide at minimum the SMS body in the `subject` field.

```typescript
const message = await client.messages.createSmsCampaignMessage(campaignId, {
  subject: 'Your order is on its way! Track it at https://acme.com/orders',
});
const messageId = message.id!;
```

*→ [`CreateSmsCampaignMessagePayload`](/api/client/src/interfaces/CreateSmsCampaignMessagePayload)*

## Creating an automation message

Use `createSmsAutomationMessage()` to create a message attached to an SMS automation. You can also configure when the automation fires via `automailSetting`.

```typescript
const message = await client.messages.createSmsAutomationMessage(automationId, {
  subject: 'Welcome to Acme! Reply STOP to opt out.',
  // Optional: control when the automation fires
  automailSetting: { active: true, delayInSeconds: '0' },
});
const messageId = message.id!;
```

Pass `delayInSeconds: '3600'` to delay the send by one hour after the trigger fires. Pass `active: false` to create the message in a paused state.

*→ [`CreateSmsAutomationMessagePayload`](/api/client/src/interfaces/CreateSmsAutomationMessagePayload)*

## Fetching a message

Use `get()` to retrieve a single message by ID. Returns `null` if the message does not exist.

```typescript
const message = await client.messages.get(messageId);

if (!message) {
  console.log('Message not found');
} else {
  console.log(message.subject);     // the SMS body
  console.log(message.dispatcher);   // { id, type }
}
```

## Updating a campaign message

Use `updateSmsCampaignMessage()` to change the SMS body or UTM parameters. Pass only the fields you want to change — omitted fields are left as-is.

```typescript
// Change the SMS body
await client.messages.updateSmsCampaignMessage(messageId, {
  subject: 'Update: your order has shipped!',
});

// Update UTM tracking
await client.messages.updateSmsCampaignMessage(messageId, {
  utmCampaign: 'spring-sale',
  utmTerm: 'sms-promo',
});
```

*→ [`UpdateSmsCampaignMessagePayload`](/api/client/src/interfaces/UpdateSmsCampaignMessagePayload)*

## Updating an automation message

Use `updateSmsAutomationMessage()` to change the SMS body, UTM, or delivery settings. Automation messages additionally support changing the `automailSetting` to adjust the active state or send delay.

```typescript
// Update body copy
await client.messages.updateSmsAutomationMessage(messageId, {
  subject: 'Welcome — updated copy',
});

// Change the send delay to 1 hour
await client.messages.updateSmsAutomationMessage(messageId, {
  automailSetting: { active: true, delayInSeconds: '3600' },
});

// Pause the automation without deleting it
await client.messages.updateSmsAutomationMessage(messageId, {
  automailSetting: { active: false, delayInSeconds: '0' },
});
```

*→ [`UpdateSmsAutomationMessagePayload`](/api/client/src/interfaces/UpdateSmsAutomationMessagePayload)*

## Listing messages

Retrieve all messages for a campaign or automation. A dispatcher typically has one message, but the API supports multiple (e.g. for A/B variants).

```typescript
const campaignMessages = await client.messages.listCampaignMessages(campaignId);
const automationMessages = await client.messages.listAutomationMessages(automationId);
```

## Deleting a message

Deleting a message also removes the dynamic sets linked to it, which breaks the connection to any templates. The templates themselves are not deleted. See [Dynamic Sets](./dynamic-sets) for details.

```typescript
await client.messages.delete(messageId);
```

## Next steps

- Create the SMS body: [SMS Templates](./sms-templates)
- Link template to message: [Dynamic Sets](./dynamic-sets)
- Attach to a campaign and schedule it: [SMS Campaigns](./sms-campaigns)
- Attach to an automation: [SMS Automations](./sms-automations)
