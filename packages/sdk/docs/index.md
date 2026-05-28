# @rulecom/sdk

`@rulecom/sdk` is the meta-package umbrella for the Rule.io SDK. Install this one package to get the full API client and all RCML template builders.

```bash
npm install @rulecom/sdk
```

## What's included

| Export | Source | Purpose |
|---|---|---|
| `RuleClient`, `RuleApiError`, `RuleClientError` | `@rulecom/client` | HTTP API client and error types |
| `createRCMLDocument`, `createBrandTemplate`, … | `@rulecom/rcml` | RCML element and brand-style builders |
## Where to go next

- **[@rulecom/client →](/packages/client/)** — HTTP API client: subscribers, campaigns, automations, brand styles, and all other endpoints
- **[@rulecom/rcml →](/packages/rcml/)** — RCML template builders: compose email templates at any level of abstraction
