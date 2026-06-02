# Blocking and Unblocking Subscribers

Blocking prevents a subscriber from receiving any emails. Use it when processing unsubscribe requests, suppressing opted-out contacts, or responding to spam complaints.

Blocking is not the same as deletion — the subscriber record remains and can be unblocked later.

## Blocking

Pass an array of subscriber identifiers to `block()`. All identifier forms are supported:

```typescript
await client.subscribers.block([
  { email: 'opt-out@example.com' },
  { id: 1042 },
  { phoneNumber: '+46701234567' },
  { customIdentifier: 'ext-user-123' },
]);
```

To receive a webhook notification when the operation completes, pass a `callbackUrl`:

```typescript
await client.subscribers.block(
  [{ email: 'opt-out@example.com' }],
  { callbackUrl: 'https://yourapp.com/webhooks/rule' },
);
```

## Unblocking

```typescript
await client.subscribers.unblock([
  { email: 'opt-in@example.com' },
  { id: 1042 },
  { phoneNumber: '+46701234567' },
  { customIdentifier: 'ext-user-123' },
]);
```

To receive a webhook notification when unblocking completes:

```typescript
await client.subscribers.unblock(
  [{ email: 'opt-in@example.com' }],
  { callbackUrl: 'https://yourapp.com/webhooks/rule' },
);
```

## Asynchronous behaviour

`block()` and `unblock()` are asynchronous — Rule.io accepts the request immediately and processes it in the background. See [Asynchronous Operations](./async-operations) for details.

## Subscriber identifiers

For a full description of the four identifier forms (`email`, `id`, `phoneNumber`, `customIdentifier`), see [Subscriber Identifiers](./subscriber-identifiers).

## Next steps

- Suppress contacts permanently for compliance: [Managing Suppressions](./managing-suppressions)
- Set up automatic tag assignment on events: [Setting Up Automations](./setting-up-automations)
