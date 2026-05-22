# Building Templates

The SDK offers two levels of template building, from highest to lowest abstraction.

> **Vendor-specific pre-built templates** (Shopify order confirmation, Bookzen reservation, Samfora donation, etc.) are not included in this release. They will ship as part of `@rulecom/vendor-shopify`, `@rulecom/vendor-bookzen`, and `@rulecom/vendor-samfora` in a future release.

## Brand Templates

Build custom branded templates with merge-field placeholders. Requires a `BrandStyleConfig` — see [Brand Styles](./brand-styles).

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
} from '@rulecom/sdk';

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

Brand templates also support **loops** for repeating content (e.g. order line items) via `createBrandLoop` and `createLoopFieldPlaceholder`.

## RCML Elements (low-level)

Build templates element by element for full control:

```typescript
import {
  createRCMLDocument,
  createCenteredSection,
  createHeading,
  createText,
  createButton,
  createLogo,
} from '@rulecom/sdk';

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

Additional elements: `createImage`, `createVideo`, `createSpacer`, `createDivider`, `createSocial`/`createSocialElement`, `createLoop`, `createSwitch`/`createCase` (conditional content), `createTwoColumnSection`.

## Security

RCML element builders (`createButton`, `createImage`, `createVideo`) sanitize URL parameters to block `javascript:` and `data:` URIs. Text content is placed into structured ProseMirror nodes (not raw HTML) so it doesn't need escaping.

## See also

- [Sending Emails](./sending-emails) — pass the resulting `RCMLDocument` to `createCampaignEmail` / `createAutomationEmail`
