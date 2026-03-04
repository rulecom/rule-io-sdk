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

### Installing from GitHub

If the package isn't published to npm yet, install directly from GitHub:

```bash
npm install github:swesam/rule-io-sdk
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
```

#### BrandStyleConfig Reference

All fields are **required**. URL fields (`logoUrl`, `headingFontUrl`, `bodyFontUrl`) must be valid `http://` or `https://` URLs — empty strings or invalid URLs will throw `RuleConfigError`.

| Field | Type | Description |
|---|---|---|
| `brandStyleId` | `string` | Brand style ID from Rule.io |
| `logoUrl` | `string` | Logo image URL (must be valid http/https) |
| `buttonColor` | `string` | CTA button background color (hex) |
| `bodyBackgroundColor` | `string` | Email body background color (hex) |
| `sectionBackgroundColor` | `string` | Content section background color (hex) |
| `brandColor` | `string` | Accent/brand color used for detail sections (hex) |
| `headingFont` | `string` | Heading font family CSS value |
| `headingFontUrl` | `string` | Heading font CSS URL (must be valid http/https) |
| `bodyFont` | `string` | Body font family CSS value |
| `bodyFontUrl` | `string` | Body font CSS URL (must be valid http/https) |
| `textColor` | `string` | Default text color (hex) |

**Mapping from the `/brand-styles/from-domain` API response:**

```typescript
const brandStyle: BrandStyleConfig = {
  brandStyleId: String(apiResponse.data.id),
  logoUrl: apiResponse.data.images[0],
  buttonColor: apiResponse.data.colours[0],
  brandColor: apiResponse.data.colours[0],
  bodyBackgroundColor: apiResponse.data.colours[1] ?? '#f3f3f3',
  sectionBackgroundColor: '#ffffff',
  headingFont: apiResponse.data.fonts[0],
  headingFontUrl: apiResponse.data.font_urls[0],
  bodyFont: apiResponse.data.fonts[0],
  bodyFontUrl: apiResponse.data.font_urls[1] ?? apiResponse.data.font_urls[0],
  textColor: apiResponse.data.text_color ?? '#1A1A1A',
};
```

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

const template = createBrandTemplate({
  brandStyle: myBrand,
  preheader: 'Your order is confirmed!',
  sections: [
    createBrandLogo(),
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

### Prerequisites

**Trigger tags must exist before creating automations.** The SDK looks up the tag ID by name via `getTagIdByName()`. If the tag doesn't exist on the account, automation creation will fail with a 404 error.

Create tags beforehand using the v2 API:

```typescript
// Create tags via the v2 REST API directly
await fetch(`${baseUrlV2}/tags`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ tags: ['order-confirmed', 'shipping-update'] }),
});
```

### Return Value

```typescript
interface CreateAutomationEmailResult {
  automailId: number;
  messageId: number;
  templateId: number;
  dynamicSetId: number;
}
```

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
