# `link`

A mark that wraps a [`text`](../nodes/text) node in a hyperlink with click
tracking and URL shortening controls.

## Attributes

| Attribute | Required | Type | Description |
|-----------|----------|------|-------------|
| `href` | Yes | string | Destination URL. Accepts `[Link:…]` tokens (e.g. `[Link:Unsubscribe]`) for system-managed links. |
| `track` | Yes | boolean | `true` to enable click-through tracking. |
| `shorten` | Yes | boolean | `true` to shorten the URL before sending. |

## Applies to

- [`text`](../nodes/text)

## Available in

- SMS RFM (`rc-sms`) — via the `:link[…]{…}` directive

## JSON

A text node with a link mark to an external URL:

```json
{
  "type": "text",
  "text": "track your order",
  "marks": [
    {
      "type": "link",
      "attrs": {
        "href": "https://example.com/orders/[CustomField:Order.Id]",
        "track": true,
        "shorten": true
      }
    }
  ]
}
```

A link to a system-managed URL using a `[Link:…]` token:

```json
{
  "type": "text",
  "text": "unsubscribe",
  "marks": [
    {
      "type": "link",
      "attrs": {
        "href": "[Link:Unsubscribe]",
        "track": false,
        "shorten": false
      }
    }
  ]
}
```

## SMS RFM syntax

Use the `:link[…]{…}` span directive:

```
Click :link[here]{href="https://example.com" track="true" shorten="true"} to track your order.
```

With a system link:

```
:link[Unsubscribe]{href="[Link:Unsubscribe]" track="false" shorten="false"}
```

All attribute values in the directive are written as strings (`"true"` /
`"false"`); the parser converts them to the booleans the JSON model uses.

## Link marks cannot be expressed as a placeholder

The `[Type:Name]` token form produces a [`placeholder`](../nodes/placeholder)
node, not a link mark. To produce linked text, use the `:link[…]{…}` directive
in SMS RFM, or build `SmsContentJson` directly in code (see
[Building programmatically — Link marks](../../building-programmatically#link-marks)).

Both representations preserve link marks fully: the SMS RFM directive and the
`SmsContentJson` form convert into each other without losing any attributes.

## Related

- [`text`](../nodes/text) — the node type that carries link marks
- [`placeholder`](../nodes/placeholder) — the `Link` token type for system-managed URLs
- [Building programmatically — Link marks](../../building-programmatically#link-marks)
- [`smsRfmSpec`](/api/rcml/src/variables/smsRfmSpec) — mark attribute schema
