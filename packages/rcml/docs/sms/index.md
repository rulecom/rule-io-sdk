# SMS

The SMS module provides the types, format converters, and validation functions needed to
build SMS templates that the Rule platform can render and send. An SMS template is a
single `rc-sms` element whose body is an SFM-formatted message string.

## The `rc-sms` element

`rc-sms` is the root and only element in an SMS template. It takes no attributes — the
entire message lives in its content body.

```xml
<rc-sms>Hi [Subscriber:FirstName], your order has shipped!</rc-sms>
```

In JSON, an SMS document is an `SmsDocument`:

```typescript
import type { SmsDocument } from '@rulecom/rcml';

const doc: SmsDocument = {
  tagName: 'rc-sms',
  attributes: {},
  content: {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Hi ' },
          {
            type: 'placeholder',
            attrs: {
              type: 'Subscriber',
              name: 'First name',
              original: '[Subscriber:FirstName]',
              value: null,
              'max-length': null,
            },
          },
          { type: 'text', text: ', your order has shipped!' },
        ],
      },
    ],
  },
};
```

The `content` field is an `SmsContentJson` — a ProseMirror-shaped JSON document that
the Rule editor uses internally. Most of the time you won't build it by hand; the
factory function and the SFM parser produce it for you.

## SFM content

SFM (SMS Format Markup) is the text format used inside `<rc-sms>` elements. It is the
SMS equivalent of RFM for email: a compact string that the parser converts into the
`SmsContentJson` model automatically.

**Placeholders** use `[Type:Name]` syntax:

| Token syntax | What it inserts |
|---|---|
| `[Subscriber:FirstName]` | Subscriber profile field |
| `[CustomField:Order.Total]` | Subscriber custom field |
| `[User:CompanyName]` | Sender account field |
| `[Date:now::Y-m-d]` | Current date formatted |
| `[RemoteContent:https://…]` | Fetched remote text |
| `[Link:Unsubscribe]` | System-managed link URL |

**Line breaks** follow two rules:

- A single newline (`\n`) becomes a hard line break within the same paragraph.
- A blank line (`\n\n`) starts a new paragraph.

```
First line\nSecond line        ← hard break inside one paragraph
First paragraph\n\nSecond      ← two separate paragraphs
```

**Link marks** — text spans that carry a URL, tracking flag, and shortening flag — are
part of the `SmsContentJson` model but cannot be expressed in SFM text. If you need
linked text, build the `SmsContentJson` directly rather than going through SFM. See
[Building programmatically](./building-programmatically#link-marks) for an example.

## In this section

- [Building programmatically](./building-programmatically) — `createSmsDocument`, SFM
  conversion, link marks, and XML round-trip
- [Validation](./validation) — validating documents before submission
- [Building with LLM](./building-with-llm) — using the machine-readable specs to drive
  LLM-assisted template generation
