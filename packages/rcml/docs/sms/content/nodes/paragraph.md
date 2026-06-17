# `paragraph`

A block of inline content. The fundamental building block of SMS RFM content. Every
`SmsContentJson` document consists of one or more paragraphs, each of which holds a
sequence of inline nodes.

## Attributes

None.

## Children

Inline nodes — [`text`](./text), [`placeholder`](./placeholder), [`hardbreak`](./hardbreak)

## Parent nodes

- [`doc`](./doc)

## Available in

- SMS RFM (`rc-sms`)

## JSON

```json
{
  "type": "paragraph",
  "content": [{ "type": "text", "text": "Hello world" }]
}
```

A paragraph with a placeholder and a hard break:

```json
{
  "type": "paragraph",
  "content": [
    { "type": "text", "text": "Hi " },
    {
      "type": "placeholder",
      "attrs": {
        "type": "Subscriber",
        "name": "First name",
        "original": "[Subscriber:FirstName]",
        "value": null,
        "max-length": null
      }
    },
    { "type": "text", "text": "!" },
    { "type": "hardbreak", "attrs": { "isInline": false } },
    { "type": "text", "text": "Your order has shipped." }
  ]
}
```

## SMS RFM syntax

Plain text on its own line is a paragraph. A blank line separates paragraphs.

```
This is a paragraph.

This is another paragraph.
```

For forced line breaks within a single paragraph, see [`hardbreak`](./hardbreak).
