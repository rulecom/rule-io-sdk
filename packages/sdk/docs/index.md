# @rulecom/sdk

`@rulecom/sdk` is the meta-package umbrella for the Rule.io SDK. Install this one package to get the full API client, all RCML template builders, and the high-level email-creation helpers.

```bash
npm install @rulecom/sdk
```

## What's included

| Export | Source | Purpose |
|---|---|---|
| `RuleClient`, `RuleApiError`, `RuleClientError` | `@rulecom/client` | HTTP API client and error types |
| `createRCMLDocument`, `createBrandTemplate`, … | `@rulecom/rcml` | RCML element and brand-style builders |
| `resolvePreferredBrandStyle`, `toBrandStyleConfig` | `@rulecom/rcml` | Brand style resolution utilities |
| `createCampaignEmail`, `createAutomationEmail` | `@rulecom/sdk` | High-level email creation helpers |

## Where to go next

- **[Sending Emails](./sending-emails)** — create campaign and automation emails with a single call (SDK-level helpers)
- **[@rulecom/client →](/packages/client/)** — HTTP API client: subscribers, campaigns, automations, brand styles, and all other endpoints
- **[@rulecom/rcml →](/packages/rcml/)** — RCML template builders: compose email templates at any level of abstraction
