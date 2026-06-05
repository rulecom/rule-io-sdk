# API Keys

API keys authenticate your application's requests to Rule.io. You can create multiple keys — one per environment or integration — and rotate them without downtime by creating a new key before deleting the old one.

## Listing existing keys

```typescript
const keys = await client.apiKeys.list();

for (const key of keys) {
  console.log(key.id, key.name);
}
```

Listing returns key metadata (ID and name). The actual key value is only returned at creation time.

## Creating a new key

```typescript
const key = await client.apiKeys.create({ name: 'Production' });
const keyId = key.id;
const keyValue = key.key;  // save this — it won't be shown again
```

Key names can be up to 255 characters. Use descriptive names that identify the environment or service: `'Production'`, `'Staging'`, `'Shopify Integration'`.

> **The key value is only returned once.** Store it securely immediately — you cannot retrieve it again from the API.

*→ [`CreateApiKeyPayload`](/api/client/src/interfaces/CreateApiKeyPayload)*

## Renaming a key

```typescript
await client.apiKeys.update(keyId, { name: 'Production v2' });
```

*→ [`UpdateApiKeyPayload`](/api/client/src/interfaces/UpdateApiKeyPayload)*

## Rotating a key

Create the new key first, update your environment with the new value, then delete the old key:

```typescript
// 1. Create the replacement
const newKey = await client.apiKeys.create({ name: 'Production 2025' });

// 2. Update your environment variable with newKey.key

// 3. Delete the old key
await client.apiKeys.delete(oldKeyId);
```

## Deleting a key

```typescript
await client.apiKeys.delete(keyId);
```

Deleted keys stop working immediately. Make sure the key is no longer in use before deleting.
