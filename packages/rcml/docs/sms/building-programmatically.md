# Building programmatically

The `@rulecom/rcml` package exports a factory function and a set of format converters
for building SMS documents in code. The factory accepts either an SFM string or a
pre-built `SmsContentJson` object and validates the input immediately.

## Quick start

`createSmsDocument()` is the primary entry point. Pass an SFM string as `content` and
it returns a fully-formed `SmsDocument`:

```typescript
import { createSmsDocument } from '@rulecom/rcml';

const doc = createSmsDocument({
  content: 'Hi [Subscriber:FirstName]! Your order [CustomField:Order.Id] has shipped.',
});
```

Optionally pass an `id` to tie the document to an existing Rule template:

```typescript
const doc = createSmsDocument({
  id: 'my-shipping-confirmation',
  content: 'Hi [Subscriber:FirstName]! Your order has shipped.',
});
```

`createSmsDocument` throws `SmsDocumentBuildError` if the content fails validation.
To handle errors without a try/catch, use `validateSmsDocument` or `safeValidateSmsDocument`
directly — see [Validation](./validation).

## SFM and JSON

SFM is the text format used inside `<rc-sms>` elements. `sfmToJson` converts an SFM
string into `SmsContentJson`, and `jsonToSfm` converts it back:

```typescript
import { sfmToJson, jsonToSfm } from '@rulecom/rcml';

// SFM → JSON
const json = sfmToJson('Hi [Subscriber:FirstName]!\nYour order is ready.');
// {
//   type: 'doc',
//   content: [
//     { type: 'paragraph', content: [
//       { type: 'text', text: 'Hi ' },
//       { type: 'placeholder', attrs: { type: 'Subscriber', original: '[Subscriber:FirstName]', ... } },
//       { type: 'text', text: '!' },
//       { type: 'hardbreak', attrs: { isInline: false } },
//       { type: 'text', text: 'Your order is ready.' },
//     ]},
//   ],
// }

// JSON → SFM
const sfm = jsonToSfm(json);
// → 'Hi [Subscriber:FirstName]!\nYour order is ready.'
```

**Link marks are lossy in SFM.** If a `SmsContentJson` object contains text nodes with
link marks, `jsonToSfm` strips the marks and preserves only the text. If you need a
round-trip that preserves link marks, use the XML format instead.

## Link marks

A link mark wraps a text run in a hyperlink with SMS-specific tracking and URL
shortening controls. Because SFM cannot express link marks, build the
`SmsContentJson` directly when you need linked text:

```typescript
import { createSmsDocument } from '@rulecom/rcml';
import type { SmsContentJson } from '@rulecom/rcml';

const content: SmsContentJson = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Click here: ' },
        {
          type: 'text',
          text: 'view your order',
          marks: [
            {
              type: 'link',
              attrs: {
                href: 'https://example.com/orders/[CustomField:Order.Id]',
                track: true,    // enable click-through tracking
                shorten: true,  // shorten the URL before sending
              },
            },
          ],
        },
      ],
    },
  ],
};

const doc = createSmsDocument({ content });
```

The SMS link mark has two boolean flags — `track` and `shorten` — which differ from the
email link mark's `target` and `no-tracked` string attributes.

## XML format

`smsToXml` converts an `SmsDocument` to an XML string, and `xmlToSms` converts it back.
The XML format is lossless for everything except link marks (which are serialized as
plain text in SFM, the same limitation as `jsonToSfm`):

```typescript
import { createSmsDocument, smsToXml, xmlToSms } from '@rulecom/rcml';

const doc = createSmsDocument({
  content: 'Hi [Subscriber:FirstName], your total is [CustomField:Order.Total].',
});

// Serialize to XML
const xml = smsToXml(doc, { pretty: true });
// → '<rc-sms>Hi [Subscriber:FirstName], your total is [CustomField:Order.Total].</rc-sms>'

// Parse back to JSON
const restored = xmlToSms(xml);
// restored deeply equals doc
```

`smsToXml` accepts an optional options object:

| Option | Type | Default | Description |
|---|---|---|---|
| `pretty` | `boolean` | `true` | Whether to format the output with newlines and indentation |
| `indent` | `string` | `'  '` | Indentation string used when `pretty` is `true` |

`xmlToSms` throws `SmsXmlParseError` on failure. Use `safeXmlToSms` for the
non-throwing variant — see [Validation](./validation#error-types).

## Related

- [Validation](./validation) — validating documents before submission
- [Building with LLM](./building-with-llm) — using spec objects to drive LLM generation
- [`createSmsDocument`](/api/rcml/src/functions/createSmsDocument) — API reference
- [`sfmToJson`](/api/rcml/src/functions/sfmToJson) — API reference
- [`jsonToSfm`](/api/rcml/src/functions/jsonToSfm) — API reference
- [`smsToXml`](/api/rcml/src/functions/smsToXml) — API reference
- [`xmlToSms`](/api/rcml/src/functions/xmlToSms) — API reference
