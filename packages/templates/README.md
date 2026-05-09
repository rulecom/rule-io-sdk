# @rule-io/templates

Angular-like XML template engine. Currently used by `@rule-io/vendor-shopify` to render its email content; intended as the shared rendering layer for any future `@rule-io/vendor-*` package that wants the same templating model. Supports `{{ expression }}` interpolation, `*ngIf` / `*ngFor` structural directives, and `[attr]` property binding on XML elements.

Most consumers don't depend on this package directly — it's pulled in transitively through `@rule-io/vendor-shopify`. Import from it explicitly when you need the renderer or its error type:

```ts
import { renderTemplate, TemplateRenderError } from '@rule-io/templates';
import type { TemplateContext } from '@rule-io/templates';
```

See the [main `@rule-io/sdk` README](../sdk/README.md) for full SDK documentation.
