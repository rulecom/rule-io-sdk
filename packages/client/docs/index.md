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
| `client.subscribers` | Add, update, find, and remove subscribers | [Managing Subscribers](./managing-subscribers) |
| `client.tags` | Create and manage audience tags | [Organizing with Tags](./organizing-with-tags) |
| `client.campaigns` | Create, target, and schedule campaigns | [Running Campaigns](./running-campaigns) |
| `client.automations` | Trigger-based email workflows | [Setting Up Automations](./setting-up-automations) |
| `client.messages` | Email message objects | [Building Email Content](./email-content) |
| `client.templates` | Email templates with RCML | [Building Email Content](./email-content) |
| `client.dynamicSets` | Connect messages to templates | [Building Email Content](./email-content) |
| `client.brandStyles` | Brand colors, fonts, and logos | [Managing Brand Styles](./managing-brand-styles) |
| `client.suppressions` | Suppress and reactivate subscribers | [Managing Suppressions](./managing-suppressions) |
| `client.apiKeys` | Create and rotate API keys | [Managing API Keys](./managing-api-keys) |
| `client.analytics` | Campaign and automation statistics | [Tracking Performance](./tracking-performance) |
| `client.exports` | Bulk data exports (Enterprise) | [Exporting Data](./exporting-data) |
| `client.recipients` | Recipient lists for targeting | [Running Campaigns](./running-campaigns) |

## Error handling

Two error classes are exported from this package:

```typescript
import { RuleApiError, RuleClientError } from '@rulecom/client';
```

- **`RuleApiError`** — the Rule.io API returned a non-2xx response. Provides `.statusCode`, `.isAuthError()`, `.isValidationError()`, and `.validationErrors`.
- **`RuleClientError`** — misconfiguration in your code (missing API key, invalid arguments).

Most `get` and `find` methods return `null` when the resource does not exist, so you rarely need to catch 404 errors explicitly. See [Error Handling](./error-handling) for the full picture.

*→ [`RuleApiError`](/api/client/src/classes/RuleApiError) · [`RuleClientError`](/api/client/src/classes/RuleClientError)*
