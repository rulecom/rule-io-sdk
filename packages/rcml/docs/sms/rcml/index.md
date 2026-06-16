# SMS RCML Reference

SMS RCML consists of a single element: `<rc-sms>`. There is no document root
wrapper, no `<rc-head>`, and no `<rc-body>`. A template is exactly one element,
and its text content is the message body — written in
[SMS RFM](../concepts/sms-rfm).

```xml
<rc-sms>Hello world</rc-sms>
```

## Elements

| Element | Purpose |
|---------|---------|
| [`<rc-sms>`](./rc-sms) | The root element. Contains the message body as SMS RFM text. |

## Related

- [`rc-sms`](./rc-sms) — full element reference
- [SMS document](../concepts/sms-document) — the `SmsDocument` and `SmsContentJson` types
- [SMS RFM](../concepts/sms-rfm) — the source format used inside `<rc-sms>`
- [Building programmatically](../building-programmatically) — constructing and converting documents
