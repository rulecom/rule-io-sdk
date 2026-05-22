# @rulecom/sdk

`@rulecom/sdk` is the meta-package umbrella for the Rule.io SDK. It re-exports everything from `@rulecom/client` and `@rulecom/rcml`, so installing this one package gives you the full API client, all RCML template builders, and the high-level helpers.

## What's included

| Export | Source | Purpose |
|---|---|---|
| `RuleClient` | `@rulecom/client` | HTTP API client for all Rule.io endpoints |
| `RuleApiError`, `RuleClientError` | `@rulecom/client` | Typed error classes |
| `createRCMLDocument`, `createCenteredSection`, … | `@rulecom/rcml` | Low-level RCML element builders |
| `createBrandTemplate`, `createContentSection`, … | `@rulecom/rcml` | Brand-style template helpers |
| `resolvePreferredBrandStyle`, `toBrandStyleConfig` | `@rulecom/rcml` | Brand style resolution utilities |
| `createCampaignEmail`, `createAutomationEmail` | `@rulecom/sdk` | High-level email creation helpers |

## Guides

- [Brand Styles](./brand-styles) — resolve and configure brand styles for email templates
- [Sending Emails](./sending-emails) — create campaign and automation emails with one call
- [Building Templates](./templates) — compose RCML email templates at any level of abstraction
- [Managing Subscribers](./subscribers) — create, tag, bulk-update, and delete subscribers
- [API Reference](./api-reference) — low-level direct access to all Rule.io API endpoints
