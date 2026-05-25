# `doc`

The root node of a rich-text content tree. Every `content` field on `rc-text`, `rc-heading`, and `rc-button` is a `doc` node.

## Attributes

None.

## Children

Block nodes — `paragraph`, `bullet-list`, `ordered-list`, `align` (one or more)

## Parent nodes

None. `doc` is always the root.

## Available in

- Full RFM (`rc-text`, `rc-heading`)
- Inline RFM (`rc-button`)

## JSON

```json
{
  "type": "doc",
  "content": [
    { "type": "paragraph", "content": [{ "type": "text", "text": "Hello world" }] }
  ]
}
```

A `doc` with multiple paragraphs:

```json
{
  "type": "doc",
  "content": [
    { "type": "paragraph", "content": [{ "type": "text", "text": "First paragraph." }] },
    { "type": "paragraph", "content": [{ "type": "text", "text": "Second paragraph." }] }
  ]
}
```

## RFM syntax

The `doc` node is the implicit wrapper for all RFM content. It is never written directly — the RFM parser and the `rfmToJson` / `inlineRfmToJson` functions always return a `doc` node as the top-level result.

```typescript
import { rfmToJson } from '@rulecom/rcml';

const doc = rfmToJson('Hello world');
// { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello world' }] }] }
```
