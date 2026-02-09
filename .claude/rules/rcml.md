---
paths:
  - 'src/rcml/**/*.ts'
---

# RCML Template Rules

## 1. XSS Protection Is Mandatory

Every piece of user-provided content MUST be escaped before embedding in RCML:

```typescript
import { escapeHtml, sanitizeUrl } from './utils';

// WRONG - raw user input
createText(`Welcome, ${guestName}!`);

// CORRECT - escaped
createText(`Welcome, ${escapeHtml(guestName)}!`);

// WRONG - raw URL
createButton('Click here', userProvidedUrl);

// CORRECT - sanitized
createButton('Click here', sanitizeUrl(userProvidedUrl));
```

`sanitizeUrl()` blocks `javascript:`, `data:`, and protocol-relative `//` URLs.

## 2. Valid RCML Structure

Every document must have:
1. `head` with `attributes` and at least `preview` text
2. `body` with at least one `section`
3. Each section has at least one `column`
4. Each column has `children` array

## 3. No Hardcoded Content

Templates must be parameterized. No hardcoded:
- Business names or venue names
- Colors (use config parameter)
- URLs (use config parameter)
- Locale-specific text (use config parameter)

```typescript
// WRONG
const heading = createHeading('Thank you for your order!');

// CORRECT
const heading = createHeading(escapeHtml(config.text.heading));
```

## 4. ProseMirror Doc Format

Text content in RCML uses ProseMirror format. Use the helpers:

```typescript
// CORRECT - use builder
const doc = createProseMirrorDoc('Hello world');

// For placeholders
const doc = createDocWithPlaceholders([
  createTextNode('Hello, '),
  createPlaceholder('Order.CustomerName', fieldId),
]);

// WRONG - hand-build ProseMirror JSON
const doc = { type: 'doc', content: [{ type: 'paragraph', ... }] };
```

## 5. Vertical-Agnostic Templates

Templates must work across verticals (hospitality, e-commerce, SaaS, etc.):

```typescript
// WRONG - hardcoded for one vertical
function createBookingDetails(config: BookingConfig) {
  return createText('Check-in: ' + config.checkIn);
}

// CORRECT - generic with vertical-specific variants
function createOrderDetails(config: OrderDetailsConfig) {
  return config.details.map(detail =>
    createText(`${escapeHtml(detail.label)}: ${escapeHtml(detail.value)}`)
  );
}
```

Vertical-specific templates are OK if clearly named:
- `createReservationConfirmationEmail()` — hospitality
- `createOrderConfirmationEmail()` — e-commerce

## 6. Template Input Validation

Template builder functions should validate their input:
- Required fields must be present
- URLs should be valid format
- Colors should be valid hex/CSS format
- Throw `RuleConfigError` for invalid configuration, not silent fallbacks

## 7. Every Required Config Field Must Be Used

If a config type requires a field (`fieldNames.bookingRef`, etc.), the template
**must** render it. Dead config — required but never used — is a bug: it forces
consumers to maintain mappings that do nothing.

When adding a new template, cross-check the equivalent template in other
verticals (e.g., hospitality vs e-commerce) to keep patterns consistent.

## 8. Template Naming Conventions

- Template builder functions: `create{Purpose}Email` or `create{Purpose}Template`
- Config types: `{Purpose}Config` or `{Purpose}TemplateConfig`
- Keep configs flat when possible, nest only when semantic grouping helps

## 9. Brand Styles

Brand styling is configured via the `BrandStyleConfig` object:

```typescript
createBrandTemplate({
  brandStyle: myBrandStyle,  // Required — no defaults
  sections: [...]
});
```

All brand configuration (colors, fonts, logo) must be provided by the
consumer — the SDK does not include defaults for any specific business.
