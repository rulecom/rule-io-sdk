# SMS

The SMS module provides the types, format converters, and validation functions
needed to build SMS templates that the Rule platform can render and send.

An SMS template is a single `<rc-sms>` element. The whole message is the text
content of that element, written in **SMS RFM** (SMS Rule Flavor Markdown).

## Template formats

A template exists in two equivalent representations. Both carry the same content
and convert between each other.

- **JSON (`SmsDocument`)** — the canonical format. The Rule API accepts and
  returns this. Every other format converts to or from it.
- **XML** — a compact, readable representation of the same template. The text
  body of `<rc-sms>` is an SMS RFM string.

A minimal example in both formats:

```xml
<rc-sms>Hi ::placeholder{type="Subscriber" original="[Subscriber:FirstName]" name="First name" value=null max-length=null}, your order has shipped!</rc-sms>
```

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

The full type model lives in [SMS document](./concepts/sms-document); the SMS RFM
syntax used inside `<rc-sms>` lives in [SMS RFM](./concepts/sms-rfm).

## In this section

| Page | What it covers |
|------|---------------|
| [SMS document](./concepts/sms-document) | The `SmsDocument` and `SmsContentJson` type model |
| [SMS RFM](./concepts/sms-rfm) | The SMS RFM source format: paragraphs, hard breaks, placeholders, links |
| [SMS RCML](./rcml/) | The `rc-sms` element reference |
| [SMS RFM Content](./content/nodes/doc) | Every node and mark with full attribute tables |
| [Building programmatically](./building-programmatically) | `createSmsDocument`, SMS RFM ↔ JSON, XML round-trip |
| [Validation](./validation) | Validating documents and content before submission |
| [Building with LLM](./building-with-llm) | Using spec objects to drive LLM-assisted template generation |
