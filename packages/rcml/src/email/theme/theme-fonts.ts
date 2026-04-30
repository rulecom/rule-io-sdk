/**
 * Internal factory helper for {@link EmailTheme.fonts}. Used by
 * `create-theme.ts` to apply the `fonts` bucket of an
 * {@link EmailThemePatch}.
 *
 * @internal
 */

import type { EmailTheme, EmailThemeFont } from '../theme-types.js'

/**
 * Return a new theme whose `fonts` array contains exactly the provided
 * entries — no defaults are carried over. Each entry is shallow-copied
 * into the result so later mutation of the source array is safe.
 *
 * @param theme - Base theme to copy; left untouched.
 * @param fonts - The new fonts list (in the order the renderer should see
 *                it). Pass `[]` to remove every font registration.
 * @returns     A fresh {@link EmailTheme} with a new `fonts` array.
 *
 * @internal
 */
export function replaceFonts(theme: EmailTheme, fonts: EmailThemeFont[]): EmailTheme {
  return { ...theme, fonts: fonts.map((f) => ({ ...f })) }
}
