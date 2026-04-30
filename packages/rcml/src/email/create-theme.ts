/**
 * Factory for {@link EmailTheme} — the single entry point for building a
 * theme from nothing or from a partial brand-style payload.
 *
 * The factory seeds every field with the defaults from `theme-defaults.ts`
 * and then, if a patch is supplied, applies each bucket using the per-
 * field updaters in `theme/` (`setBrandStyleId`, `resetColorsTo`,
 * `resetLinksTo`, `replaceImages`, `replaceFonts`, `resetFontStylesTo`).
 * Keeping construction and runtime-patching behind the same helpers means
 * whatever you build with the factory can also be produced at runtime via
 * {@link applyTheme}, and vice versa.
 *
 * Lives at the `email/` root to mirror {@link createRcmlElement} — both
 * are top-level constructors the rcml public surface exposes.
 */

import type {
  EmailThemePatch,
  EmailTheme,
} from './theme-types.js'
import {
  DEFAULT_COLORS_MAP,
  DEFAULT_FONT_STYLES_MAP,
  DEFAULT_LINKS_MAP,
} from './theme-defaults.js'
import { setBrandStyleId } from './theme/theme-brand-style-id.js'
import { resetColorsTo } from './theme/theme-colors.js'
import { resetLinksTo } from './theme/theme-links.js'
import { replaceImages } from './theme/theme-images.js'
import { replaceFonts } from './theme/theme-fonts.js'
import { resetFontStylesTo } from './theme/theme-font-styles.js'
import { deepClone } from './theme/utils.js'

/**
 * Build an {@link EmailTheme} seeded with the rcml defaults.
 *
 * Without an argument, the returned theme has every field populated with
 * the values from `theme-defaults.ts` (four colour slots, six default
 * social links, six default font-styles, no images, no fonts, no
 * brandStyleId).
 *
 * When `overrides` is provided, each bucket is applied on top of the
 * base theme with the same semantics as the corresponding updater:
 *
 * | Bucket         | Semantics                                                             |
 * |----------------|-----------------------------------------------------------------------|
 * | `brandStyleId` | Scalar set.                                                           |
 * | `colors`       | Reset to defaults, then overlay provided entries by `type`.           |
 * | `links`        | Reset to defaults, then overlay provided entries by `type`.           |
 * | `images`       | Full replace; empty array clears all images.                          |
 * | `fonts`        | Full replace; empty array removes every font registration.            |
 * | `fontStyles`   | Reset to defaults, then partial-merge each override into its slot.    |
 *
 * The returned object is a plain POJO — safe to `JSON.stringify`,
 * `structuredClone`, or snapshot in tests.
 *
 * @param overrides - Optional per-field values to apply on top of the
 *                    defaults.
 * @returns A fresh {@link EmailTheme}. The input is not mutated.
 *
 * @example
 * ```ts
 * // Defaults only.
 * const theme = createEmailTheme()
 *
 * // Brand style + a custom primary colour, everything else default.
 * const branded = createEmailTheme({
 *   brandStyleId: 99999,
 *   colors: [{ type: EmailThemeColorType.Primary, hex: '#FF0000' }],
 * })
 * ```
 *
 * @public
 */
export function createEmailTheme(overrides?: EmailThemePatch): EmailTheme {
  const base: EmailTheme = {
    colors: deepClone(DEFAULT_COLORS_MAP),
    links: deepClone(DEFAULT_LINKS_MAP),
    images: {},
    fonts: [],
    fontStyles: deepClone(DEFAULT_FONT_STYLES_MAP),
  }

  if (!overrides) {
    return base
  }

  let theme = base

  if (overrides.brandStyleId !== undefined) {
    theme = setBrandStyleId(theme, overrides.brandStyleId)
  }

  if (overrides.colors) {
    theme = resetColorsTo(theme, overrides.colors)
  }

  if (overrides.links) {
    theme = resetLinksTo(theme, overrides.links)
  }

  if (overrides.images) {
    theme = replaceImages(theme, overrides.images)
  }

  if (overrides.fonts) {
    theme = replaceFonts(theme, overrides.fonts)
  }

  if (overrides.fontStyles) {
    theme = resetFontStylesTo(theme, overrides.fontStyles)
  }

  return theme
}
