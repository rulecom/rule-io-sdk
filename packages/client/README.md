# @rulecom/client

HTTP API client for the Rule.io email-marketing platform. Wraps the v2 and v3 endpoints for subscribers, automations, messages, templates, campaigns, exports, analytics, brand styles, and API keys.

```ts
import { RuleClient } from '@rulecom/client';

const client = new RuleClient({ apiKey: process.env.RULE_API_KEY! });

await client.subscribers.create({
  email: 'jane@example.com',
  tags: ['Newsletter'],
});
```

## Composes with

- [`@rulecom/rcml`](../rcml/README.md) — build email templates that the client sends via `client.createAutomationEmail()` / `client.createCampaignEmail()`.

See the [main `@rulecom/sdk` README](../sdk/README.md) for end-to-end usage.
