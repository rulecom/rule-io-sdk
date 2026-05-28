# Brand Styles

Brand styles define the visual identity of your emails — logo, colours, fonts, and social links. When using the high-level helpers with `brandStyleId`, the SDK auto-builds a branded template for you. If you provide your own `template` instead, a brand style isn't required.

## Resolving the account's default brand style

List all brand styles and pick the one flagged `is_default`. Never hardcode brand style IDs — a customer's preferred style can change and list order is not guaranteed:

```typescript
const styles = await client.listBrandStyles();
const defaultStyle = styles.data?.find(s => s.is_default) ?? styles.data?.[0];
const brandStyleId = defaultStyle?.id;
```

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
const styles = await client.listBrandStyles();
const brandStyleId = styles.data![0]!.id!;

const style = await client.getBrandStyle(brandStyleId);
await client.updateBrandStyle(brandStyleId, { name: 'Updated Brand' });
await client.deleteBrandStyle(brandStyleId);
```

## Next steps

Use the brand style ID as input to the [template builders](/packages/rcml/) or pass `brandStyleId` to `client.createCampaignEmail()` / `client.createAutomationEmail()`.
