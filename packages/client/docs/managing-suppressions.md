# Managing Suppressions

Suppressions prevent Rule.io from sending marketing emails or SMS to specific subscribers. Use them to honour opt-out requests, comply with unsubscribe workflows, or exclude addresses from specific channels.

This is different from [blocking](./blocking-subscribers.md) — blocking prevents a subscriber from receiving any emails; suppressions are channel-specific and reversible.

All suppression operations are **asynchronous** (see [Asynchronous Operations](./async-operations)). Up to 1000 subscribers can be included in a single request.

## Suppressing subscribers

`suppressSubscribers(subscribers, messageTypes?, opts?)` accepts an optional `messageTypes` argument that controls which channels are suppressed. Omit it to suppress all channels; pass `['email']` or `['text_message']` to suppress one channel only.

```typescript
// Suppress all channels (email + SMS)
await client.subscribers.suppressSubscribers([
  { email: 'opted-out@example.com' },
  { email: 'complaint@example.com' },
  { phoneNumber: '+46701234567' },
]);

// Suppress email channel only
await client.subscribers.suppressSubscribers(
  [{ email: 'no-email@example.com' }],
  ['email'],
);

// Suppress SMS channel only
await client.subscribers.suppressSubscribers(
  [{ phoneNumber: '+46701234567' }],
  ['text_message'],
);
```

For a single subscriber, use `suppressSubscriber(subscriber, messageTypes?, opts?)`:

```typescript
// All channels
await client.subscribers.suppressSubscriber({ email: 'opted-out@example.com' });

// Email only
await client.subscribers.suppressSubscriber({ email: 'opted-out@example.com' }, ['email']);
```

Already-suppressed subscribers are silently skipped — the operation is idempotent.

## Focused suppress methods

For the most common cases, named shortcut methods are available. These are equivalent to passing the specific `messageTypes` value to `suppressSubscribers`:

```typescript
// Email channel only
await client.subscribers.suppressEmailsForSubscribers([{ email: 'no-email@example.com' }]);
await client.subscribers.suppressEmailsForSubscriber({ email: 'no-email@example.com' });

// SMS channel only
await client.subscribers.suppressSmsForSubscribers([{ phoneNumber: '+46701234567' }]);
await client.subscribers.suppressSmsForSubscriber({ phoneNumber: '+46701234567' });
```

## Removing suppressions

`unsuppressSubscribers(subscribers, messageTypes?, opts?)` follows the same pattern. Omit `messageTypes` to remove all channel suppressions; pass a specific channel to remove only that one.

```typescript
// Remove all suppressions
await client.subscribers.unsuppressSubscribers([
  { email: 'resubscribed@example.com' },
]);

// Remove email suppression only (SMS suppression remains)
await client.subscribers.unsuppressSubscribers(
  [{ email: 'resubscribed@example.com' }],
  ['email'],
);
```

For a single subscriber, use `unsuppressSubscriber(subscriber, messageTypes?, opts?)`:

```typescript
// Remove all suppressions
await client.subscribers.unsuppressSubscriber({ email: 'resubscribed@example.com' });

// Remove SMS suppression only
await client.subscribers.unsuppressSubscriber({ phoneNumber: '+46701234567' }, ['text_message']);
```

## Focused unsuppress methods

Named shortcuts are available for the common cases:

```typescript
// Email channel only
await client.subscribers.unsuppressEmailsForSubscribers([{ email: 'resubscribed@example.com' }]);
await client.subscribers.unsuppressEmailsForSubscriber({ email: 'resubscribed@example.com' });

// SMS channel only
await client.subscribers.unsuppressSmsForSubscribers([{ phoneNumber: '+46701234567' }]);
await client.subscribers.unsuppressSmsForSubscriber({ phoneNumber: '+46701234567' });
```

## Async notifications

Pass a `callbackUrl` on any suppression or unsuppression method to receive a webhook notification when Rule.io finishes processing. This is useful when suppressing large lists.

```typescript
await client.subscribers.suppressSubscribers(
  [{ email: 'opted-out@example.com' }, { email: 'complaint@example.com' }],
  undefined,          // suppress all channels
  { callbackUrl: 'https://your-app.com/webhooks/suppression-done' },
);
```

Rule.io will call the URL via GET when the operation completes. See [Asynchronous Operations](./async-operations) for details.

## Next steps

- Block subscribers from receiving any emails: [Blocking Subscribers](./blocking-subscribers)
- Export subscriber data for audit: [Exporting Data](./exporting-data)
