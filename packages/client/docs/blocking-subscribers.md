# Blocking and Unblocking Subscribers

Blocking prevents a subscriber from receiving any emails. Use it when processing unsubscribe requests, suppressing opted-out contacts, or responding to spam complaints.

Blocking is not the same as deletion — the subscriber record remains and can be unblocked later.

## Blocking subscribers

Pass an array of subscriber identifiers. All standard identifier types are supported: email, phone number, numeric ID, and custom identifier.

```typescript
await client.subscribers.block([
  { email: 'opt-out@example.com' },
  { phoneNumber: '+46701234567' },
  { id: 1042 },
]);
```

To receive a webhook notification when the operation completes:

```typescript
await client.subscribers.block(
  [{ email: 'opt-out@example.com' }],
  { callbackUrl: 'https://yourapp.com/webhooks/rule' },
);
```

## Unblocking subscribers

```typescript
await client.subscribers.unblock([
  { email: 'opt-in@example.com' },
]);
```

Both `block()` and `unblock()` are asynchronous — the API accepts the request immediately and processes it in the background. See [Asynchronous Operations](./async-operations) for details.

## Next steps

- Suppress contacts permanently for compliance: [Managing Suppressions](./managing-suppressions)
- Set up automatic tag assignment on events: [Setting Up Automations](./setting-up-automations)
