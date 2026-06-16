# Building with LLM

LLMs can generate SMS templates as SMS RFM strings or as `SmsContentJson` JSON. The
`@rulecom/rcml` package exports three machine-readable spec constants that describe the
complete SMS schema concisely. Serialize them to JSON and include them in a system
prompt once, at the start of a session.

## Providing schema context

Without schema context, an LLM will invent its own placeholder syntax or produce JSON
that does not match the `SmsContentJson` shape. The three spec objects give the model
everything it needs to produce correct output:

```typescript
import { smsSpec, smsRfmSpec, smsPlaceholderSpec } from '@rulecom/rcml';

const systemPrompt = `
You generate Rule.io SMS templates as SMS RFM strings.

SMS element schema:
${JSON.stringify(smsSpec)}

SMS RFM content syntax:
${JSON.stringify(smsRfmSpec)}

Placeholder and merge-field tokens valid in SMS:
${JSON.stringify(smsPlaceholderSpec)}

Output a single SMS RFM string — the message body only.
Use [Type:Name] tokens for dynamic values as described in the placeholder spec.
Use a backslash at end of line for a line break within a paragraph.
Use a blank line to start a new paragraph.
`;
```

## The spec objects

**`smsSpec`** — describes the `rc-sms` element: its description and the content type
identifier (`sms-rfm-content`). Use this to orient the model on the overall template
structure.

**`smsRfmSpec`** — describes the `sms-rfm-content` flavor: every JSON node type (`doc`,
`paragraph`, `text`, `placeholder`, `hardbreak`) and the `link` mark, each with a full
attribute table. Includes which inline nodes and marks are valid and the exact attribute
names, types, required flags, and allowed values for each. Cross-references
`smsPlaceholderSpec` for placeholder `type` values.

**`smsPlaceholderSpec`** — the six token types valid in SMS: `CustomField`, `Subscriber`,
`User`, `Date`, `RemoteContent`, and `Link`. Each entry has the exact token syntax,
parameter descriptions, allowed values, and examples.

## Tag structure

`smsSpec.tags['rc-sms']` describes the one allowed element:

```typescript
import { smsSpec } from '@rulecom/rcml';

smsSpec.tags['rc-sms']
// {
//   description: 'Root element of an SMS document…',
//   content: { type: 'sms-rfm-content' },
//   attributes: {},
// }

// Cross-reference with smsRfmSpec using the content type key:
const contentType = smsSpec.tags['rc-sms'].content.type;
// → 'sms-rfm-content'
const flavor = smsRfmSpec.flavors[contentType];
```

## Content model

`smsRfmSpec.flavors['sms-rfm-content']` tells the model which node types are valid as
block and inline content, and which marks may be applied:

```typescript
import { smsRfmSpec } from '@rulecom/rcml';

smsRfmSpec.flavors['sms-rfm-content']
// {
//   description: 'SMS RFM (SMS Rule Flavor Markdown) content flavor…',
//   blockNodes: ['paragraph'],
//   inlineNodes: ['text', 'placeholder', 'hardbreak'],
//   marks: ['link'],
// }

// Attribute schema for the link mark:
smsRfmSpec.marks['link'].attrs
// {
//   href:    { type: 'string',  required: true, description: '…' },
//   track:   { type: 'boolean', required: true, description: '…' },
//   shorten: { type: 'boolean', required: true, description: '…' },
// }

// Allowed placeholder types:
smsRfmSpec.nodes['placeholder'].attrs?.['type'].allowedValues
// → ['CustomField', 'Subscriber', 'User', 'RemoteContent', 'Date', 'Link']
```

Note that the link mark's `track` and `shorten` flags are typed as **booleans**
in `SmsContentJson` — make sure the LLM emits `true`/`false`, not the strings
`"true"`/`"false"`, when generating JSON output.

## Placeholders

`smsPlaceholderSpec.tokens` contains one entry per token type valid in SMS:

```typescript
import { smsPlaceholderSpec } from '@rulecom/rcml';

Object.keys(smsPlaceholderSpec.tokens)
// → ['CustomField', 'Subscriber', 'User', 'Date', 'RemoteContent', 'Link']

// Subscriber field syntax and examples:
smsPlaceholderSpec.tokens['Subscriber']
// { syntax: '[Subscriber:<field>]', examples: ['[Subscriber:email]', ...], ... }

// System-managed link types:
smsPlaceholderSpec.tokens['Link'].params?.['type'].allowedValues
// → ['Optin', 'Unsubscribe', 'WebBrowser', 'ShareLink', 'Signup']
```

Use `[Link:Unsubscribe]`, `[Link:WebBrowser]`, etc. as the `href` value of a
link mark, or as a standalone `[Link:…]` placeholder in the message text.

## Generation workflow

### SMS RFM string (recommended)

SMS RFM is the easiest output format for an LLM to produce correctly. Ask the model to
output the message body as a single SMS RFM string, then parse and validate:

```typescript
import { smsRfmToJson, createSmsDocument, safeValidateSmsDocument } from '@rulecom/rcml';

// 1. LLM produces an SMS RFM string
const rfmString = await llm.generate(systemPrompt + '\n\nGenerate a shipping confirmation.');

// 2. Parse and build the document (throws SmsDocumentBuildError on failure)
const doc = createSmsDocument({ content: rfmString });

// 3. Or use the safe variant to inspect errors without a try/catch:
const content = smsRfmToJson(rfmString);
const result = safeValidateSmsDocument({ tagName: 'rc-sms', attributes: {}, content });

if (!result.success) {
  // Feed result.errors back to the LLM for correction
  const feedback = result.errors.map((e) => `[${e.code}] ${e.path}: ${e.message}`).join('\n');
  return feedbackToLlm(feedback);
}

// result.data is the validated SmsDocument, ready to submit
```

### JSON AST (when link marks are needed)

If the message requires linked text (text with `href`, `track`, and `shorten`), prompt
the LLM to output `SmsContentJson` directly and validate with `safeParseSmsJson`:

```typescript
import { safeParseSmsJson, createSmsDocument } from '@rulecom/rcml';

// LLM produces a SmsContentJson object
const rawJson = JSON.parse(await llm.generate(jsonPrompt));

// Validate the content JSON
const parsed = safeParseSmsJson(rawJson);
if (!parsed.success) {
  return feedbackToLlm(parsed.errors);
}

// Wrap in SmsDocument
const doc = createSmsDocument({ content: parsed.data });
```

For this path, include `smsRfmSpec` in the system prompt so the model knows the exact
shape of every node and the boolean types of `track` and `shorten`.

## Output format trade-offs

| Format | LLM difficulty | Notes |
|--------|---------------|-------|
| SMS RFM string | Easy — compact, familiar | Recommended. Use `:link[…]{…}` for hyperlinks and `::placeholder{…}` for dynamic values. |
| `SmsContentJson` JSON | Harder — verbose tree shape | Use only when you need to bypass the SMS RFM source format and produce nodes directly. |
| XML (`<rc-sms>…</rc-sms>`) | Easy — familiar XML | The body of `<rc-sms>` is itself an SMS RFM string, so generation difficulty matches SMS RFM. |

All three formats preserve every `SmsContentJson` construct, including link
marks — pick whichever is easiest to coax out of the model. SMS RFM is the
default choice for most workflows.

## Related

- [`smsSpec`](/api/rcml/src/variables/smsSpec) — SMS element schema for system prompts
- [`smsRfmSpec`](/api/rcml/src/variables/smsRfmSpec) — SMS RFM content model for system prompts
- [`smsPlaceholderSpec`](/api/rcml/src/variables/smsPlaceholderSpec) — SMS token syntax for system prompts
- [Validation](./validation) — structured error feedback for LLM correction
- [Building programmatically](./building-programmatically) — constructing documents in code
