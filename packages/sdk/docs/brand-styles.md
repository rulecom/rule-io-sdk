# Brand Styles

Brand styles define the visual identity of your emails — logo, colours, fonts, and social links. When using the high-level helpers with `brandStyleId`, the SDK auto-builds a branded template for you. If you provide your own `template` instead, a brand style isn't required.

## Resolving the account's default brand style

Use `resolvePreferredBrandStyle()` so each account's preferred style (the one flagged `is_default`) is respected. Never hardcode brand style IDs — a customer's preferred style can change and list order is not guaranteed:

```typescript
import { resolvePreferredBrandStyle } from '@rulecom/sdk';
import type { CustomFieldMap } from '@rulecom/sdk';

const { id: brandStyleId, brandStyle: myBrand, source } =
  await resolvePreferredBrandStyle(client);

if (source === 'fallback') {
  console.warn('No is_default brand style — using first in list');
}

// Map your Rule.io custom field IDs (from GET /api/v2/customizations)
const myFields: CustomFieldMap = {
  'Order.CustomerName': 169233,
  'Order.OrderRef': 169234,
  'Order.Total': 169235,
};
```

If you need to target a specific style (e.g. from a CLI flag or env var), pass the ID as the second argument: `resolvePreferredBrandStyle(client, 12345)`.

## Creating brand styles

```typescript
// Auto-detect from your domain
const fromDomain = await client.createBrandStyleFromDomain({ domain: 'example.com' });
const brandStyleId = fromDomain.data!.id!;

// Create manually
const manualBrand = await client.createBrandStyleManually({
  name: 'My Brand',
  colours: [{ type: 'accent', hex: '#0066CC', brightness: 50 }],
  fonts: [{ type: 'title', name: 'Helvetica', origin: 'system' }],
});
```

You can also manage brand styles in the Rule.io UI under **Settings → Brand**.

## Low-level CRUD

```typescript
import { resolvePreferredBrandStyle } from '@rulecom/sdk';

const styles = await client.listBrandStyles();
const style = await client.getBrandStyle(styleId);
await client.updateBrandStyle(styleId, { name: 'Updated Brand' });
await client.deleteBrandStyle(styleId);

// Direct lookup when you already know the ID
const { brandStyle } = await client.getBrandStyle(id);
```

## Next steps

Use `myBrand` and `myFields` from this guide as inputs to the [template builders](./templates) or pass `brandStyleId` to [createCampaignEmail / createAutomationEmail](./sending-emails).
