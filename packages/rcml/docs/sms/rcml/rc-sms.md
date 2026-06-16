# `rc-sms`

The root and only element of an SMS document. Its text content is the message
body, written in SMS RFM. There is exactly one `<rc-sms>` element per template;
no wrapping root element, no head, no body.

## Attributes

| Attribute | Required | Type | Description |
|-----------|----------|------|-------------|
| `id` | No | string | Optional node identifier (typically a UUID). Set on `SmsDocument.id` and round-tripped through `smsToXml` / `xmlToSms` as the `id="…"` XML attribute. The Rule editor uses this when persisting drafts. |

The element's JSON shape uses `attributes: {}` — `id` lives at the top
level of `SmsDocument`, not inside `attributes`. Other than `id`, `rc-sms`
takes no attributes.

## Content

The element body is an SMS RFM string. During XML parsing, the body is converted
to an `SmsContentJson` ProseMirror document. In the JSON representation, the
`content` field holds the parsed `SmsContentJson` directly.

Content type: `sms-rfm-content` — see
[`smsRfmSpec.flavors['sms-rfm-content']`](/api/rcml/src/variables/smsRfmSpec).

Valid block nodes: [`paragraph`](../content/nodes/paragraph)

Valid inline nodes inside paragraphs: [`text`](../content/nodes/text),
[`placeholder`](../content/nodes/placeholder), [`hardbreak`](../content/nodes/hardbreak)

Valid marks on text nodes: [`link`](../content/marks/link)

## Children

None — `rc-sms` has no child elements. Its content is text, not nested elements.

## Parents

None — `rc-sms` is the document root.

## XML

```xml
<rc-sms>Hi ::placeholder{type="Subscriber" original="[Subscriber:FirstName]" name="First name" value=null max-length=null}, your order has shipped!</rc-sms>
```

## JSON

```json
{
  "tagName": "rc-sms",
  "attributes": {},
  "content": {
    "type": "doc",
    "content": [
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
          { "type": "text", "text": ", your order has shipped!" }
        ]
      }
    ]
  }
}
```

## Building

To construct an `<rc-sms>` document in code, use `createSmsDocument()`. To
convert between the JSON and XML representations, use `smsToXml()` and
`xmlToSms()`. See [Building programmatically](../building-programmatically) for
the full walkthrough.

## Related

- [SMS document](../concepts/sms-document) — `SmsDocument` and `SmsContentJson` types
- [SMS RFM](../concepts/sms-rfm) — SMS RFM syntax reference
- [`placeholder`](../content/nodes/placeholder) — placeholder node and all token types
- [link mark](../content/marks/link) — link mark reference
- [Building programmatically](../building-programmatically) — full document construction walkthrough
