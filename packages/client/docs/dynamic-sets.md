# Dynamic Sets

A dynamic set links a template to a message, completing the email chain. Once all three layers — message, dynamic set, and template — are in place, the campaign or automation is ready to send.

## Creating a dynamic set

```typescript
const ds = await client.dynamicSets.create({
  message_id: messageId,
  template_id: templateId,
});
```

*→ [`RuleDynamicSetCreateRequest`](/api/client/src/interfaces/RuleDynamicSetCreateRequest)*

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

- Create the message: [Email Messages](./email-messages)
- Create the template: [Email Templates](./email-templates)
- Attach to a campaign and schedule it: [Running Campaigns](./running-campaigns)
- Attach to an automation: [Setting Up Automations](./setting-up-automations)
