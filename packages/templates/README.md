# @rule-io/templates

Angular-like XML template engine used by `@rule-io/*` vendor email-template packages. Supports `{{ expression }}` interpolation, `*ngIf` / `*ngFor` structural directives, and `[attr]` property binding on XML elements.

Most consumers don't depend on this package directly — it's pulled in transitively through `@rule-io/vendor-shopify`. Import from it explicitly when you need the renderer or its error type:

```ts
import { renderTemplate, TemplateRenderError } from '@rule-io/templates';
import type { TemplateContext } from '@rule-io/templates';
```

See the [main `@rule-io/sdk` README](../sdk/README.md) for full SDK documentation.
