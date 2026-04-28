# @rule-io/client

HTTP API client for the Rule.io email-marketing platform. Wraps the v2 and v3 endpoints for subscribers, automations, messages, templates, campaigns, exports, analytics, brand styles, and API keys.

```ts
import { RuleClient } from '@rule-io/client';

const client = new RuleClient({ apiKey: process.env.RULE_API_KEY! });

await client.createSubscriberV3({
  email: 'jane@example.com',
  tags: ['Newsletter'],
});
```

## Composes with

- [`@rule-io/rcml`](../rcml/README.md) — build email templates that the client sends via `createAutomationEmail()` / `createCampaignEmail()`.
- [`@rule-io/vendor-shopify`](../vendor-shopify/README.md), [`-bookzen`](../vendor-bookzen/README.md), [`-samfora`](../vendor-samfora/README.md) — turnkey presets for platform-specific automation flows.

See the [main `@rule-io/sdk` README](../sdk/README.md) for end-to-end usage.
