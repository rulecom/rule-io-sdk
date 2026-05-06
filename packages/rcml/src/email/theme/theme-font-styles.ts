/**
 * Internal factory helper for {@link EmailTheme.fontStyles}. Used by
 * `create-theme.ts` to apply the `fontStyles` bucket of an
 * {@link EmailThemePatch}.
 *
 * @internal
 */

import type { EmailTheme, EmailThemeFontStyle } from '../theme-types.js'
import { EmailThemeFontStyleType } from '../theme-types.js'
import { DEFAULT_FONT_STYLES_MAP } from '../theme-defaults.js'
import { deepClone } from './utils.js'

const FONT_STYLE_ORDER: readonly EmailThemeFontStyleType[] = [
  EmailThemeFontStyleType.Paragraph,
  EmailThemeFontStyleType.H1,
  EmailThemeFontStyleType.H2,
  EmailThemeFontStyleType.H3,
  EmailThemeFontStyleType.H4,
  EmailThemeFontStyleType.ButtonLabel,
]

/**
 * Return a new theme whose `fontStyles` bucket is built by cloning
 * {@link DEFAULT_FONT_STYLES_MAP} and merging each override into its slot.
 * Each override is keyed by its `type`; fields the override does not
 * mention fall back to the default for that slot — so
 * `{ type: H1, color: '#F00' }` changes only the colour and leaves H1's
 * default size/weight/family intact. Slot types the caller does not
 * mention stay at their default; overrides whose `type` is missing or is
 * not one of the six {@link EmailThemeFontStyleType} values are dropped
 * silently.
 *
 * @param theme      - Base theme to copy; left untouched.
 * @param fontStyles - Per-slot partial overrides. Pass `[]` to reset
 *                     every slot back to its default.
 * @returns          A fresh {@link EmailTheme} with a new `fontStyles`
 *                   map.
 *
 * @internal
 */
export function resetFontStylesTo(
  theme: EmailTheme,
  fontStyles: Partial<EmailThemeFontStyle>[]
): EmailTheme {
  const next: Record<EmailThemeFontStyleType, EmailThemeFontStyle> = deepClone(
    DEFAULT_FONT_STYLES_MAP
  )

  for (const partial of fontStyles) {
    const type = partial.type

    if (type === undefined || !FONT_STYLE_ORDER.includes(type)) continue

    next[type] = { ...next[type], ...partial, type }
  }

  return { ...theme, fontStyles: next }
}
