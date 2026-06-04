# Email Templates

A template holds the email body written in [RCML](/packages/rcml/). Templates are reusable — you can swap one into a different dynamic set without recreating the message.

## Creating a template

The template must reference the message it belongs to:

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

## Previewing output

`templates.render()` returns the HTML output of a template, optionally with a specific subscriber's merge tag values substituted in:

```typescript
// Render without subscriber context (merge tags shown as placeholders)
const html = await client.templates.render(templateId);

// Render with a subscriber's actual data
const html = await client.templates.render(templateId, { subscriber_id: 42 });
```

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

## Next steps

- Link the template to a message: [Dynamic Sets](./dynamic-sets)
- Build RCML templates: [@rulecom/rcml documentation](/packages/rcml/)
