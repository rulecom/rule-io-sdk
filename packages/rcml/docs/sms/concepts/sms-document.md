# SMS document

An SMS template, in code, is an `SmsDocument` — a plain JavaScript object that
describes the entire message. This page describes the type model: the shape of an
`SmsDocument`, the inner `SmsContentJson` document tree, and what each part
represents.

For factory and converter functions that produce or transform documents, see
[Building programmatically](../building-programmatically).

## The `SmsDocument` type

An `SmsDocument` always has the same three fields:

```typescript
type SmsDocument = {
  tagName: 'rc-sms';          // always the string literal 'rc-sms'
  attributes: {};             // always an empty object — rc-sms takes no attributes
  content: SmsContentJson;    // the message body as a structured document tree
};
```

`tagName` and `attributes` are fixed. The interesting part is `content`: a
structured representation of what the message says, ready for the Rule editor to
render and for the Rule platform to substitute placeholders into at send time.

## The `SmsContentJson` tree

`SmsContentJson` is a tree-shaped document model — the same shape the Rule editor
uses internally — that describes the message body as a sequence of paragraphs,
each containing a mixture of text, placeholders, and hard breaks.

Storing content as `SmsContentJson` means a template can be loaded directly into
the Rule editor for human editing and saved back without an intermediate
conversion step.

The top of the tree is always a `doc` node:

```typescript
type SmsContentJson = {
  type: 'doc';
  content: SmsParagraphNode[];
};
```

Each paragraph holds a sequence of inline nodes:

```typescript
type SmsParagraphNode = {
  type: 'paragraph';
  content?: SmsInlineNode[];
};

type SmsInlineNode = SmsTextNode | SmsPlaceholderNode | SmsHardbreakNode;
```

## Inline node types

Three inline node types exist, and one mark may be applied to text nodes.

### Text

A run of plain text, optionally carrying a [link mark](../content/marks/link):

```typescript
type SmsTextNode = {
  type: 'text';
  text: string;               // non-empty
  marks?: SmsLinkMark[];      // omit when no marks are applied
};
```

### Placeholder

A dynamic value the Rule platform substitutes at send time — a subscriber field,
custom field, account attribute, formatted date, fetched remote content, or
system-managed link URL:

```typescript
type SmsPlaceholderNode = {
  type: 'placeholder';
  attrs: {
    type: 'CustomField' | 'Subscriber' | 'User' | 'Date' | 'RemoteContent' | 'Link';
    name: string;             // human-readable label shown in the editor
    original: string;         // backend token, e.g. '[Subscriber:FirstName]'
    value: string | number | null;  // resolved preview value, or null
    'max-length': string | null;    // truncation limit, or null
  };
};
```

The full token catalogue with examples for each `type` value lives in
[Placeholders](../content/nodes/placeholder).

### Hardbreak

A forced line break that stays inside the current paragraph (rather than starting
a new one):

```typescript
type SmsHardbreakNode = {
  type: 'hardbreak';
  attrs: {
    isInline: boolean;
  };
};
```

### Link mark

The one mark that can be applied to a text node — turns the text run into a
hyperlink with click-tracking and URL-shortening controls:

```typescript
type SmsLinkMark = {
  type: 'link';
  attrs: {
    href: string;             // destination URL
    track: boolean;           // enable click-through tracking
    shorten: boolean;         // shorten the URL before sending
  };
};
```

The full attribute reference is on the [link mark page](../content/marks/link).

## A complete example

Putting it together — a two-paragraph greeting with a placeholder and a hard break:

```typescript
const content: SmsContentJson = {
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
        { type: 'text', text: ',' },
        { type: 'hardbreak', attrs: { isInline: false } },
        { type: 'text', text: 'your order has shipped.' },
      ],
    },
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Reply STOP to unsubscribe.' }],
    },
  ],
};
```

## Related

- [SMS RFM](./sms-rfm) — the source format that compiles to `SmsContentJson`
- [Building programmatically](../building-programmatically) — `createSmsDocument` and the format converters
- [SMS RFM Content](../content/nodes/doc) — per-node attribute tables and examples
- [Validation](../validation) — validating an `SmsDocument` before submission
