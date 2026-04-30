/**
 * Theme type surface for `@rule-io/rcml` — re-exports the canonical
 * definitions from `@rule-io/core`. The types live in core so base-layer
 * types like `VendorConsumerConfig` can reference {@link EmailTheme}
 * without creating a core → rcml dependency cycle.
 *
 * The `applyTheme` / `createEmailTheme` / `getTheme` runtime that
 * operates on these types stays in `@rule-io/rcml`.
 *
 * @public
 */

export type {
  EmailTheme,
  EmailThemeBrandStyleId,
  EmailThemeColor,
  EmailThemeFont,
  EmailThemeFontStyle,
  EmailThemeImage,
  EmailThemePatch,
  EmailThemeSocialLink,
  EmailThemeSocialLinkType,
} from '@rule-io/core'
export {
  EmailThemeColorType,
  EmailThemeFontStyleType,
  EmailThemeImageType,
} from '@rule-io/core'
