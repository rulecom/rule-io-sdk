# Rule.io SDK

A TypeScript SDK for the Rule.io email marketing API.

## Features

- **Full API Coverage** - v2 Subscriber API and v3 Editor API
- **Type Safety** - Complete TypeScript types for all endpoints
- **RCML Builder** - Fluent API for building email templates
- **Pre-built Templates** - Ready-to-use booking email templates
- **Security** - Built-in XSS protection for user content
- **Zero Dependencies** - No external runtime dependencies

## Installation

```bash
npm install rule-io-sdk
```

## Quick Start

```typescript
import { RuleClient, RuleTags, createBookingConfirmationTemplate } from 'rule-io-sdk';

// Create a client
const client = new RuleClient({ apiKey: 'your-api-key' });

// Sync a subscriber with tags and custom fields
await client.syncSubscriber({
  email: 'guest@example.com',
  fields: {
    FirstName: 'Anna',
    LastName: 'Svensson',
    BookingRef: 'BV-123',
  },
  tags: [RuleTags.BOOKING_CONFIRMED, RuleTags.ACCOMMODATION],
});
```

## API Reference

### RuleClient

The main client for interacting with Rule.io APIs.

#### Constructor

```typescript
// Simple (string API key)
const client = new RuleClient('your-api-key');

// With options
const client = new RuleClient({
  apiKey: 'your-api-key',
  baseUrlV2: 'https://app.rule.io/api/v2', // Optional
  baseUrlV3: 'https://app.rule.io/api/v3', // Optional
  debug: false, // Enable debug logging
});
```

#### Subscriber Methods (v2 API)

```typescript
// Create or update subscriber
await client.syncSubscriber({
  email: 'guest@example.com',
  fields: { FirstName: 'Anna' },
  tags: ['booking-confirmed'],
});

// Add tags (with automation trigger)
await client.addSubscriberTags('guest@example.com', ['vip'], 'force');

// Remove tags
await client.removeSubscriberTags('guest@example.com', ['temporary-tag']);

// Get subscriber
const subscriber = await client.getSubscriber('guest@example.com');

// Get subscriber tags
const tags = await client.getSubscriberTags('guest@example.com');

// Get subscriber custom fields
const fields = await client.getSubscriberFields('guest@example.com');

// Delete subscriber
await client.deleteSubscriber('guest@example.com');
```

#### Automation Methods (v3 API)

```typescript
// Create automail (automation workflow)
const automail = await client.createAutomail({
  name: 'Booking Confirmation',
  trigger_type: 'tag',
  trigger_value: 'booking-confirmed',
});

// Create message
const message = await client.createMessage({
  dispatcher: { id: automailId, type: 'automail' },
  type: 1, // email
  subject: 'Your booking is confirmed!',
});

// Create template
const template = await client.createTemplate({
  message_id: messageId,
  name: 'Confirmation Template',
  message_type: 'email',
  template: rcmlDocument,
});

// Create dynamic set (connects message and template)
await client.createDynamicSet({
  message_id: messageId,
  template_id: templateId,
});

// Or use the high-level helper
const result = await client.createAutomationEmail({
  name: 'Booking Confirmation',
  triggerType: 'tag',
  triggerValue: 'booking-confirmed',
  subject: 'Your booking is confirmed!',
  template: rcmlDocument,
});
```

### RCML Template Builders

Build email templates programmatically.

```typescript
import {
  createRCMLDocument,
  createCenteredSection,
  createHeading,
  createText,
  createButton,
  createLogo,
  createDivider,
} from 'rule-io-sdk';

const template = createRCMLDocument({
  preheader: 'Thank you for your booking!',
  // Define your brand styles directly (no brandStyleId needed!)
  styles: {
    logoUrl: 'https://example.com/logo.png',
    primaryColor: '#2D5016', // Headings, buttons
    accentColor: '#D4AF37', // Links, dividers
    backgroundColor: '#FDF5E6', // Details sections
  },
  sections: [
    // Header - logo is loaded from styles.logoUrl
    createCenteredSection({
      backgroundColor: '#FFFFFF',
      padding: '30px 0',
      children: [createLogo()],
    }),

    // Content
    createCenteredSection({
      children: [
        createHeading('Welcome, Anna!'),
        createText('Your booking has been confirmed.'),
        createDivider(),
        createButton('View Booking', 'https://example.com/booking/123'),
      ],
    }),
  ],
});
```

**Note**: The `brandStyleId` parameter is deprecated. Brand style IDs are only for Rule.io's internal editor reference and don't actually apply styling. Use the `styles` object to define your colors and logo directly.

### Pre-built Templates

```typescript
import { createBookingConfirmationTemplate } from 'rule-io-sdk';

const template = createBookingConfirmationTemplate({
  guestName: 'Anna',
  bookingRef: 'BV-123',
  serviceName: 'Hotellpaket',
  serviceType: 'accommodation',
  checkInDate: '15 mars 2026',
  checkOutDate: '17 mars 2026',
  totalGuests: 2,
  totalPrice: '4 500 kr',
  websiteUrl: 'https://blackstavingard.se',
  logoUrl: 'https://...',
  contactEmail: 'info@blackstavingard.se',
  contactPhone: '+46 123 456 789',
  text: {
    preheader: 'Tack för din bokning! Ref: {ref}',
    heading: 'Tack för din bokning, {name}!',
    intro: 'Vi har tagit emot din bokning.',
    detailsHeading: 'Bokningsdetaljer',
    labels: {
      bookingRef: 'Bokningsreferens',
      service: 'Tjänst',
      room: 'Rum',
      checkIn: 'Incheckning',
      checkOut: 'Utcheckning',
      dateTime: 'Datum & tid',
      date: 'Datum',
      guests: 'Antal gäster',
      totalPrice: 'Totalt',
      requests: 'Särskilda önskemål',
    },
    viewBookingButton: 'Se bokning',
    questionsHeading: 'Frågor?',
    contactText: 'Kontakta oss på {email} eller ring {phone}',
    footer: 'Blacksta Vingård. Alla rättigheter förbehållna.',
  },
});
```

### Security Utilities

```typescript
import { escapeHtml, sanitizeUrl } from 'rule-io-sdk';

// Escape user input for XSS protection
const safeName = escapeHtml(userInput);

// Validate URLs (blocks javascript: and data: URLs)
const safeUrl = sanitizeUrl(userProvidedUrl);
```

### Automation Configurations

Pre-configured automation definitions for booking systems:

```typescript
import {
  BOOKING_AUTOMATIONS,
  TAG_AUTOMATION_MAP,
  getAutomationById,
  getAutomationByTrigger,
  type AutomationConfig,
  type TemplateConfig,
} from 'rule-io-sdk';

// List all automations
for (const automation of BOOKING_AUTOMATIONS) {
  console.log(`${automation.name} → ${automation.triggerTag}`);
}

// Get automation by ID
const confirmation = getAutomationById('booking-confirmation');

// Get automation by trigger tag
const reminder = getAutomationByTrigger('booking-reminder');

// Tag to email mapping
console.log(TAG_AUTOMATION_MAP);
// {
//   'booking-confirmed': 'Bokningsbekräftelse',
//   'booking-cancelled': 'Avbokning',
//   ...
// }

// Build template with config
const templateConfig: TemplateConfig = {
  websiteUrl: 'https://example.com',
  contactEmail: 'info@example.com',
  contactPhone: '+46 123 456',
  logoUrl: 'https://example.com/logo.png',
  venueName: 'My Venue',
  primaryColor: '#2D5016',
  accentColor: '#D4AF37',
  backgroundColor: '#FDF5E6',
};

const template = confirmation.templateBuilder(templateConfig);
```

### Constants

```typescript
import { RuleTags, DefaultBrandColors } from 'rule-io-sdk';

// Pre-defined tags
RuleTags.BOOKING_CONFIRMED; // 'booking-confirmed'
RuleTags.BOOKING_CANCELLED; // 'booking-cancelled'
RuleTags.ACCOMMODATION; // 'accommodation'
RuleTags.NEW_GUEST; // 'new-guest'
// ... etc

// Default brand colors
DefaultBrandColors.primary; // '#2D5016'
DefaultBrandColors.secondary; // '#8B4513'
DefaultBrandColors.accent; // '#D4AF37'
// ... etc
```

## Error Handling

```typescript
import { RuleApiError } from 'rule-io-sdk';

try {
  await client.syncSubscriber({ ... });
} catch (error) {
  if (error instanceof RuleApiError) {
    if (error.isRateLimited()) {
      // Handle rate limiting
    }
    if (error.isAuthError()) {
      // Handle invalid API key
    }
    if (error.isNotFound()) {
      // Handle 404
    }
    console.error(`Rule.io error: ${error.message} (${error.statusCode})`);
  }
}
```

## TypeScript Types

All types are exported for use in your application:

```typescript
import type {
  RuleSubscriber,
  RuleSubscriberFields,
  RCMLDocument,
  RCMLSection,
  BookingConfirmationTemplateConfig,
  // ... etc
} from 'rule-io-sdk';
```

## API Quirks

The SDK handles several Rule.io API quirks:

1. **Tags placement** - Tags go at top level for sync, inside body for add
2. **Field prefixing** - Fields are auto-prefixed with `Booking.`
3. **Singular endpoint** - `/subscriber/{id}/fields` (not `/subscribers/`)
4. **v3 charset** - Content-Type includes `charset=utf-8`

See [API v3 Proposal](../../docs/rule-io-api-v3-proposal.md) for details.

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build

# Type check
npm run type-check
```

## License

MIT
