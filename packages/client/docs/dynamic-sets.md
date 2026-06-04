# Dynamic Sets

A dynamic set connects a template to a message. It sits between the two in the email chain:

```
Message
  └── Dynamic Set  ← links message to template
        └── Template  (RCML document)
```

A message can have multiple dynamic sets — one per trigger (tag or segment). Only one active dynamic set per trigger is allowed at a time; activating a second one with the same trigger automatically deactivates the first. A "Default" dynamic set (no trigger) is the fallback sent to subscribers not matched by any trigger-specific variant.

## Creating a dynamic set

Provide the message ID and, optionally, the template ID to link immediately. Omit `trigger` to create a "Default" dynamic set.

```typescript
const ds = await client.dynamicSets.create({
  messageId,
  templateId,
});
```

*→ [`CreateDynamicSetPayload`](/api/client/src/interfaces/CreateDynamicSetPayload)*

## Listing dynamic sets

Retrieve all dynamic sets for a message — both active and inactive, across all triggers.

```typescript
const sets = await client.dynamicSets.listDynamicSets(messageId);
const active = sets.filter((ds) => ds.active);
```

## Updating a dynamic set

Use `update()` to swap in a different template, change the trigger, or adjust any override (subject, sender, etc.).

```typescript
// Swap in a different template
await client.dynamicSets.update(dynamicSetId, { templateId: newTemplateId });

// Change the trigger
await client.dynamicSets.update(dynamicSetId, {
  trigger: { type: 'TAG', id: tagId },
});

// Override the subject for a specific audience
await client.dynamicSets.update(dynamicSetId, {
  subject: 'Special offer for VIP subscribers',
});
```

*→ [`UpdateDynamicSetPayload`](/api/client/src/interfaces/UpdateDynamicSetPayload)*

## Fetching a dynamic set

Retrieve a single dynamic set by ID. Returns `null` if the dynamic set does not exist.

```typescript
const ds = await client.dynamicSets.get(dynamicSetId);
if (ds) {
  console.log(ds.templateId, ds.active, ds.trigger);
}
```

## Deleting a dynamic set

Deleting a dynamic set breaks the link between the message and the template. The template itself is not deleted and can be reused. See [Email Templates](./email-templates) for template management.

```typescript
await client.dynamicSets.delete(dynamicSetId);
```

## Next steps

- Create the message: [Email Messages](./email-messages)
- Create the template: [Email Templates](./email-templates)
- Attach to a campaign and schedule it: [Running Campaigns](./running-campaigns)
- Attach to an automation: [Setting Up Automations](./setting-up-automations)
