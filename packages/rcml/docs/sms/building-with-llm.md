# Building with LLM

LLMs can generate SMS templates as SFM strings or as `SmsContentJson` JSON. The
`@rulecom/rcml` package exports three machine-readable spec constants that describe the
complete SMS schema concisely. Serialize them to JSON and include them in a system
prompt once, at the start of a session.

```typescript
import { smsSpec, sfmSpec, smsPlaceholderSpec } from '@rulecom/rcml';

const systemPrompt = `
You generate Rule.io SMS templates as SFM strings.

SMS element schema:
${JSON.stringify(smsSpec)}

SFM content syntax:
${JSON.stringify(sfmSpec)}

Placeholder and merge-field tokens valid in SMS:
${JSON.stringify(smsPlaceholderSpec)}

Output a single SFM string — the message body only.
Use [Type:Name] tokens for dynamic values as described in the placeholder spec.
Single \\n for a line break, \\n\\n for a new paragraph.
`;
```

## The spec objects

**`smsSpec`** — the single `rc-sms` element: its description and the content type it
carries (`sfm-content`). Use this to orient the LLM on the overall template structure.

**`sfmSpec`** — the `sfm-content` flavor: every JSON node type (`doc`, `paragraph`,
`text`, `placeholder`, `hardbreak`) and the `link` mark, each with a full attribute
table. Includes which inline nodes and marks are valid and the exact attribute names,
types, required flags, and allowed values for each. Cross-references to
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
//   content: { type: 'sfm-content' },
//   attributes: {},
// }

// Link to the content model:
const contentType = smsSpec.tags['rc-sms'].content.type;
// → 'sfm-content'
// Use this key to look up sfmSpec.flavors[contentType]
```

## Content model

`sfmSpec.flavors['sfm-content']` tells the LLM which node types are valid as inline
content and which marks may be applied:

```typescript
import { sfmSpec } from '@rulecom/rcml';

sfmSpec.flavors['sfm-content']
// {
//   description: 'SFM (SMS Format Markup) content flavor…',
//   blockNodes: ['paragraph'],
//   inlineNodes: ['text', 'placeholder', 'hardbreak'],
//   marks: ['link'],
// }

// Full attribute schema for the link mark:
sfmSpec.marks['link'].attrs
// {
//   href:    { type: 'string',  required: true, ... },
//   track:   { type: 'boolean', required: true, ... },
//   shorten: { type: 'boolean', required: true, ... },
// }

// Allowed placeholder types:
sfmSpec.nodes['placeholder'].attrs?.['type'].allowedValues
// → ['CustomField', 'Subscriber', 'User', 'RemoteContent', 'Date', 'Link']
```

Note that the SMS link mark uses boolean `track` and `shorten` flags, which differ from
the email link mark's `target` and `no-tracked` string attributes.

## Placeholders

`smsPlaceholderSpec.tokens` contains one entry per token type valid in SMS:

```typescript
import { smsPlaceholderSpec } from '@rulecom/rcml';

Object.keys(smsPlaceholderSpec.tokens)
// → ['CustomField', 'Subscriber', 'User', 'Date', 'RemoteContent', 'Link']

// Subscriber field syntax and examples:
smsPlaceholderSpec.tokens['Subscriber']
// { syntax: '[Subscriber:<field>]', examples: ['[Subscriber:email]', ...], ... }

// System link types:
smsPlaceholderSpec.tokens['Link'].params?.['type'].allowedValues
// → ['Optin', 'Unsubscribe', 'WebBrowser', 'ShareLink', 'Signup']
```

The `Link` token type is SMS-specific — it does not appear in the email `placeholderSpec`.
Use `[Link:Unsubscribe]`, `[Link:WebBrowser]`, etc. as the `href` value of a link mark,
or as a standalone placeholder node when you want the URL rendered as text.

## Generation workflow

Ask the LLM to produce an SFM string (the message body only), then parse and validate it:

```typescript
import {
  sfmToJson,
  createSmsDocument,
  safeValidateSmsDocument,
} from '@rulecom/rcml';

// 1. LLM produces an SFM string
const sfmString = await llm.generate(systemPrompt + '\n\nGenerate a shipping confirmation.');

// 2. Parse and build the document
const doc = createSmsDocument({ content: sfmString });
// createSmsDocument validates internally — throws SmsDocumentBuildError on failure

// 3. Or use the safe variant to inspect errors without a try/catch:
const content = sfmToJson(sfmString);
const result = safeValidateSmsDocument({ tagName: 'rc-sms', attributes: {}, content });

if (!result.success) {
  // Feed result.errors back to the LLM for correction
  return feedbackToLlm(result.errors);
}

// result.data is the validated SmsDocument, ready to submit
```

Because SFM is a compact single-line string, it is the easiest format for an LLM to
produce correctly. If you need link marks (linked text with tracking), prompt the LLM to
output `SmsContentJson` directly instead, using `sfmSpec` as the schema reference.

## Related

- [`smsSpec`](/api/rcml/src/variables/smsSpec) — SMS element schema for system prompts
- [`sfmSpec`](/api/rcml/src/variables/sfmSpec) — SFM content model for system prompts
- [`smsPlaceholderSpec`](/api/rcml/src/variables/smsPlaceholderSpec) — SMS token syntax for system prompts
- [Validation](./validation) — structured error feedback for LLM correction
- [Building programmatically](./building-programmatically) — constructing documents in code
