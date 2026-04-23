# Rule.io SDK

A TypeScript SDK for the [Rule.io](https://rule.io) email marketing API. Build and send email campaigns, set up tag-triggered automations, manage subscribers, and create RCML templates — all from code.

**Zero runtime dependencies** | **Full TypeScript types** | **Node.js >= 18**

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Brand Styles](#brand-styles)
- [Sending Emails](#sending-emails)
- [Building Custom Templates](#building-custom-templates)
- [Vendor Presets](#vendor-presets)
- [Managing Subscribers](#managing-subscribers)
- [API Reference](#api-reference)
- [Error Handling](#error-handling)
- [Security](#security)
- [Development](#development)

## Installation

```bash
npm install rule-io-sdk
```

## Quick Start

```typescript
import { RuleClient } from 'rule-io-sdk';

const client = new RuleClient({ apiKey: process.env.RULE_API_KEY! });

// Create a subscriber
await client.createSubscriberV3({
  email: 'customer@example.com',
  status: 'ACTIVE',
});

// Add tags to trigger automations
await client.addSubscriberTagsV3('customer@example.com', {
  tags: ['order-confirmed', 'new-customer'],
  automation: 'force',
});
```

Get your API key from [Rule.io Settings → API](https://app.rule.io/settings/api). Store it in an environment variable — never commit it to source control.

### Client Options

```typescript
// Simple — just the API key
const client = new RuleClient('your-api-key');
```

```typescript
// With options
const client = new RuleClient({
  apiKey: process.env.RULE_API_KEY!,
  baseUrlV2: 'https://app.rule.io/api/v2', // default
  baseUrlV3: 'https://app.rule.io/api/v3', // default
  debug: false, // set true to log requests
});
```

Throws `RuleConfigError` if the API key is missing, or `RuleApiError` with status 401 if the key is invalid.

---

## Brand Styles

Brand styles define the visual identity of your emails — logo, colors, fonts, and social links. When using the high-level helpers with `brandStyleId`, the SDK auto-builds a branded template for you. If you provide your own `template` instead, a brand style isn't required.

```typescript
// Easiest: auto-detect from your domain
const fromDomain = await client.createBrandStyleFromDomain({ domain: 'example.com' });
const brandStyleId = fromDomain.data!.id!;

// Or create manually
const manualBrand = await client.createBrandStyleManually({
  name: 'My Brand',
  colours: [{ type: 'accent', hex: '#0066CC', brightness: 50 }],
  fonts: [{ type: 'title', name: 'Helvetica', origin: 'system' }],
});

// List existing brand styles
const styles = await client.listBrandStyles();
```

You can also manage brand styles in the Rule.io UI under **Settings → Brand**.

When building templates, convert a brand style API response into the `BrandStyleConfig` used by template builders:

```typescript
import { toBrandStyleConfig } from 'rule-io-sdk';
import type { CustomFieldMap } from 'rule-io-sdk';

// Convert a fetched brand style for use with template builders
const response = await client.getBrandStyle(brandStyleId);
if (!response?.data) throw new Error('Brand style not found');
const myBrand = toBrandStyleConfig(response.data);

// Map your Rule.io custom field IDs (from GET /api/v2/customizations)
const myFields: CustomFieldMap = {
  'Order.CustomerName': 169233,
  'Order.OrderRef': 169234,
  'Order.Total': 169235,
};
```

The examples below use `myBrand` and `myFields` as defined here.

---

## Sending Emails

The SDK provides two high-level helpers that handle the full creation flow (campaign/automation → message → template → dynamic set) in a single call, with automatic cleanup on failure.

### Campaign Emails (one-off sends)

```typescript
const result = await client.createCampaignEmail({
  name: 'Spring Sale',
  subject: 'Spring deals are here!',
  brandStyleId,
  tags: [{ id: 1, negative: false }],
});

console.log(result.campaignId, result.templateId);
```

### Automation Emails (tag-triggered)

```typescript
const result = await client.createAutomationEmail({
  name: 'Order Confirmation',
  triggerType: 'tag',
  triggerValue: 'order-confirmed',
  subject: 'Your order is confirmed!',
  brandStyleId,
});

console.log(result.automationId, result.templateId);
```

Both helpers accept either `brandStyleId` (auto-builds a branded template) or `template` (your own `RCMLDocument`). You can also pass custom `sections` to replace the default placeholder content when using `brandStyleId`.

> **Note:** Trigger tags must exist before creating automations. The SDK looks up the tag ID by name via `getTagIdByName()`. Create tags first using the v2 API if they don't exist on the account.

---

## Building Custom Templates

The SDK offers three levels of template building, from highest to lowest abstraction.

### Pre-Built Templates

Ready-to-use templates for common use cases. All require consumer-provided configuration (brand style, text, field mappings). Some optional labels (e.g., line-item labels, footer link text) have English defaults — provide them explicitly for full localization control.

**Hospitality:** `createReservationConfirmationEmail`, `createReservationCancellationEmail`, `createReservationReminderEmail`, `createFeedbackRequestEmail`, `createReservationRequestEmail`

**E-commerce:** `createOrderConfirmationEmail`, `createShippingUpdateEmail`, `createAbandonedCartEmail`, `createOrderCancellationEmail`

```typescript
import { createOrderConfirmationEmail } from 'rule-io-sdk';

const email = createOrderConfirmationEmail({
  brandStyle: myBrand,        // BrandStyleConfig (see Brand Styles above)
  customFields: myFields,     // CustomFieldMap (see Brand Styles above)
  websiteUrl: 'https://myshop.com',
  text: {
    preheader: 'Your order has been confirmed!',
    greeting: 'Hi',
    intro: 'Thank you for your order.',
    detailsHeading: 'Order Summary',
    orderRefLabel: 'Order',
    totalLabel: 'Total',
    ctaButton: 'View Order',
  },
  fieldNames: {
    firstName: 'Order.CustomerName',
    orderRef: 'Order.OrderRef',
    totalPrice: 'Order.Total',
  },
});
```

> **Tip:** You usually don't need to build `BrandStyleConfig` manually. Use `toBrandStyleConfig()` to convert a brand style API response, or just pass `brandStyleId` to the high-level helpers.

### Brand Templates

Build custom branded templates with merge-field placeholders:

```typescript
import {
  createBrandTemplate,
  createBrandLogo,
  createBrandHeading,
  createBrandButton,
  createContentSection,
  createFooterSection,
  createPlaceholder,
  createTextNode,
  createDocWithPlaceholders,
} from 'rule-io-sdk';

const template = createBrandTemplate({
  brandStyle: myBrand,
  preheader: 'Your order is confirmed!',
  sections: [
    createBrandLogo('https://example.com/logo.png'),
    createContentSection([
      createBrandHeading(createDocWithPlaceholders([
        createTextNode('Thank you, '),
        createPlaceholder('Order.CustomerName', myFields['Order.CustomerName']),
        createTextNode('!'),
      ])),
      createBrandButton(
        createDocWithPlaceholders([createTextNode('View Order')]),
        'https://example.com/orders'
      ),
    ]),
    createFooterSection(),
  ],
});
```

Brand templates also support **loops** for repeating content (e.g., order line items) via `createBrandLoop` and `createLoopFieldPlaceholder`.

### RCML Elements (low-level)

Build templates element by element for full control:

```typescript
import {
  createRCMLDocument,
  createCenteredSection,
  createHeading,
  createText,
  createButton,
  createLogo,
} from 'rule-io-sdk';

const template = createRCMLDocument({
  preheader: 'Your order is confirmed!',
  styles: {
    logoUrl: 'https://example.com/logo.png',
    primaryColor: '#333333',
    accentColor: '#0066CC',
    backgroundColor: '#F5F5F5',
  },
  sections: [
    createCenteredSection({
      backgroundColor: '#FFFFFF',
      padding: '30px 0',
      children: [createLogo()],
    }),
    createCenteredSection({
      children: [
        createHeading('Thank you, Anna!'),
        createText('Your order ORD-456 has been confirmed.'),
        createButton('View Order', 'https://example.com/orders/456'),
      ],
    }),
  ],
});
```

Additional RCML elements: `createImage`, `createVideo`, `createSpacer`, `createDivider`, `createSocial`/`createSocialElement`, `createLoop`, `createSwitch`/`createCase` (conditional content), `createTwoColumnSection`.

---

## Vendor Presets

Pre-configured integrations that bundle field names, tags, and automation flows for specific platforms.

### Shopify

```typescript
import { shopifyPreset, SHOPIFY_FIELDS } from 'rule-io-sdk';

const config = {
  brandStyle: myBrand,
  customFields: {
    [SHOPIFY_FIELDS.firstName]: 169233,
    [SHOPIFY_FIELDS.orderNumber]: 169234,
    [SHOPIFY_FIELDS.totalPrice]: 169235,
    // ... map all fields to your Rule.io numeric IDs
  },
  websiteUrl: 'https://myshop.com',
};

shopifyPreset.validateConfig(config); // throws if required fields are missing
const automations = shopifyPreset.getAutomations(config);
const single = shopifyPreset.getAutomation('shopify-order-confirmation', config);
```

### Bookzen (Hospitality)

```typescript
import { bookzenPreset, BOOKZEN_FIELDS } from 'rule-io-sdk';

const config = {
  brandStyle: myBrand,
  customFields: {
    [BOOKZEN_FIELDS.guestFirstName]: 100001,
    [BOOKZEN_FIELDS.bookingRef]: 100002,
    // ... map all fields
  },
  websiteUrl: 'https://myhotel.com',
};

const automations = bookzenPreset.getAutomations(config);
```

### Samfora (Donation)

Swedish charitable-giving preset. Default email copy ships in Swedish.
Three donation-confirmation variants are gated by donor-lifecycle tags
(`donor-first-gift`, `donor-second-gift`, `donor-returning`) so first-time,
second-time, and loyal donors see different wording.

Samfora uses Rule.io's standard Subscriber fields (`Subscriber.FirstName`,
`Subscriber.LastName`, `Subscriber.Address1`, etc.) rather than creating
new custom ones — those fields already exist on every account. Per-donation
data lives on a historical `Donation.*` group.

```typescript
import { samforaPreset, SAMFORA_FIELDS } from 'rule-io-sdk';

const config = {
  brandStyle: myBrand,
  customFields: {
    // Required: standard Subscriber field for the greeting
    [SAMFORA_FIELDS.donorFirstName]: 47736,
    // Required: historical Donation.* group
    [SAMFORA_FIELDS.donationAmount]: 200002,
    [SAMFORA_FIELDS.donationDate]: 200003,
    [SAMFORA_FIELDS.donationRef]: 200004,
    [SAMFORA_FIELDS.causeName]: 200005,
    [SAMFORA_FIELDS.totalLifetimeAmount]: 200006,
    [SAMFORA_FIELDS.taxYear]: 200007,
    [SAMFORA_FIELDS.taxDeductibleAmount]: 200008,
    // Optional Subscriber extensions (not referenced by built-in
    // templates but available for consumer extensions):
    // donorLastName, donorAddress1, donorAddress2, donorZipcode,
    // donorCity, donorCountry, donorPhone, donorSource
    // Optional Donation extras: donationCurrency, donationType
  },
  websiteUrl: 'https://samfora.org',
};

const automations = samforaPreset.getAutomations(config);
```

Each preset provides `getAutomations()`, `getAutomation(id, config)`, `validateConfig()`, and `getRequiredFields()`.

---

## Managing Subscribers

### v3 API (recommended)

```typescript
// Create
await client.createSubscriberV3({
  email: 'customer@example.com',
  status: 'ACTIVE',
  language: 'en',
});

// Add tags (with automation trigger)
await client.addSubscriberTagsV3('customer@example.com', {
  tags: ['vip', 'returning'],
  automation: 'force', // 'send' | 'force' | 'reset' | null
});

// Remove a tag
await client.removeSubscriberTagV3('customer@example.com', 'temporary-tag');

// Delete (supports email, phone_number, id, custom_identifier)
await client.deleteSubscriberV3('customer@example.com', 'email');

// Bulk operations
await client.blockSubscribers([{ email: 'spam@example.com' }]);
await client.unblockSubscribers([{ email: 'restored@example.com' }]);
await client.bulkAddTags({
  subscribers: [{ email: 'a@example.com' }, { email: 'b@example.com' }],
  tags: ['campaign-2024'],
});
await client.bulkRemoveTags({
  subscribers: [{ email: 'a@example.com' }],
  tags: ['old-tag'],
});
```

### v2 API (legacy)

```typescript
// These still work but v3 equivalents are preferred
const subscriber = await client.getSubscriber('customer@example.com');
const tags = await client.getSubscriberTags('customer@example.com');
const fields = await client.getSubscriberFields('customer@example.com');
await client.syncSubscriber({ email: 'customer@example.com', fields: { FirstName: 'Anna' }, tags: ['vip'] });
```

---

## API Reference

Beyond the high-level helpers, the SDK provides direct access to all Rule.io API endpoints. Each method is fully typed — see the exported types for request/response shapes.

### Campaigns

```typescript
const campaigns = await client.listCampaigns({ page: 1, per_page: 20 });
const campaign = await client.createCampaign({ message_type: 1, sendout_type: 1, tags: [{ id: 42, negative: false }] });
const campaignId = campaign.data!.id!;
await client.updateCampaign(campaignId, { name: 'Spring Sale', sendout_type: 1, tags: [], segments: [], subscribers: [] });
await client.scheduleCampaign(campaignId, { type: 'now' });
await client.deleteCampaign(campaignId);
```

Also: `getCampaign`, `copyCampaign`, scheduled sends (`type: 'schedule'`), and cancellation (`type: null`).

### Automations

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

### Messages

```typescript
const messages = await client.listMessages({ id: automationId, dispatcher_type: 'automail' });
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

### Templates

```typescript
import { createRCMLDocument, createCenteredSection, createText } from 'rule-io-sdk';

const rcmlDocument = createRCMLDocument({
  sections: [createCenteredSection({ children: [createText('Hello!')] })],
});
const templates = await client.listTemplates({ page: 1, per_page: 10 });
const template = await client.createTemplate({
  message_id: messageId,
  name: `My Template ${Date.now()}`,
  message_type: 'email',
  template: rcmlDocument,
});
const templateId = template.data!.id!;
await client.updateTemplate(templateId, { message_id: messageId, name: `My Template ${Date.now()}`, message_type: 'email', template: rcmlDocument });
const html = await client.renderTemplate(templateId, { subscriber_id: 12345 });
await client.deleteTemplate(templateId);
```

Also: `getTemplate`.

### Dynamic Sets

Connect messages to templates:

```typescript
const sets = await client.listDynamicSets({ message_id: messageId });
const ds = await client.createDynamicSet({ message_id: messageId, template_id: templateId });
const dynamicSetId = ds.data!.id!;
await client.updateDynamicSet(dynamicSetId, { message_id: messageId, template_id: templateId });
await client.deleteDynamicSet(dynamicSetId);
```

Also: `getDynamicSet`.

### Suppressions

```typescript
await client.createSuppressions({
  subscribers: [{ email: 'unsubscribed@example.com' }],
  message_types: ['email'],
});
await client.deleteSuppressions({
  subscribers: [{ email: 'resubscribed@example.com' }],
});
```

### Analytics

```typescript
const stats = await client.getAnalytics({
  date_from: '2024-01-01',
  date_to: '2024-01-31',
  object_type: 'CAMPAIGN',
  object_ids: ['123'],
  metrics: ['open', 'click', 'sent', 'hard_bounce'],
});
```

### Export (Enterprise)

```typescript
const dispatchers = await client.exportDispatchers({ date_from: '2024-01-01', date_to: '2024-01-01' });
const stats = await client.exportStatistics({ date_from: '2024-01-01', date_to: '2024-01-01', statistic_types: ['open'] });
const subscribers = await client.exportSubscribers({ date_from: '2024-01-01', date_to: '2024-01-01' });
```

Export statistics supports token-based pagination via `next_page_token`.

### Recipients

```typescript
const segments = await client.listSegments({ page: 1, per_page: 50 });
const subscribers = await client.listRecipientSubscribers({ page: 1 });
const tags = await client.listRecipientTags({ page: 1 });
```

### Accounts (Super Admin)

```typescript
const accounts = await client.listAccounts();
const account = await client.createAccount({ name: 'New Client', language: 'en' });
const detail = await client.getAccount(account.data!.id!, { includes: ['sitoo_credentials'] });
await client.deleteAccount(account.data!.id!);
```

### Brand Styles

```typescript
const styles = await client.listBrandStyles();
const fromDomain = await client.createBrandStyleFromDomain({ domain: 'example.com' });
const styleId = fromDomain.data!.id!;
const style = await client.getBrandStyle(styleId);
const manual = await client.createBrandStyleManually({ name: 'My Brand', colours: [/* ... */], fonts: [/* ... */] });
await client.updateBrandStyle(styleId, { name: 'Updated Brand' });
await client.deleteBrandStyle(styleId);
```

### API Keys

```typescript
const keys = await client.listApiKeys();
const newKey = await client.createApiKey({ name: 'Production' });
const keyId = newKey.data!.id!;
await client.updateApiKey(keyId, { name: 'Production v2' });
await client.deleteApiKey(keyId);
```

### Tags (v2)

```typescript
const allTags = await client.getTags();
const tagId = await client.getTagIdByName('order-confirmed');
```

### Custom Field Data (deprecated)

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

---

## Error Handling

```typescript
import { RuleApiError, RuleConfigError } from 'rule-io-sdk';

try {
  await client.createSubscriberV3({ email: 'user@example.com' });
} catch (error) {
  if (error instanceof RuleApiError) {
    console.error(error.statusCode); // 401, 404, 429, etc.
  }
  if (error instanceof RuleConfigError) {
    console.error('Invalid config:', error.message);
  }
}
```

## Security

RCML element builders (`createButton`, `createImage`, `createVideo`) sanitize URL parameters to block `javascript:` and `data:` URIs. Text content is placed into structured ProseMirror nodes (not raw HTML) so it doesn't need escaping.

For custom raw HTML templates outside of RCML:

```typescript
import { escapeHtml, sanitizeUrl } from 'rule-io-sdk';

const safeName = escapeHtml(userInput);       // For raw HTML interpolation
const safeUrl = sanitizeUrl(userProvidedUrl); // Blocks javascript:/data: URLs
```

> **Do NOT** use `escapeHtml()` on text passed to RCML builders like `createText()` or `createHeading()` — these produce structured JSON, not HTML, and pre-escaping will result in double-escaped output.

---

## Development

```bash
npm install
npm run build        # Build with tsup (CJS + ESM)
npm run test         # Run tests with Vitest
npm run type-check   # TypeScript strict mode
npm run dev          # Build in watch mode
npm run test:watch   # Tests in watch mode
```

### RCML Validation Script

Verify that the SDK produces valid templates by creating a campaign with all RCML elements:

```bash
echo "RULE_API_KEY=your-key" > .env
npx tsx scripts/validate-rcml.ts                    # All elements
npx tsx scripts/validate-rcml.ts --sections=1,4,7   # Specific sections
npx tsx scripts/validate-rcml.ts --cleanup           # Clean up
```

### Releasing

1. Update `CHANGELOG.md` with the new version's changes
2. Run `npm version <patch|minor|major>` (runs type-check + tests automatically)
3. Push with tags: `git push && git push --tags`
4. Publish: `npm publish`

### API Documentation

The Rule.io v3 API spec is available at the [OpenAPI endpoint](https://app.rule.io/redoc/api-v3.json).

## License

MIT
