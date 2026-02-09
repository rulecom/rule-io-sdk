# Rule.io API Reference

Reference documentation for the Rule.io APIs used by this SDK.

## API Versions

- **v2** (`https://app.rule.io/api/v2`) — Subscriber management, tags
- **v3** (`https://app.rule.io/api/v3`) — Editor API (automails, messages, templates, dynamic sets)

## Authentication

All endpoints use Bearer token authentication:

```
Authorization: Bearer {api_key}
```

---

## v2 Subscriber API

### Create/Update Subscriber

```
POST /api/v2/subscribers
```

**Quirk**: Tags go at top level, subscribers is an object (not array):

```json
{
  "update_on_duplicate": true,
  "tags": ["tag-name"],
  "subscribers": {
    "email": "user@example.com",
    "fields": [
      { "key": "GroupName.FieldName", "value": "value" }
    ]
  }
}
```

### Add Tags

```
POST /api/v2/subscribers/{email}/tags?identified_by=email
```

```json
{
  "tags": ["new-tag"],
  "automation": "force"
}
```

Automation parameter: `"force"` (always trigger), `"reset"` (re-trigger with delay reset), or omit (don't trigger).

### Remove Tags

```
DELETE /api/v2/subscribers/{email}/tags/{tag}?identified_by=email
```

### Get Subscriber Fields

**Quirk**: Uses singular `/subscriber/` (not `/subscribers/`):

```
GET /api/v2/subscriber/{email}/fields?identified_by=email
```

Returns grouped fields:

```json
{
  "groups": [
    {
      "name": "Booking",
      "fields": [
        { "name": "FirstName", "value": "Anna" }
      ]
    }
  ]
}
```

### Get Tags

```
GET /api/v2/tags
```

Returns all tags with their IDs (needed for automation triggers).

---

## v3 Editor API

### Known Quirks

1. **Trigger type must be UPPERCASE**: Use `"TAG"` or `"SEGMENT"`, not lowercase. The API error message incorrectly suggests lowercase.

2. **Two-step automail creation**: Cannot set trigger and sendout_type during creation. Must create first, then update:
   - `POST /editor/automail` (create)
   - `PUT /editor/automail/{id}` (add trigger + sendout_type)

3. **Template names must be unique**: The API rejects duplicate names. Add a timestamp to avoid conflicts.

4. **Tag ID required for triggers**: Automail triggers use tag ID (number), not tag name (string). Look up IDs via `GET /api/v2/tags`.

5. **Content-Type charset**: v3 endpoints require `Content-Type: application/json;charset=utf-8`.

### Automail (Automation Workflows)

```
POST   /api/v3/editor/automail          # Create
GET    /api/v3/editor/automail/{id}      # Read
PUT    /api/v3/editor/automail/{id}      # Update (set trigger here)
DELETE /api/v3/editor/automail/{id}      # Delete
```

### Message (Email Metadata)

```
POST   /api/v3/editor/message           # Create
GET    /api/v3/editor/message/{id}       # Read
PUT    /api/v3/editor/message/{id}       # Update
DELETE /api/v3/editor/message/{id}       # Delete
```

### Template (RCML Content)

```
POST   /api/v3/editor/template          # Create
GET    /api/v3/editor/template/{id}      # Read
PUT    /api/v3/editor/template/{id}      # Update
DELETE /api/v3/editor/template/{id}      # Delete
```

### Dynamic Set (Message ↔ Template Link)

```
POST   /api/v3/editor/dynamic-set       # Create
GET    /api/v3/editor/dynamic-set/{id}   # Read
DELETE /api/v3/editor/dynamic-set/{id}   # Delete
```

---

## Complete Automation Setup Flow

Creating a full automation requires four steps:

1. **Create automail** → get `automailId`
2. **Update automail** with trigger (tag ID, uppercase type) and sendout_type
3. **Create message** linked to automail → get `messageId`
4. **Create template** linked to message → get `templateId`
5. **Create dynamic set** linking message and template

The SDK's `createAutomationEmail()` helper handles all five steps with automatic cleanup on failure.

---

## Error Handling

| Status | Meaning | SDK Handling |
|--------|---------|-------------|
| 401 | Invalid API key | `RuleApiError` with `isAuthError()` |
| 404 | Not found | Returns `null` for get methods |
| 429 | Rate limited | `RuleApiError` with `isRateLimited()` |
| 5xx | Server error | `RuleApiError` with status code |

---

## Custom Fields

Fields are grouped. The SDK uses a configurable group prefix (default: `"Booking"`):

```
GroupName.FieldName → e.g., "Booking.FirstName"
```

In Rule.io templates, reference as merge tags:

```
Hello {{Booking.FirstName}}, your order {{Booking.OrderRef}} is confirmed!
```
