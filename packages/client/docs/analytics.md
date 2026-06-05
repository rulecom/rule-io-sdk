# Analytics

The analytics API gives you open, click, bounce, and other engagement metrics for your campaigns and automations. Use it to understand how individual sends are performing, or to get a broad view of account-wide activity over time.

## Getting account-wide statistics

Omit the `objectType` parameter to get aggregate metrics for all sends in a date range:

```typescript
const result = await client.analytics.get({
  dateFrom: '2025-01-01',
  dateTo: '2025-01-31',
});
```

Dates are required. The time portion is stripped automatically — `'2025-01-01T12:00:00Z'` is treated the same as `'2025-01-01'`.

*→ [`AnalyticsResult`](/api/client/src/interfaces/AnalyticsResult) · [`AnalyticsStat`](/api/client/src/interfaces/AnalyticsStat)*

## Getting metrics for specific campaigns

To drill into a specific campaign (or multiple campaigns), provide `objectType`, `objectIds`, and the `metrics` you want:

```typescript
const result = await client.analytics.get({
  dateFrom: '2025-01-01',
  dateTo: '2025-01-31',
  objectType: 'CAMPAIGN',
  objectIds: ['123', '456'],
  metrics: ['sent', 'open_uniq', 'click_uniq', 'hard_bounce', 'soft_bounce'],
});
```

When `objectType` is provided, both `objectIds` and `metrics` must be non-empty arrays.

*→ [`AnalyticsQueryParams`](/api/client/src/interfaces/AnalyticsQueryParams)*

## Getting metrics for automations

```typescript
const result = await client.analytics.get({
  dateFrom: '2025-01-01',
  dateTo: '2025-01-31',
  objectType: 'AUTOMAIL',
  objectIds: ['789'],
  metrics: ['sent', 'open_uniq', 'click_uniq'],
});
```

## Filtering by message type

Narrow results to a specific channel:

```typescript
const result = await client.analytics.get({
  dateFrom: '2025-01-01',
  dateTo: '2025-01-31',
  messageType: 'email',
});
```

## Available metrics

| Metric | Description |
|---|---|
| `sent` | Total emails delivered to the provider |
| `delivered` | Successfully delivered to the recipient |
| `open` | Total opens |
| `open_uniq` | Unique opens |
| `click` | Total clicks |
| `click_uniq` | Unique clicks |
| `total_bounce` | All delivery failures combined |
| `hard_bounce` | Permanent delivery failures |
| `soft_bounce` | Temporary delivery failures |
| `unsubscribe` | Unsubscribe events |
| `spam` | Spam complaint reports |

The available metrics may vary by account plan. Check the API response for which metrics are populated for your account.

## Next steps

- For raw per-subscriber event data, use [Exporting Data](./exporting-data) (Enterprise)
- Review campaign setup: [Running Campaigns](./running-campaigns)
