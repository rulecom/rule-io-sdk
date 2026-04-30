/**
 * Internal factory helper for {@link EmailTheme.colors}. Used by
 * `create-theme.ts` to apply the `colors` bucket of an
 * {@link EmailThemePatch}.
 *
 * @internal
 */

import type { EmailTheme, EmailThemeColor } from '../theme-types.js'
import { EmailThemeColorType } from '../theme-types.js'
import { DEFAULT_COLORS_MAP } from '../theme-defaults.js'
import { deepClone } from './utils.js'

const COLOR_ORDER: readonly EmailThemeColorType[] = [
  EmailThemeColorType.Body,
  EmailThemeColorType.Primary,
  EmailThemeColorType.Secondary,
  EmailThemeColorType.Background,
]

/**
 * Return a new theme whose `colors` bucket is built by cloning
 * {@link DEFAULT_COLORS_MAP} and overlaying each entry in `colors` keyed by
 * its `type`. Slot types not present in `colors` keep the default value;
 * entries whose `type` is not one of the four known
 * {@link EmailThemeColorType} values are dropped silently. Each provided
 * entry is shallow-copied into the result so the caller can keep mutating
 * `colors` afterwards without affecting the returned theme.
 *
 * @param theme  - Base theme to copy; left untouched.
 * @param colors - Per-type colour overrides applied on top of the defaults.
 *                 Pass `[]` to reset every slot back to its default.
 * @returns      A fresh {@link EmailTheme} with a new `colors` map.
 *
 * @internal
 */
export function resetColorsTo(theme: EmailTheme, colors: EmailThemeColor[]): EmailTheme {
  const next: Partial<Record<EmailThemeColorType, EmailThemeColor>> = deepClone(DEFAULT_COLORS_MAP)

  for (const color of colors) {
    if (COLOR_ORDER.includes(color.type)) {
      next[color.type] = { ...color }
    }
  }

  return { ...theme, colors: next }
}
