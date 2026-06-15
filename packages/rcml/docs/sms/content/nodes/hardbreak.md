# `hardbreak`

Forces a new line within the same paragraph. A hard break is not a new paragraph — the
content before and after the break remains inside the same `paragraph` node.

## Attributes

| Attribute | Required | Type | Description |
|-----------|----------|------|-------------|
| `isInline` | Yes | boolean | Whether the break is inline. The SMS RFM parser always produces `false`. The Rule editor may produce `true` for inline breaks created inside the editor. |

## Children

None (leaf node).

## Parent nodes

- [`paragraph`](./paragraph)

## Available in

- SMS RFM (`rc-sms`)

## JSON

```json
{ "type": "hardbreak", "attrs": { "isInline": false } }
```

A paragraph containing a hard break:

```json
{
  "type": "paragraph",
  "content": [
    { "type": "text", "text": "First line" },
    { "type": "hardbreak", "attrs": { "isInline": false } },
    { "type": "text", "text": "Second line — same paragraph" }
  ]
}
```

## SMS RFM syntax

Write a backslash at the end of a line, or two trailing spaces before the newline:

```
First line\
Second line — same paragraph
```

```
First line  
Second line — same paragraph
```

Both forms produce the same `hardbreak` node. The backslash form is preferred because
trailing spaces are invisible in most editors.

### Hard break vs new paragraph

| Source | Produces |
|--------|----------|
| Backslash at end of line | `hardbreak` inside the current `paragraph` |
| Two trailing spaces | `hardbreak` inside the current `paragraph` |
| Blank line | New `paragraph` node |

```
Line one\
Line two          ← same paragraph as line one

Line three        ← new paragraph
```
