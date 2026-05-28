# Managing Suppressions

Suppressions prevent Rule.io from sending emails to specific subscribers. Use them to honour opt-out requests, comply with unsubscribe workflows, or block specific addresses from receiving certain message types.

Suppression operations run **asynchronously** — the API returns immediately and processes the list in the background. Pass a `callback_url` if you need confirmation when processing is complete.

## Suppressing subscribers

```typescript
await client.suppressions.create({
  subscribers: [
    { email: 'opted-out@example.com' },
    { email: 'complaint@example.com' },
    { phone_number: '+46701234567' },
  ],
});
```

Up to 1000 subscribers can be included in a single request.

### Limiting suppression to a message type

By default, suppressions apply to all message types. To suppress only for specific channels:

```typescript
await client.suppressions.create({
  subscribers: [{ email: 'opted-out@example.com' }],
  message_types: ['email'],  // only suppress email, not SMS
});
```

### Using a callback URL

```typescript
await client.suppressions.create({
  subscribers: [{ email: 'opted-out@example.com' }],
  callback_url: 'https://your-app.com/webhooks/suppression-done',
});
```

Rule.io will POST to this URL when the suppression is applied.

*→ [`RuleSuppressionRequest`](/api/client/src/interfaces/RuleSuppressionRequest) · [`RuleSuppressionSubscriberIdentifier`](/api/client/src/interfaces/RuleSuppressionSubscriberIdentifier)*

## Removing suppressions (reactivation)

To allow emails to a previously suppressed subscriber again:

```typescript
await client.suppressions.delete({
  subscribers: [
    { email: 'resubscribed@example.com' },
  ],
});
```

The same `message_types` and `callback_url` options are available on `delete()`.

## Next steps

- Bulk block subscribers without suppressing them: [Bulk Operations](./bulk-operations)
- Export subscriber data for audit: [Exporting Data](./exporting-data)
