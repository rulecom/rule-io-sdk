# Building programmatically

The `@rulecom/rcml` package exports a factory function and a set of format converters
for building SMS documents in code. The factory accepts either an SMS RFM string or a
pre-built `SmsContentJson` object and validates the input immediately.

## Quick start

`createSmsDocument()` is the primary entry point. Pass an SMS RFM string as `content`
and it returns a fully-formed `SmsDocument`:

```typescript
import { createSmsDocument } from '@rulecom/rcml';

const doc = createSmsDocument({
  content:
    'Hi ::placeholder{type="Subscriber" original="[Subscriber:FirstName]" name="First name" value=null max-length=null}!' +
    ' Your order ::placeholder{type="CustomField" original="[CustomField:Order.Id]" name="Order.Id" value=null max-length=null} has shipped.',
});
```

The `::placeholder{…}` directive is the recommended form for SMS RFM content. The
`original` attribute holds the `[Type:Name]` token that the Rule platform substitutes
at send time.

`createSmsDocument` throws `SmsDocumentBuildError` if the content fails validation.
To handle errors without a try/catch, use `validateSmsDocument` or
`safeValidateSmsDocument` directly — see [Validation](./validation).

## SMS RFM and JSON

`smsRfmToJson()` converts an SMS RFM string into `SmsContentJson`. `jsonToSmsRfm()`
converts it back:

```typescript
import { smsRfmToJson, jsonToSmsRfm } from '@rulecom/rcml';

// SMS RFM → JSON (use ::placeholder{…} directive form as input)
const json = smsRfmToJson(
  'Hi ::placeholder{type="Subscriber" original="[Subscriber:FirstName]" name="First name" value=null max-length=null}!\nYour order is ready.'
);
// {
//   type: 'doc',
//   content: [
//     {
//       type: 'paragraph',
//       content: [
//         { type: 'text', text: 'Hi ' },
//         { type: 'placeholder', attrs: { type: 'Subscriber', original: '[Subscriber:FirstName]',
//             name: 'First name', value: null, 'max-length': null } },
//         { type: 'text', text: '!' },
//         { type: 'hardbreak', attrs: { isInline: false } },
//         { type: 'text', text: 'Your order is ready.' },
//       ],
//     },
//   ],
// }

// JSON → SMS RFM
// The serializer emits compact [Type:Name] shorthand when value and max-length are null
const rfm = jsonToSmsRfm(json);
// → 'Hi [Subscriber:FirstName]!\nYour order is ready.'
```

The `\n` in the SMS RFM string becomes a `hardbreak` node — a forced line break within
the same paragraph. A blank line (`\n\n`) would produce a new `paragraph` node instead.

Note the asymmetry: the recommended input form is `::placeholder{…}`, but `jsonToSmsRfm`
emits the compact `[Type:Name]` shorthand when both `value` and `max-length` are null.
This is expected — the serializer optimizes for compact output. The parser accepts both
forms on input.

## Link marks

A link mark wraps a text run in a hyperlink with click-tracking and URL-shortening
controls. Either form works: parse the SMS RFM string directly, or build the
`SmsContentJson` tree by hand when that is easier. The two are equivalent and the
choice is a matter of which is more convenient for the case at hand.

Building the JSON directly:

```typescript
import { createSmsDocument } from '@rulecom/rcml';
import type { SmsContentJson } from '@rulecom/rcml';

const content: SmsContentJson = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'View your order: ' },
        {
          type: 'text',
          text: 'track shipment',
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

The same document built from an SMS RFM string with the `:link[…]{…}` directive:

```typescript
const doc = createSmsDocument({
  content:
    'View your order: :link[track shipment]{href="https://example.com/orders/[CustomField:Order.Id]" track="true" shorten="true"}',
});
```

The link mark's `track` and `shorten` flags are booleans in `SmsContentJson`. In
the SMS RFM directive form they appear as the strings `"true"` / `"false"`; the
parser converts them.

Use `[Link:…]` tokens in the `href` for system-managed links:

```typescript
marks: [
  { type: 'link', attrs: { href: '[Link:Unsubscribe]', track: false, shorten: false } },
]
```

## XML format

`smsToXml()` converts an `SmsDocument` to an XML string. `xmlToSms()` converts it
back. XML is one of two equivalent representations of an SMS template — the body
of `<rc-sms>` is just an SMS RFM string, and the conversion is exact in both
directions:

```typescript
import { createSmsDocument, smsToXml, xmlToSms } from '@rulecom/rcml';

const doc = createSmsDocument({
  content:
    'Hi ::placeholder{type="Subscriber" original="[Subscriber:FirstName]" name="First name" value=null max-length=null},' +
    ' your total is ::placeholder{type="CustomField" original="[CustomField:Order.Total]" name="Order.Total" value=null max-length=null}.',
});

// Serialize to XML
// Note: the XML body uses the compact [Type:Name] form (serializer output)
const xml = smsToXml(doc, { pretty: true });
// → '<rc-sms>Hi [Subscriber:FirstName], your total is [CustomField:Order.Total].</rc-sms>'

// Parse back to SmsDocument
const restored = xmlToSms(xml);
// restored deeply equals doc
```

`smsToXml` accepts an optional options object:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `pretty` | `boolean` | `true` | Format the output with newlines and indentation. |
| `indent` | `string` | `'  '` | Indentation string used when `pretty` is `true`. |

`xmlToSms` throws `SmsXmlParseError` on failure. Use `safeXmlToSms` for the non-throwing
variant.

## Safe import from XML

When importing a document from an external source (an LLM, a CMS, or user-provided
input), use `safeXmlToSms` to parse and then `safeValidateSmsDocument` to validate
before using the result:

```typescript
import { safeXmlToSms, safeValidateSmsDocument } from '@rulecom/rcml';

// 1. Parse XML → SmsDocument
const parsed = safeXmlToSms(xmlString);
if (!parsed.success) {
  console.error(parsed.errors);
  // Each error has: { path, code, message }
  // Codes: XML_PARSE_ERROR | ROOT_INVALID | SMS_RFM_PARSE_ERROR
  return;
}

// 2. Validate the document structure and content
const validated = safeValidateSmsDocument(parsed.data);
if (!validated.success) {
  console.error(validated.errors);
  return;
}

// validated.data is the SmsDocument, ready to submit
```

## Related

- [Validation](./validation) — all error types and codes
- [Building with LLM](./building-with-llm) — spec-driven generation workflow
- [SMS document](./concepts/sms-document) — `SmsDocument` and `SmsContentJson` types
- [SMS RFM](./concepts/sms-rfm) — SMS RFM syntax
- [link mark](./content/marks/link) — link mark attributes and `:link[…]{…}` syntax
- [`createSmsDocument`](/api/rcml/src/functions/createSmsDocument) — API reference
- [`smsRfmToJson`](/api/rcml/src/functions/smsRfmToJson) — API reference
- [`jsonToSmsRfm`](/api/rcml/src/functions/jsonToSmsRfm) — API reference
- [`smsToXml`](/api/rcml/src/functions/smsToXml) — API reference
- [`xmlToSms`](/api/rcml/src/functions/xmlToSms) — API reference
