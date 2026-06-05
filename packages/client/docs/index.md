# @rulecom/client

`@rulecom/client` is the HTTP API client for the [Rule.io](https://rule.io) email marketing platform. It covers the full Rule.io API surface: subscriber management, audience segmentation, campaigns, automations, analytics, and more.

> **Most users should install `@rulecom/sdk` instead.** It re-exports everything from this package and adds the RCML template builders and high-level helpers on top.

## Installation

```bash
npm install @rulecom/client
```

## Connecting to Rule.io

```typescript
import { RuleClient } from '@rulecom/client';

const client = new RuleClient({ apiKey: process.env['RULE_API_KEY']! });
```

You can also pass the API key as a plain string: `new RuleClient(apiKey)`.

*→ [`RuleClient`](/api/client/src/classes/RuleClient)*

## What you can do

| Namespace | What it covers | Guide |
|---|---|---|
| `client.subscribers` | Add, update, find, remove, block, and suppress subscribers | [Managing Subscribers](./managing-subscribers) |
| `client.tags` | Create and manage audience tags | [Tags](./tags) |
| `client.campaigns` | Create, target, and schedule campaigns | [Email Campaigns](./email-campaigns) |
| `client.automations` | Trigger-based email workflows | [Email Automations](./email-automations) |
| `client.messages` | Email message objects | [Email Messages](./email-messages) |
| `client.templates` | Email templates with RCML | [Email Templates](./email-templates) |
| `client.dynamicSets` | Connect messages to templates | [Dynamic Sets](./dynamic-sets) |
| `client.brandStyles` | Brand colors, fonts, and logos | [Brand Styles](./brand-styles) |
| `client.customField` | Custom field group schema | [Custom Field Schema](./custom-fields-schema) |
| `client.apiKeys` | Create and rotate API keys | [API Keys](./api-keys) |
| `client.analytics` | Campaign and automation statistics | [Analytics](./analytics) |
| `client.exports` | Bulk data exports (Enterprise) | [Exports](./exports) |
| `client.recipients` | Recipient lists for targeting | [Recipients](./recipients) |

## Error handling

Two error classes are exported from this package:

```typescript
import { RuleApiError, RuleClientError } from '@rulecom/client';
```

- **`RuleApiError`** — the Rule.io API returned a non-2xx response. Provides `.statusCode`, `.isAuthError()`, `.isValidationError()`, and `.validationErrors`.
- **`RuleClientError`** — misconfiguration in your code (missing API key, invalid arguments).

Most `get` and `find` methods return `null` when the resource does not exist, so you rarely need to catch 404 errors explicitly. See [Error Handling](./error-handling) for the full picture.

*→ [`RuleApiError`](/api/client/src/classes/RuleApiError) · [`RuleClientError`](/api/client/src/classes/RuleClientError)*
