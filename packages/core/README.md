# @rulecom/core

Shared types and utilities used across the `@rulecom/*` package family:

- **Error classes** — `RuleApiError`, `RuleConfigError`.
- **Brand & theme types** — `EmailTheme` and friends (`EmailThemeColor`, `EmailThemeFont`, `EmailThemeImage`, …), `CustomFieldMap`, `FooterConfig`.
- **Automation-config contract** — `AutomationConfigV2`, `TemplateConfigV2`, plus `getAutomationByIdV2` / `getAutomationByTriggerV2`. Vendor presets implement this.
- **Vendor-preset interface** — `VendorPreset`, `VendorConsumerConfig`, `VendorAutomation`, plus `resolveVendorAutomations`.
- **Sanitisation helpers** — `escapeHtml`, `sanitizeUrl`, `formatDateForRule`.

Most consumers don't depend on this package directly — it's pulled in transitively by `@rulecom/client`, `@rulecom/rcml`, and every `@rulecom/vendor-*` preset. Import from it explicitly when you need any of the above:

```ts
import { RuleApiError, RuleConfigError } from '@rulecom/core';

try {
  // ... call into @rulecom/client, @rulecom/rcml, etc.
} catch (err) {
  if (err instanceof RuleApiError) {
    // HTTP error from the Rule.io API
  } else if (err instanceof RuleConfigError) {
    // Consumer-supplied config was invalid
  }
}
```

See the [main `@rulecom/sdk` README](../sdk/README.md) for the full SDK documentation.
