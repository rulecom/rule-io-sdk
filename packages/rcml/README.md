# @rule-io/rcml

RCML (Rule Campaign Markup Language) template builders and type definitions. Use this package to compose email templates that you can send through the Rule.io API via `@rule-io/client` (or one of the vendor presets).

```ts
import {
  createRCMLDocument,
  createBrandTemplate,
  createWelcomeEmail,
} from '@rule-io/rcml';
```

## What's included

- **Primitives**: `createRCMLDocument`, `createSection`, `createHeading`, `createText`, `createButton`, `createImage`, `createLogo`, `createSpacer`, `createDivider`, `createLoop`, `createSwitch`/`createCase`, `createSocial`/`createSocialElement`, and related helpers
- **Brand-style helpers**: `toBrandStyleConfig`, `resolvePreferredBrandStyle`, `createBrandTemplate`, `createBrandHead`, `createBrandLogo`, `createBrandHeading`, `createBrandText`, `createBrandButton`, `createContentSection`, `createFooterSection`, `createStatusTrackerSection`, `createAddressBlock`, `validateCustomFields`
- **Vertical templates**: order confirmation / shipping update / abandoned cart / order cancellation (e-commerce), reservation confirmation / cancellation / reminder / feedback / request (hospitality), welcome (generic)
- **Types**: full RCML structural type hierarchy (`RCMLDocument`, `RCMLSection`, `RCMLProseMirrorDoc`, etc.)
- **Automation config schema**: `AutomationConfigV2`, `TemplateConfigV2`, `getAutomationByIdV2`, `getAutomationByTriggerV2` (used by the vendor preset packages)

See the [main `@rule-io/sdk` README](../rule-io-sdk/README.md) for end-to-end usage examples.
