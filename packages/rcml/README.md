# @rulecom/rcml

RCML (Rule Campaign Markup Language) template builders and type definitions. Use this package to compose email templates that you can send through the Rule.io API via `@rulecom/client` (or one of the vendor presets).

```ts
import {
  createRCMLDocument,
  createBrandTemplate,
  createEmailTemplate,
} from '@rulecom/rcml';
```

## What's included

- **Primitives**: `createRCMLDocument`, `createSection`, `createHeading`, `createText`, `createButton`, `createImage`, `createLogo`, `createSpacer`, `createDivider`, `createLoop`, `createSwitch`/`createCase`, `createSocial`/`createSocialElement`, and related helpers
- **Brand-style helpers**: `toBrandStyleConfig`, `resolvePreferredBrandStyle`, `createBrandTemplate`, `createBrandHead`, `createBrandLogo`, `createBrandHeading`, `createBrandText`, `createBrandButton`, `createContentSection`, `createFooterSection`, `createStatusTrackerSection`, `createAddressBlock`, `validateCustomFields`
- **Ready-made email factory**: `createEmailTemplate` bundles the load + compile + theme projection + `xmlToRcml` + `applyTheme` pipeline — see [`packages/template-engine/README.md`](../template-engine/README.md) for the authoring pattern
- **Types**: full RCML structural type hierarchy (`RCMLDocument`, `RCMLSection`, `RCMLProseMirrorDoc`, etc.)
- **Automation config schema**: `AutomationConfigV2`, `TemplateConfigV2`, `getAutomationByIdV2`, `getAutomationByTriggerV2`

See the [main `@rulecom/sdk` README](../sdk/README.md) for end-to-end usage examples.
