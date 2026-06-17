# `text`

A leaf inline node that carries a string of text with an optional
[`link`](../marks/link) mark applied. The link mark is the only mark SMS text
nodes support — text styling is not part of SMS RFM.

## Attributes

None. The text content is held in the `text` field, not in `attrs`.

## Fields

| Field | Required | Description |
|-------|----------|-------------|
| `text` | Yes | The raw text string. Must be non-empty. |
| `marks` | No | Array of [`link`](../marks/link) marks. Omit entirely when no marks are applied — do not set to `[]`. |

## Children

None (leaf node).

## Parent nodes

- [`paragraph`](./paragraph)

## Available in

- SMS RFM (`rc-sms`)

## JSON

Plain text with no marks:

```json
{ "type": "text", "text": "Hello world" }
```

Text with a link mark:

```json
{
  "type": "text",
  "text": "track your order",
  "marks": [
    {
      "type": "link",
      "attrs": {
        "href": "https://example.com/track/[CustomField:Order.Id]",
        "track": true,
        "shorten": true
      }
    }
  ]
}
```

## SMS RFM syntax

Plain text is written as-is. Linked text uses the `:link[…]{…}` span directive:

```
Plain text.

Click :link[here]{href="https://example.com" track="true" shorten="true"} to track.
```

See the [link mark](../marks/link) page for the full attribute reference.
