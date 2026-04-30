/**
 * Internal factory helper for {@link EmailTheme.brandStyleId}. Used by
 * `create-theme.ts` to apply the `brandStyleId` bucket of an
 * {@link EmailThemePatch}.
 *
 * @internal
 */

import type { EmailTheme, EmailThemeBrandStyleId } from '../theme-types.js'

/**
 * Return a new theme whose `brandStyleId` is set to `id`. The input theme
 * is not mutated; all other fields are carried across by shallow copy.
 *
 * @param theme - Base theme to copy; left untouched.
 * @param id    - Numeric brand-style id from the Rule.io API.
 * @returns     A fresh {@link EmailTheme} with the new `brandStyleId`.
 *
 * @internal
 */
export function setBrandStyleId(theme: EmailTheme, id: EmailThemeBrandStyleId): EmailTheme {
  return { ...theme, brandStyleId: id }
}
