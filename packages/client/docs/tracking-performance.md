# Tracking Email Performance

The analytics API gives you open, click, bounce, and other engagement metrics for your campaigns and automations. Use it to understand how individual sends are performing, or to get a broad view of account-wide activity over time.

## Getting account-wide statistics

Omit the `object_type` parameter to get aggregate metrics for all sends in a date range:

```typescript
const stats = await client.analytics.get({
  date_from: '2025-01-01',
  date_to: '2025-01-31',
});
```

Dates are required. The time portion is stripped automatically — `'2025-01-01T12:00:00Z'` is treated the same as `'2025-01-01'`.

*→ [`RuleAnalyticsResponse`](/api/client/src/interfaces/RuleAnalyticsResponse) · [`RuleAnalyticsStat`](/api/client/src/interfaces/RuleAnalyticsStat)*

## Getting metrics for specific campaigns

To drill into a specific campaign (or multiple campaigns), provide `object_type`, `object_ids`, and the `metrics` you want:

```typescript
const stats = await client.analytics.get({
  date_from: '2025-01-01',
  date_to: '2025-01-31',
  object_type: 'CAMPAIGN',
  object_ids: ['123', '456'],
  metrics: ['sent', 'open', 'click', 'hard_bounce', 'soft_bounce'],
});
```

When `object_type` is provided, both `object_ids` and `metrics` must be non-empty arrays.

*→ [`RuleAnalyticsFullQuery`](/api/client/src/interfaces/RuleAnalyticsFullQuery)*

## Getting metrics for automations

```typescript
const stats = await client.analytics.get({
  date_from: '2025-01-01',
  date_to: '2025-01-31',
  object_type: 'AUTOMAIL',
  object_ids: ['789'],
  metrics: ['sent', 'open', 'click'],
});
```

## Filtering by message type

Narrow results to a specific channel:

```typescript
const stats = await client.analytics.get({
  date_from: '2025-01-01',
  date_to: '2025-01-31',
  message_type: 1,  // 1 = email
});
```

## Available metrics

| Metric | Description |
|---|---|
| `sent` | Total emails delivered to the provider |
| `open` | Unique opens |
| `click` | Unique clicks |
| `hard_bounce` | Permanent delivery failures |
| `soft_bounce` | Temporary delivery failures |
| `unsubscribe` | Unsubscribe events |
| `spam` | Spam complaint reports |

The available metrics may vary by account plan. Check the API response for which metrics are populated for your account.

## Next steps

- For raw per-subscriber event data, use [Exporting Data](./exporting-data) (Enterprise)
- Review campaign setup: [Running Campaigns](./running-campaigns)
