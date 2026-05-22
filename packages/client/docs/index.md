# @rulecom/client

`@rulecom/client` is the low-level HTTP API client for the Rule.io email marketing platform. It wraps the v2 and v3 endpoints for subscribers, automations, messages, templates, campaigns, exports, analytics, brand styles, and API keys.

> **Most users should install `@rulecom/sdk` instead.** It re-exports everything from this package plus the RCML template builders and high-level helpers.

## Usage

```typescript
import { RuleClient } from '@rulecom/client';

const client = new RuleClient({ apiKey: process.env.RULE_API_KEY! });

await client.subscribers.sync({
  email: 'jane@example.com',
  tags: ['Newsletter'],
});
```

## Namespace clients

`RuleClient` exposes all API endpoints through namespace properties:

| Property | Covers |
|---|---|
| `client.subscribers` | subscriber CRUD, tag assignment, bulk ops |
| `client.tags` | tag management |
| `client.automations` | automation workflows |
| `client.messages` | message objects |
| `client.templates` | email template CRUD and rendering |
| `client.campaigns` | campaign creation and scheduling |
| `client.dynamicSets` | message-to-template connections |
| `client.brandStyles` | brand style management |
| `client.suppressions` | suppression lists |
| `client.apiKeys` | API key management |
| `client.exports` | data export (Enterprise) |
| `client.analytics` | send statistics |
| `client.recipients` | recipient list segments |
| `client.customFieldData` | custom field data (deprecated) |

## Error types

```typescript
import { RuleApiError, RuleClientError } from '@rulecom/client';
```

- `RuleApiError` — HTTP error from the Rule.io API. Provides `statusCode`, `isAuthError()`, `isValidationError()`, and `validationErrors`.
- `RuleClientError` — misconfiguration (e.g. missing API key).
