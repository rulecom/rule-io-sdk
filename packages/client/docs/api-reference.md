# Direct API Reference

Beyond the high-level helpers, the SDK provides direct access to all Rule.io API endpoints through `RuleClient`. Each method is fully typed — see the exported types for request/response shapes.

> This page covers the low-level methods. For the high-level helpers see [Sending Emails](/packages/sdk/sending-emails), [Building Templates](/packages/rcml/), and [Managing Subscribers](./subscribers).

## Campaigns

```typescript
const campaigns = await client.listCampaigns({ page: 1, per_page: 20 });
const campaign = await client.createCampaign({
  message_type: 1,
  sendout_type: 1,
  tags: [{ id: 42, negative: false }],
});
const campaignId = campaign.data!.id!;
await client.updateCampaign(campaignId, {
  name: 'Spring Sale',
  sendout_type: 1,
  tags: [],
  segments: [],
  subscribers: [],
});
await client.scheduleCampaign(campaignId, { type: 'now' });
await client.deleteCampaign(campaignId);
```

Also: `getCampaign`, `copyCampaign`, scheduled sends (`type: 'schedule'`), cancellation (`type: null`).

## Automations

```typescript
const automations = await client.listAutomations({ page: 1, active: true });
const automation = await client.createAutomation({ name: 'Welcome Series' });
const automationId = automation.data!.id!;
await client.updateAutomation(automationId, {
  name: 'Welcome Series',
  active: true,
  trigger: { type: 'TAG', id: 42 },
  sendout_type: 2,
});
await client.deleteAutomation(automationId);
```

Also: `getAutomation`.

## Messages

```typescript
const messages = await client.listMessages({
  id: automationId,
  dispatcher_type: 'automail',
});
const message = await client.createMessage({
  dispatcher: { id: automationId, type: 'automail' },
  type: 1,
  subject: 'Welcome!',
});
const messageId = message.data!.id!;
await client.updateMessage(messageId, { subject: 'Updated' });
await client.deleteMessage(messageId);
```

Also: `getMessage`.

## Templates

```typescript
import { createRCMLDocument, createCenteredSection, createText } from '@rulecom/sdk';

const rcmlDocument = createRCMLDocument({
  sections: [createCenteredSection({ children: [createText('Hello!')] })],
});
const template = await client.createTemplate({
  message_id: messageId,
  name: `My Template ${Date.now()}`,
  message_type: 'email',
  template: rcmlDocument,
});
const templateId = template.data!.id!;
await client.updateTemplate(templateId, { message_id: messageId, name: 'Updated', message_type: 'email', template: rcmlDocument });
const html = await client.renderTemplate(templateId, { subscriber_id: 12345 });
await client.deleteTemplate(templateId);
```

Also: `getTemplate`, `listTemplates`.

## Dynamic Sets

Connect messages to templates:

```typescript
const sets = await client.listDynamicSets({ message_id: messageId });
const ds = await client.createDynamicSet({ message_id: messageId, template_id: templateId });
const dynamicSetId = ds.data!.id!;
await client.updateDynamicSet(dynamicSetId, { message_id: messageId, template_id: templateId });
await client.deleteDynamicSet(dynamicSetId);
```

Also: `getDynamicSet`.

## Suppressions

```typescript
await client.createSuppressions({
  subscribers: [{ email: 'unsubscribed@example.com' }],
  message_types: ['email'],
});
await client.deleteSuppressions({
  subscribers: [{ email: 'resubscribed@example.com' }],
});
```

## Analytics

```typescript
const stats = await client.getAnalytics({
  date_from: '2024-01-01',
  date_to: '2024-01-31',
  object_type: 'CAMPAIGN',
  object_ids: ['123'],
  metrics: ['open', 'click', 'sent', 'hard_bounce'],
});
```

## Export (Enterprise)

```typescript
const dispatchers = await client.exportDispatchers({
  date_from: '2024-01-01',
  date_to: '2024-01-01',
});
const stats = await client.exportStatistics({
  date_from: '2024-01-01',
  date_to: '2024-01-01',
  statistic_types: ['open'],
});
const subscribers = await client.exportSubscribers({
  date_from: '2024-01-01',
  date_to: '2024-01-01',
});
```

Export statistics supports token-based pagination via `next_page_token`.

## Recipients

```typescript
const segments = await client.listSegments({ page: 1, per_page: 50 });
const subscribers = await client.listRecipientSubscribers({ page: 1 });
const tags = await client.listRecipientTags({ page: 1 });
```

## Brand Styles

See [Brand Styles](./brand-styles) for the full guide. Low-level CRUD:

```typescript
const styles = await client.listBrandStyles();
const fromDomain = await client.createBrandStyleFromDomain({ domain: 'example.com' });
const brandStyleId = fromDomain.data!.id!;
const style = await client.getBrandStyle(brandStyleId);
const manual = await client.createBrandStyleManually({
  name: 'My Brand',
  colours: [{ type: 'accent', hex: '#0066CC', brightness: 50 }],
  fonts: [{ type: 'title', name: 'Helvetica', origin: 'system' }],
});
await client.updateBrandStyle(brandStyleId, { name: 'Updated Brand' });
await client.deleteBrandStyle(brandStyleId);
```

## API Keys

```typescript
const keys = await client.listApiKeys();
const newKey = await client.createApiKey({ name: 'Production' });
const keyId = newKey.data!.id!;
await client.updateApiKey(keyId, { name: 'Production v2' });
await client.deleteApiKey(keyId);
```

## Tags (v2)

```typescript
const allTags = await client.getTags();
const tagId = await client.getTagIdByName('order-confirmed');
```

## Accounts (Super Admin)

```typescript
const accounts = await client.listAccounts();
const account = await client.createAccount({ name: 'New Client', language: 'en' });
const detail = await client.getAccount(account.data!.id!, { includes: ['sitoo_credentials'] });
await client.deleteAccount(account.data!.id!);
```

## Custom Field Data (deprecated)

> The Custom Field Data API is deprecated by Rule.io. Use subscriber fields instead.

```typescript
const subscriberId = 12345;
const data = await client.getCustomFieldData(subscriberId);
await client.createCustomFieldData(subscriberId, {
  groups: [{
    group: 'Order',
    create_if_not_exists: true,
    values: [{ field: 'OrderRef', create_if_not_exists: true, value: 'ORD-123' }],
  }],
});
```

Also: `updateCustomFieldData`, `getCustomFieldDataByGroup`, `searchCustomFieldData`, `deleteCustomFieldDataByGroup`.
