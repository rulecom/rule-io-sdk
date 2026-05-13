/**
 * Theme type surface for `@rulecom/rcml` — re-exports the canonical
 * definitions from `@rulecom/core`. The types live in core so base-layer
 * types like `VendorConsumerConfig` can reference {@link EmailTheme}
 * without creating a core → rcml dependency cycle.
 *
 * The `applyTheme` / `createEmailTheme` / `getTheme` runtime that
 * operates on these types stays in `@rulecom/rcml`.
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
} from '@rulecom/core'
export {
  EmailThemeColorType,
  EmailThemeFontStyleType,
  EmailThemeImageType,
} from '@rulecom/core'
