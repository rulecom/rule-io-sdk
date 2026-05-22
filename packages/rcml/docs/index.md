# @rulecom/rcml

`@rulecom/rcml` provides the RCML (Rule Campaign Markup Language) template builders and type definitions. Use this package to compose email templates that you can send through the Rule.io API.

> **Most users should install `@rulecom/sdk` instead.** It re-exports everything from this package plus the HTTP client and high-level helpers.

## Primitives

Low-level building blocks for composing email templates element by element:

```typescript
import {
  createRCMLDocument,
  createCenteredSection,
  createHeading,
  createText,
  createButton,
  createImage,
  createLogo,
  createSpacer,
  createDivider,
  createLoop,
  createSwitch,
  createCase,
  createSocial,
  createSocialElement,
  createTwoColumnSection,
} from '@rulecom/rcml';
```

## Brand-style helpers

Higher-level helpers that build branded templates from a `BrandStyleConfig`:

```typescript
import {
  createBrandTemplate,
  createBrandLogo,
  createBrandHeading,
  createBrandText,
  createBrandButton,
  createContentSection,
  createFooterSection,
  createStatusTrackerSection,
  createAddressBlock,
  createBrandLoop,
  createLoopFieldPlaceholder,
  toBrandStyleConfig,
  resolvePreferredBrandStyle,
  validateCustomFields,
} from '@rulecom/rcml';
```

## Merge fields and placeholders

```typescript
import {
  createPlaceholder,
  createTextNode,
  createDocWithPlaceholders,
} from '@rulecom/rcml';
```

## Types

The full RCML structural type hierarchy is exported: `RCMLDocument`, `RCMLSection`, `RCMLProseMirrorDoc`, `BrandStyleConfig`, `CustomFieldMap`, and more. See the [API Reference](../../api/rcml/) for complete type documentation.
