# `doc`

The root node of every `SmsContentJson` document. Its `content` array holds one or
more [`paragraph`](./paragraph) blocks.

## Attributes

None.

## Children

One or more [`paragraph`](./paragraph) nodes.

## Parent nodes

None — `doc` is the root; it has no parent.

## Available in

- SMS RFM (`rc-sms`)

## JSON

```json
{
  "type": "doc",
  "content": [
    {
      "type": "paragraph",
      "content": [{ "type": "text", "text": "Hello world" }]
    }
  ]
}
```

Multi-paragraph document:

```json
{
  "type": "doc",
  "content": [
    {
      "type": "paragraph",
      "content": [{ "type": "text", "text": "First paragraph" }]
    },
    {
      "type": "paragraph",
      "content": [{ "type": "text", "text": "Second paragraph" }]
    }
  ]
}
```

## SMS RFM

A `doc` node is implicit — it is not written directly. Each blank-line-separated block
of text in an SMS RFM string becomes one `paragraph` inside the `doc`. Two
blank-line-separated paragraphs produce a `doc` with two children.

```
First paragraph

Second paragraph
```
