# @rule-io/core

Shared error classes and primitives used across the `@rule-io/*` package family.

Most consumers don't depend on this package directly — it's pulled in transitively by `@rule-io/client`, `@rule-io/rcml`, and the vendor presets. Import from it explicitly when you need to catch SDK errors:

```ts
import { RuleApiError, RuleConfigError } from '@rule-io/core';

try {
  // ... call into @rule-io/client, @rule-io/rcml, etc.
} catch (err) {
  if (err instanceof RuleApiError) {
    // HTTP error from the Rule.io API
  } else if (err instanceof RuleConfigError) {
    // Consumer-supplied config was invalid
  }
}
```

See the [main `@rule-io/sdk` README](../rule-io-sdk/README.md) for the full SDK documentation.
