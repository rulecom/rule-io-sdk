# @rulecom/sdk

The official TypeScript SDK for the [Rule.io](https://rule.io) email marketing API. Build and send email campaigns, set up tag-triggered automations, manage subscribers, and compose RCML templates — all from code.

**Full TypeScript types** | **Node.js >= 20**

## Installation

```bash
npm install @rulecom/sdk
```

## Quick Start

```typescript
import { RuleClient } from '@rulecom/sdk';

const client = new RuleClient({ apiKey: process.env.RULE_API_KEY! });

await client.createSubscriberV3({
  email: 'customer@example.com',
  status: 'ACTIVE',
});

await client.addSubscriberTagsV3('customer@example.com', {
  tags: ['order-confirmed'],
  automation: 'force',
});
```

Get your API key from [Rule.io Settings → API](https://app.rule.io/settings/api).

## Documentation

Full guides and API reference: see the [`docs/`](./docs/) directory or the published documentation site.

- [Getting Started](./docs/) — overview of what @rulecom/sdk provides
- [Sending Emails](./docs/sending-emails.md) — campaigns and automations
- [Building Templates](./docs/templates.md) — RCML template composition
- [Managing Subscribers](./docs/subscribers.md) — subscriber management
- [Direct API Reference](./docs/api-reference.md) — all Rule.io endpoints

## License

MIT
