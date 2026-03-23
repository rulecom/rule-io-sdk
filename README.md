# Rule.io SDK

A TypeScript SDK for the [Rule.io](https://rule.io) email marketing API. Build and manage email automations, subscribers, and RCML templates programmatically.

## Features

- **Full API Coverage** — v2 Subscriber API and v3 Editor API
- **Type Safety** — Complete TypeScript types for all endpoints
- **RCML Builder** — Build email templates with a fluent API
- **Pre-built Templates** — Hospitality and e-commerce email templates
- **Security** — Built-in XSS protection for user content in templates
- **Zero Dependencies** — No external runtime dependencies

## Installation

```bash
npm install rule-io-sdk
```

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
import { RuleClient, RuleTags } from 'rule-io-sdk';

// Create a client with your API key
const client = new RuleClient({ apiKey: process.env.RULE_IO_API_KEY! });

// Sync a subscriber with tags and custom fields
await client.syncSubscriber({
  email: 'customer@example.com',
  fields: {
    FirstName: 'Anna',
    OrderRef: 'ORD-456',
  },
  tags: [RuleTags.ORDER_CONFIRMED, RuleTags.NEW_CUSTOMER],
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

The client validates the API key on construction and throws `RuleConfigError` if it's missing. If the key is invalid, API calls will throw `RuleApiError` with status 401.

## Subscriber Management (v2 API)

```typescript
// Create or update subscriber
await client.syncSubscriber({
  email: 'customer@example.com',
  fields: { FirstName: 'Anna' },
  tags: ['order-confirmed'],
});

// Add tags (and trigger automations)
await client.addSubscriberTags('customer@example.com', ['vip'], 'force');

// Remove tags
await client.removeSubscriberTags('customer@example.com', ['temporary-tag']);

// Get subscriber
const subscriber = await client.getSubscriber('customer@example.com');

// Get subscriber tags
const tags = await client.getSubscriberTags('customer@example.com');

// Get subscriber custom fields
const fields = await client.getSubscriberFields('customer@example.com');

// Delete subscriber
await client.deleteSubscriber('customer@example.com');
```

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

```typescript
import { createOrderConfirmationEmail } from 'rule-io-sdk';

const email = createOrderConfirmationEmail({
  brandStyle: myBrand,
  customFields: myFields,
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

Also available: `createShippingUpdateEmail`, `createAbandonedCartEmail`, `createOrderCancellationEmail`.

## Automation Workflows (v3 API)

Create complete email automations triggered by tags:

```typescript
const result = await client.createAutomationEmail({
  name: 'Order Confirmation',
  triggerType: 'tag',
  triggerValue: 'order-confirmed',
  subject: 'Your order is confirmed!',
  template: email, // any RCMLDocument
});

console.log('Created:', result.automailId, result.messageId, result.templateId);
```

The high-level `createAutomationEmail` helper handles the full 4-step process (automail → message → template → dynamic set) and cleans up on failure.

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
  await client.syncSubscriber({ ... });
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

## License

MIT
