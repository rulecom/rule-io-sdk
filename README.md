# Rule.io SDK

A TypeScript SDK for the [Rule.io](https://rule.io) email marketing API. Build and manage email automations, subscribers, and RCML templates programmatically.

## Features

- **Full API Coverage** — v2 + v3 Subscriber API and v3 API (81 methods)
- **Type Safety** — Complete TypeScript types for all endpoints
- **RCML Builder** — Build email templates with a fluent API
- **Pre-built Templates** — Hospitality and e-commerce email templates
- **Security** — Built-in XSS protection for user content in templates
- **Zero Dependencies** — No external runtime dependencies

## Installation

```bash
npm install rule-io-sdk
```

### Installing from GitHub

If the package isn't published to npm yet, install directly from GitHub:

```bash
npm install github:rulecom/rule-io-sdk
```

The `prepare` script will automatically build the TypeScript source on install.

## Getting Your API Key

1. Log in to [Rule.io](https://app.rule.io)
2. Go to **Settings → API** (or navigate to `https://app.rule.io/settings/api`)
3. Copy your API key

Store it securely — never commit it to source control:

```bash
# .env (add to .gitignore)
RULE_IO_API_KEY=your-api-key-here
```

## Quick Start

```typescript
import { RuleClient } from 'rule-io-sdk';

// Create a client with your API key
const client = new RuleClient({ apiKey: process.env.RULE_IO_API_KEY! });

// Create a subscriber
await client.createSubscriberV3({
  email: 'customer@example.com',
  status: 'ACTIVE',
});

// Add tags and trigger automations
await client.addSubscriberTagsV3('customer@example.com', {
  tags: ['order-confirmed', 'new-customer'],
  automation: 'force',
});
```

## Client Configuration

```typescript
// Simple — just the API key
const client = new RuleClient('your-api-key');

// With options
const client = new RuleClient({
  apiKey: process.env.RULE_IO_API_KEY,
  baseUrlV2: 'https://app.rule.io/api/v2', // default
  baseUrlV3: 'https://app.rule.io/api/v3', // default
  debug: false, // set true to log requests
});
```

The client checks that an API key is provided on construction and throws `RuleConfigError` if it's missing. If the key is invalid, API calls will throw `RuleApiError` with status 401.

---

## API Reference

### Subscribers (v3 — recommended)

```typescript
// Create a subscriber
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

// Delete subscriber (supports email, phone_number, id, custom_identifier)
await client.deleteSubscriberV3('customer@example.com', 'email');

// Block/unblock subscribers in bulk (async)
await client.blockSubscribers([{ email: 'spam@example.com' }, { id: 12345 }]);
await client.unblockSubscribers([{ email: 'restored@example.com' }]);

// Bulk tag operations (async)
await client.bulkAddTags({
  subscribers: [{ email: 'a@example.com' }, { email: 'b@example.com' }],
  tags: ['campaign-2024'],
});
await client.bulkRemoveTags({
  subscribers: [{ email: 'a@example.com' }],
  tags: ['old-tag'],
});

// Get subscriber (v2 — no v3 equivalent)
const subscriber = await client.getSubscriber('customer@example.com');

// Get subscriber tags (v2 — no v3 equivalent)
const tags = await client.getSubscriberTags('customer@example.com');

// Get subscriber custom fields (v2 — no v3 equivalent)
const fields = await client.getSubscriberFields('customer@example.com');
```

### Subscribers (v2 — deprecated)

```typescript
// These methods still work but v3 equivalents are preferred
await client.syncSubscriber({ email: 'customer@example.com', fields: { FirstName: 'Anna' }, tags: ['order-confirmed'] });
await client.addSubscriberTags('customer@example.com', ['vip'], 'force');
await client.removeSubscriberTags('customer@example.com', ['temporary-tag']);
await client.deleteSubscriber('customer@example.com');
```

### Campaigns

Create and manage one-off email campaigns:

```typescript
// List campaigns
const campaigns = await client.listCampaigns({ page: 1, per_page: 20 });

// Create a campaign
const campaign = await client.createCampaign({
  message_type: 1, // 1 = email, 2 = text_message
  sendout_type: 1, // 1 = marketing, 2 = transactional
  tags: [{ id: 42, negative: false }],
});

// Get, update, delete
const existing = await client.getCampaign(123);
await client.updateCampaign(123, {
  name: 'Spring Sale',
  sendout_type: 1,
  tags: [{ id: 42, negative: false }],
  segments: [],
  subscribers: [],
});
await client.deleteCampaign(123);

// Duplicate a campaign
await client.copyCampaign(123);

// Schedule, send immediately, or cancel
await client.scheduleCampaign(123, { type: 'now' });
await client.scheduleCampaign(123, { type: 'schedule', datetime: '2024-06-01 09:00:00' });
await client.scheduleCampaign(123, { type: null }); // cancel
```

### Suppressions

Suppress or unsuppress subscribers from receiving marketing emails:

```typescript
// Suppress subscribers (async, max 1000 per request)
await client.createSuppressions({
  subscribers: [
    { email: 'unsubscribed@example.com' },
    { id: 12345 },
  ],
  message_types: ['email'], // optional — omit to suppress all channels
});

// Remove suppressions
await client.deleteSuppressions({
  subscribers: [{ email: 'resubscribed@example.com' }],
});
```

### Editor Resources

Low-level CRUD for the v3 editor API. These are the building blocks used by `createCampaignEmail()` and `createAutomationEmail()`.

#### Automations (Automation Workflows)

```typescript
const automations = await client.listAutomations({ page: 1, active: true });
const automation = await client.createAutomation({ name: 'Welcome Series' });
const fetched = await client.getAutomation(automation.data!.id!);
await client.updateAutomation(automation.data!.id!, {
  name: 'Welcome Series',
  active: true,
  trigger: { type: 'TAG', id: 42 }, // type must be UPPERCASE
  sendout_type: 2,                   // 1 = marketing, 2 = transactional
});
await client.deleteAutomation(automation.data!.id!);
```

#### Messages

```typescript
const messages = await client.listMessages({ id: 123, dispatcher_type: 'automail' });
const message = await client.createMessage({
  dispatcher: { id: 123, type: 'automail' },
  type: 1, // 1 = email
  subject: 'Welcome!',
});
const fetched = await client.getMessage(message.data!.id!);
await client.updateMessage(message.data!.id!, { subject: 'Updated' });
await client.deleteMessage(message.data!.id!);
```

#### Templates

```typescript
const templates = await client.listTemplates({ page: 1, per_page: 10 });
const template = await client.createTemplate({
  message_id: 456,
  name: `My Template ${Date.now()}`, // names must be unique
  message_type: 'email',
  template: rcmlDocument,            // RCMLDocument object
});
const fetchedTpl = await client.getTemplate(template.data!.id!);
await client.updateTemplate(template.data!.id!, {
  message_id: 456,
  name: template.data!.name,
  message_type: 'email',
  template: template.data!.content,
});
await client.deleteTemplate(template.data!.id!);

// Render a template to HTML (with optional merge-tag substitution)
const html = await client.renderTemplate(789, { subscriber_id: 12345 });
```

#### Dynamic Sets

Connect messages to templates:

```typescript
const sets = await client.listDynamicSets({ message_id: 456 });
const ds = await client.createDynamicSet({ message_id: 456, template_id: 789 });
const fetchedDs = await client.getDynamicSet(ds.data!.id!);
await client.updateDynamicSet(ds.data!.id!, { message_id: 456, template_id: 790 });
await client.deleteDynamicSet(ds.data!.id!);
```

### Brand Styles

Manage brand styles for consistent email theming:

```typescript
// List all brand styles
const styles = await client.listBrandStyles();

// Get a specific brand style
const style = await client.getBrandStyle(123);

// Create from a domain (auto-detects colors, fonts, logo)
const fromDomain = await client.createBrandStyleFromDomain({ domain: 'example.com' });

// Create manually
const manual = await client.createBrandStyleManually({
  name: 'My Brand',
  colours: [{ type: 'accent', hex: '#0066CC', brightness: 50 }],
  fonts: [{ type: 'title', name: 'Helvetica', origin: 'system' }],
});

// Update (partial update via PATCH)
await client.updateBrandStyle(123, { name: 'Updated Brand' });

// Delete (fails if it's the last brand style)
await client.deleteBrandStyle(123);
```

### API Keys

Manage API keys for the account:

```typescript
const keys = await client.listApiKeys();
const newKey = await client.createApiKey({ name: 'Production' });
await client.updateApiKey(newKey.data!.id!, { name: 'Production v2' });
await client.deleteApiKey(newKey.data!.id!);
```

### Analytics

Retrieve dispatcher statistics (opens, clicks, bounces, etc.):

```typescript
const stats = await client.getAnalytics({
  date_from: '2024-01-01',
  date_to: '2024-01-31',
  object_type: 'CAMPAIGN',
  object_ids: ['123', '456'],
  metrics: ['open', 'click', 'sent', 'hard_bounce'],
});
```

### Export (Enterprise)

Export dispatchers, statistics, and subscribers for a date range:

```typescript
// Export dispatchers (max 1-day range)
const dispatchers = await client.exportDispatchers({
  date_from: '2024-01-01',
  date_to: '2024-01-01',
});

// Export statistics (with token-based pagination)
let stats = await client.exportStatistics({
  date_from: '2024-01-01',
  date_to: '2024-01-01',
  statistic_types: ['open', 'link'],
});
while (stats.next_page_token) {
  stats = await client.exportStatistics({
    date_from: '2024-01-01',
    date_to: '2024-01-01',
    next_page_token: stats.next_page_token,
  });
}

// Export subscribers
const subscribers = await client.exportSubscribers({
  date_from: '2024-01-01',
  date_to: '2024-01-01',
});
```

### Recipients

List segments, subscribers, and tags available for recipient targeting:

```typescript
const segments = await client.listSegments({ page: 1, per_page: 50 });
const subscribers = await client.listRecipientSubscribers({ page: 1 });
const tags = await client.listRecipientTags({ page: 1 });
```

### Accounts (Super Admin)

Manage accounts (requires Super Admin privileges):

```typescript
const accounts = await client.listAccounts();
const account = await client.createAccount({ name: 'New Client', language: 'en' });
const detail = await client.getAccount(account.data!.id, {
  includes: ['sitoo_credentials'],
});
await client.deleteAccount(account.data!.id); // async, destructive
```

### Tags (v2)

```typescript
// Get all tags
const allTags = await client.getTags();

// Look up a tag's numeric ID by name
const tagId = await client.getTagIdByName('order-confirmed');
```

### Custom Field Data (Deprecated)

> **Note:** The Custom Field Data API is deprecated by Rule.io. Use subscriber fields instead.

```typescript
// The subscriber's numeric ID (from createSubscriberV3 or other lookup)
const subscriberId = 12345;

// CRUD for custom field data
const data = await client.getCustomFieldData(subscriberId);
await client.createCustomFieldData(subscriberId, {
  groups: [{
    group: 'Order',
    create_if_not_exists: true,
    values: [{ field: 'OrderRef', create_if_not_exists: true, value: 'ORD-123' }],
  }],
});
await client.updateCustomFieldData(subscriberId, {
  identifier: { group: 'Order', field: 'OrderRef', value: 'ORD-123' },
  values: [{ field: 'Status', value: 'shipped' }],
});

// Query by group or search
const grouped = await client.getCustomFieldDataByGroup(subscriberId, 'Order');
const found = await client.searchCustomFieldData(subscriberId, {
  group: 'Order', field: 'OrderRef', value: 'ORD-123',
});
await client.deleteCustomFieldDataByGroup(subscriberId, 'Order');
```

---

## Campaign Emails

Create complete campaign emails with the high-level helper:

```typescript
// Easiest: auto-build editor-compatible template from a brand style
const result = await client.createCampaignEmail({
  name: 'Spring Sale',
  subject: 'Spring deals are here!',
  brandStyleId: 12345,
  tags: [{ id: 1, negative: false }],
});
console.log('Created:', result.campaignId, result.messageId, result.templateId);
```

```typescript
// Or provide a full RCML template
const result = await client.createCampaignEmail({
  name: 'Spring Sale',
  subject: 'Spring deals are here!',
  template: myRCMLDocument,
  segments: [{ id: 42, negative: false }],
});
```

The helper handles the full 4-step process (campaign → message → template → dynamic set) and cleans up on failure.

### Return Value

```typescript
interface CreateCampaignEmailResult {
  campaignId: number;
  messageId: number;
  templateId: number;
  dynamicSetId: number;
}
```

---

## Automation Workflows

Create complete email automations triggered by tags using the high-level helper:

```typescript
// Easiest: auto-build editor-compatible template from a brand style
const result = await client.createAutomationEmail({
  name: 'Order Confirmation',
  triggerType: 'tag',
  triggerValue: 'order-confirmed',
  subject: 'Your order is confirmed!',
  brandStyleId: 12345,
});
console.log('Created:', result.automationId, result.messageId, result.templateId);
```

```typescript
// Or provide a full RCML template
const result = await client.createAutomationEmail({
  name: 'Order Confirmation',
  triggerType: 'tag',
  triggerValue: 'order-confirmed',
  subject: 'Your order is confirmed!',
  template: email, // any RCMLDocument
});
```

The high-level `createAutomationEmail` helper handles the full 4-step process (automation → message → template → dynamic set) and cleans up on failure.

### Brand Style Templates

Both `createCampaignEmail` and `createAutomationEmail` accept a `brandStyleId` option. When provided (without `template`), the SDK:

1. Fetches the brand style from the Rule.io API
2. Builds an editor-compatible RCML template with logo, social links, default content, and footer
3. The resulting template is fully editable in the Rule.io visual editor

You can also pass custom `sections` to replace the default placeholder content:

```typescript
const result = await client.createAutomationEmail({
  name: 'Welcome',
  triggerType: 'tag',
  triggerValue: 'new-subscriber',
  subject: 'Welcome aboard!',
  brandStyleId: 12345,
  sections: [myCustomSection], // replaces default placeholder content
});
```

### Prerequisites

**Trigger tags must exist before creating automations.** The SDK looks up the tag ID by name via `getTagIdByName()`. If the tag doesn't exist on the account, automation creation will fail with a 404 error.

Create tags beforehand using the v2 API:

```typescript
// Create tags via the v2 REST API directly
const apiKey = process.env.RULE_IO_API_KEY!;
await fetch('https://app.rule.io/api/v2/tags', {
  method: 'POST',
  headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ tags: ['order-confirmed', 'shipping-update'] }),
});
```

### Return Value

```typescript
interface CreateAutomationEmailResult {
  automationId: number;
  messageId: number;
  templateId: number;
  dynamicSetId: number;
}
```

---

## Email Templates

### Low-Level: RCML Element Builders

Build templates element by element:

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

### Mid-Level: Brand Template System

Use Rule.io brand styles with placeholder merge fields:

```typescript
import {
  createBrandTemplate,
  createBrandLogo,
  createBrandHeading,
  createBrandText,
  createBrandButton,
  createContentSection,
  createFooterSection,
  createPlaceholder,
  createTextNode,
  createDocWithPlaceholders,
} from 'rule-io-sdk';
import type { BrandStyleConfig, CustomFieldMap } from 'rule-io-sdk';

// Your brand style from Rule.io (Settings → Brand)
const myBrand: BrandStyleConfig = {
  brandStyleId: '12345',
  logoUrl: 'https://example.com/logo.png',
  buttonColor: '#0066CC',
  bodyBackgroundColor: '#f3f3f3',
  sectionBackgroundColor: '#ffffff',
  brandColor: '#f6f8f9',
  headingFont: "'Helvetica Neue', sans-serif",
  headingFontUrl: 'https://app.rule.io/brand-style/12345/font/1/css',
  bodyFont: "'Arial', sans-serif",
  bodyFontUrl: 'https://app.rule.io/brand-style/12345/font/2/css',
  textColor: '#1A1A1A',
};

// Custom field IDs from Rule.io (GET /api/v2/customizations)
const myFields: CustomFieldMap = {
  'Order.CustomerName': 169233,
  'Order.OrderRef': 169234,
};
```

#### BrandStyleConfig Reference

All fields are **required** unless noted as optional. Optional URL fields, if provided and non-empty, must be valid `http://` or `https://` URLs — invalid URLs will throw `RuleConfigError`.

| Field | Type | Description |
|---|---|---|
| `brandStyleId` | `string` | Brand style ID from Rule.io |
| `logoUrl` | `string?` | Logo image URL (optional — some brand styles have no logo) |
| `buttonColor` | `string` | CTA button background color (hex) |
| `bodyBackgroundColor` | `string` | Email body background color (hex) |
| `sectionBackgroundColor` | `string` | Content section background color (hex) |
| `brandColor` | `string` | Accent/brand color used for detail sections (hex) |
| `headingFont` | `string` | Heading font family CSS value |
| `headingFontUrl` | `string?` | Heading font CSS URL (optional — system fonts have no URL) |
| `bodyFont` | `string` | Body font family CSS value |
| `bodyFontUrl` | `string?` | Body font CSS URL (optional — system fonts have no URL) |
| `textColor` | `string` | Default text color (hex) |
| `socialLinks` | `Array<{ name, href }>?` | Social media links (optional) |

> **Tip:** You usually don't need to build `BrandStyleConfig` manually. Use `brandStyleId` with `createCampaignEmail()` or `createAutomationEmail()` and the SDK builds it automatically via `toBrandStyleConfig()`.

**Automatic mapping from the brand style API response:**

```typescript
import { toBrandStyleConfig } from 'rule-io-sdk';

// Fetch a brand style and convert to BrandStyleConfig
const response = await client.getBrandStyle(12345);
const brandStyle = toBrandStyleConfig(response.data!);
```

`toBrandStyleConfig` extracts colours, fonts, images, and social links from the full `RuleBrandStyle` object. This is what `createCampaignEmail` and `createAutomationEmail` use internally when you pass `brandStyleId`.

#### CustomFieldMap and Validation

Template builders validate that every `fieldNames` entry has a corresponding key in `customFields`. If a field name is referenced but missing from the map, a `RuleConfigError` is thrown.

```typescript
// Custom field IDs are account-specific — look them up via GET /api/v2/customizations
const myFields: CustomFieldMap = {
  'Order.CustomerName': 169233,
  'Order.OrderRef': 169234,
  'Order.Total': 169235,
};

// For new accounts where fields don't exist yet, use 0 as a placeholder ID.
// The templates will be created but merge fields won't resolve until real IDs are set.
const placeholderFields: CustomFieldMap = {
  'Order.CustomerName': 0,
  'Order.OrderRef': 0,
  'Order.Total': 0,
};
```

```typescript
const template = createBrandTemplate({
  brandStyle: myBrand,
  preheader: 'Your order is confirmed!',
  sections: [
    createBrandLogo(myBrand.logoUrl),
    createContentSection([
      createBrandHeading(createDocWithPlaceholders([
        createTextNode('Thank you, '),
        createPlaceholder('Order.CustomerName', myFields['Order.CustomerName']),
        createTextNode('!'),
      ])),
    ]),
    createFooterSection(),
  ],
});
```

### High-Level: Pre-Built Templates

Ready-to-use templates for common use cases:

#### Hospitality (Hotels, Restaurants)

```typescript
import { createReservationConfirmationEmail } from 'rule-io-sdk';

const email = createReservationConfirmationEmail({
  brandStyle: myBrand,
  customFields: myFields,
  websiteUrl: 'https://example.com',
  text: {
    preheader: 'Thank you for your reservation!',
    greeting: 'Hello',
    intro: 'We look forward to welcoming you.',
    detailsHeading: 'Reservation Details',
    referenceLabel: 'Reference',
    serviceLabel: 'Service',
    checkInLabel: 'Check-in',
    checkOutLabel: 'Check-out',
    guestsLabel: 'Guests',
    ctaButton: 'View Reservation',
  },
  fieldNames: {
    firstName: 'Booking.FirstName',
    bookingRef: 'Booking.BookingRef',
    serviceType: 'Booking.ServiceType',
    checkInDate: 'Booking.CheckInDate',
    checkOutDate: 'Booking.CheckOutDate',
    totalGuests: 'Booking.TotalGuests',
  },
});
```

Also available: `createReservationCancellationEmail`, `createReservationReminderEmail`, `createFeedbackRequestEmail`, `createReservationRequestEmail`.

#### E-Commerce (Online Stores)

All e-commerce templates require `brandStyle`, `customFields`, `text`, and `fieldNames`. The `text` and `fieldNames` objects have **no defaults** — all fields listed below as required must be provided.

##### `createOrderConfirmationEmail`

```typescript
import { createOrderConfirmationEmail } from 'rule-io-sdk';

const email = createOrderConfirmationEmail({
  brandStyle: myBrand,
  customFields: myFields,
  websiteUrl: 'https://myshop.com',      // Used for CTA button link
  footer: { /* optional FooterConfig */ },
  text: {
    preheader: 'Your order has been confirmed!',  // required
    greeting: 'Hi',                                // required
    intro: 'Thank you for your order.',            // required
    detailsHeading: 'Order Summary',               // required
    orderRefLabel: 'Order',                        // required
    totalLabel: 'Total',                           // required
    itemsLabel: 'Items',                           // optional
    shippingLabel: 'Ships to',                     // optional
    ctaButton: 'View Order',                       // required
  },
  fieldNames: {
    firstName: 'Order.CustomerName',    // required
    orderRef: 'Order.OrderRef',         // required
    totalPrice: 'Order.Total',          // required
    items: 'Order.Items',              // optional (needs itemsLabel)
    shippingAddress: 'Order.Address',  // optional (needs shippingLabel)
  },
});
```

##### `createShippingUpdateEmail`

```typescript
import { createShippingUpdateEmail } from 'rule-io-sdk';

const email = createShippingUpdateEmail({
  brandStyle: myBrand,
  customFields: myFields,
  trackingUrl: 'https://myshop.com/tracking',  // Used for CTA button link
  text: {
    preheader: 'Your order is on its way!',     // required
    heading: 'Shipping Update',                  // required
    greeting: 'Hi',                              // required
    message: 'Your order has been shipped.',     // required
    orderRefLabel: 'Order',                      // required
    trackingLabel: 'Tracking',                   // optional
    estimatedDeliveryLabel: 'Estimated delivery', // optional
    ctaButton: 'Track Package',                  // required
  },
  fieldNames: {
    firstName: 'Order.CustomerName',         // required
    orderRef: 'Order.OrderRef',              // required
    trackingNumber: 'Order.TrackingNumber',  // optional (needs trackingLabel)
    estimatedDelivery: 'Order.EstDelivery',  // optional (needs estimatedDeliveryLabel)
  },
});
```

##### `createAbandonedCartEmail`

```typescript
import { createAbandonedCartEmail } from 'rule-io-sdk';

const email = createAbandonedCartEmail({
  brandStyle: myBrand,
  customFields: myFields,
  cartUrl: 'https://myshop.com/cart',  // Used for CTA button link
  text: {
    preheader: 'Your cart is waiting for you',   // required
    greeting: 'Hi',                               // required
    message: 'You left some items in your cart.', // required
    reminder: 'Complete your purchase!',           // required
    ctaButton: 'Return to Cart',                  // required
  },
  fieldNames: {
    firstName: 'Order.CustomerName',  // required
  },
});
```

##### `createOrderCancellationEmail`

```typescript
import { createOrderCancellationEmail } from 'rule-io-sdk';

const email = createOrderCancellationEmail({
  brandStyle: myBrand,
  customFields: myFields,
  websiteUrl: 'https://myshop.com',  // Used for CTA button link
  text: {
    preheader: 'Your order has been cancelled',  // required
    heading: 'Order Cancelled',                   // required
    greeting: 'Hi',                               // required
    message: 'Your order has been cancelled.',    // required
    orderRefLabel: 'Order',                       // required
    followUp: 'Contact us with any questions.',   // required
    ctaButton: 'Visit Store',                     // required
  },
  fieldNames: {
    firstName: 'Order.CustomerName',  // required
    orderRef: 'Order.OrderRef',       // required
  },
});
```

---

## Tags

The SDK provides suggested tag names for common scenarios:

```typescript
import { RuleTags } from 'rule-io-sdk';

// E-commerce lifecycle
RuleTags.ORDER_STARTED      // 'order-started'
RuleTags.ORDER_CONFIRMED     // 'order-confirmed'
RuleTags.ORDER_CANCELLED     // 'order-cancelled'
RuleTags.CART_ABANDONED      // 'cart-abandoned'
RuleTags.SHIPPING_UPDATE     // 'shipping-update'

// Hospitality
RuleTags.ACCOMMODATION       // 'accommodation'
RuleTags.RESTAURANT          // 'restaurant'
RuleTags.EXPERIENCE          // 'experience'

// Customer segmentation
RuleTags.NEW_CUSTOMER        // 'new-customer'
RuleTags.RETURNING_CUSTOMER  // 'returning-customer'
```

These are suggestions — you can use any string as a tag.

## Error Handling

```typescript
import { RuleApiError, RuleConfigError } from 'rule-io-sdk';

try {
  await client.createSubscriberV3({ email: 'user@example.com' });
} catch (error) {
  if (error instanceof RuleApiError) {
    if (error.statusCode === 401) {
      console.error('Invalid API key');
    } else if (error.statusCode === 429) {
      console.error('Rate limited — retry later');
    }
  }
}
```

## Security

All user-provided content rendered in templates is automatically escaped by the pre-built templates. If you build custom templates, use the security utilities:

```typescript
import { escapeHtml, sanitizeUrl } from 'rule-io-sdk';

const safeName = escapeHtml(userInput);          // Prevents XSS
const safeUrl = sanitizeUrl(userProvidedUrl);     // Blocks javascript: URLs
```

## Development

```bash
npm install
npm run build        # Build with tsup (CJS + ESM)
npm run test         # Run tests with Vitest
npm run type-check   # TypeScript strict mode
```

## API Documentation

The Rule.io v3 API spec is available at the [OpenAPI endpoint](https://app.rule.io/redoc/api-v3.json).

## License

MIT
