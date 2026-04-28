# @rule-io/cli

Command-line tools for the [Rule.io](https://rule.io) SDK. Deploy vendor preset automations, validate RCML templates, and inspect your Rule.io account without writing code.

```bash
npx @rule-io/cli --help
```

Or install globally:

```bash
npm install -g @rule-io/cli
rule-io --help
```

## Setup

Put your Rule.io API key in a `.env` file in the directory you run the CLI from:

```
RULE_API_KEY=your-api-key-here
```

Or pass it on every invocation with `--api-key <key>`.

## Commands

### `rule-io deploy <vendor>`

Deploy a vendor preset's full automation suite into a Rule.io account. The deploy flow:

1. Seeds a test subscriber with every field the preset references, so the field definitions exist in the account.
2. Applies every trigger tag to the seed so they resolve to numeric ids.
3. Resolves numeric field ids from the seeded subscriber.
4. Resolves the account's preferred brand style (the one flagged `is_default: true`), or uses `--brand <id>` if passed.
5. Creates each automation via the v3 editor API, handling the automail → message → template → dynamic-set chain (with cleanup on failure).

```bash
rule-io deploy shopify                 # deploy Shopify presets, automations left inactive
rule-io deploy shopify --activate      # deploy + activate
rule-io deploy shopify --brand 12345   # force a specific brand style id
rule-io deploy bookzen                 # hospitality flows (reservations, feedback)
rule-io deploy samfora                 # Swedish donation flows (additionally seeds 6 persona subscribers)
```

### `rule-io list-automations`

List the 20 most-recently-created automations in the account.

```bash
rule-io list-automations
rule-io list-automations --limit 50
```

Sub-command:

```bash
rule-io list-automations urls 29150 29151   # print editor URLs for specific automation ids
```

### `rule-io validate-rcml`

Create a campaign in Rule.io containing a showcase of RCML elements (headings, text, placeholders, buttons, images, loops, switch/case, etc.) so you can verify each renders correctly in Rule.io's editor.

```bash
rule-io validate-rcml                     # create the full showcase
rule-io validate-rcml --probe             # test each section individually
rule-io validate-rcml --sections 1,2,6    # only specific sections
rule-io validate-rcml --cleanup           # delete the resources created by the most recent run
```

Environment variables (in addition to `RULE_API_KEY`):
- `RULE_BRAND_STYLE_ID` — force a specific brand style id (otherwise resolves `is_default`)
- `RULE_FROM_EMAIL` — sender email (default `test@example.com`)
- `RULE_FROM_NAME` — sender name (default `SDK RCML Validation`)

### `rule-io clone-email`

Copy an automation email between Rule.io accounts via a local JSON snapshot.

```bash
# 1. Snapshot from the source account (pass source API key)
rule-io clone-email fetch \
  --api-key <source-key> \
  --automail 29150 \
  --message 38101

# 2. Recreate in the target account (uses $RULE_API_KEY from .env)
rule-io clone-email send \
  --snapshot email-snapshots/automail-29150.json \
  --tag OrderCompleted \
  --activate
```

The brand-style id from the source is stripped so the target's default brand style is used.

### `rule-io inspect`

Diagnostic probe of a Rule.io account — reports brand styles, Shopify tag/field existence, and any automations with "shopify-like" names.

```bash
rule-io inspect
```

## Dev-local invocation (inside this workspace)

Contributors can run the CLI directly against the source (no build step) via either:

```bash
# via Nx:
npx nx run cli:run -- deploy shopify --account 123

# via npm scripts (defined at the workspace root):
npm run cli -- --help
npm run deploy:shopify -- --activate

# via tsx directly:
npx tsx packages/cli/src/cli.ts inspect
```

See the [main `@rule-io/sdk` README](../sdk/README.md) for the full SDK documentation and the [root README](../../README.md) for release instructions.
