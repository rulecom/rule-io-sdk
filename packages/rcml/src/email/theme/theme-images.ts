/**
 * Internal factory helper for {@link EmailTheme.images}. Used by
 * `create-theme.ts` to apply the `images` bucket of an
 * {@link EmailThemePatch}.
 *
 * @internal
 */

import type { EmailTheme, EmailThemeImage } from '../theme-types.js'
import { EmailThemeImageType } from '../theme-types.js'

const IMAGE_ORDER: readonly EmailThemeImageType[] = [EmailThemeImageType.Logo]

/**
 * Return a new theme whose `images` map contains exactly the provided
 * entries — no defaults are carried over. Each entry is rewritten as
 * `{ type, url }` into the result keyed by `type`; entries whose `type`
 * is not one of the known {@link EmailThemeImageType} values are dropped
 * silently. An empty array clears all images.
 *
 * @param theme  - Base theme to copy; left untouched.
 * @param images - The new image set. Pass `[]` to clear the map.
 * @returns      A fresh {@link EmailTheme} with a new `images` map.
 *
 * @internal
 */
export function replaceImages(theme: EmailTheme, images: EmailThemeImage[]): EmailTheme {
  const next: Partial<Record<EmailThemeImageType, EmailThemeImage>> = {}

  for (const image of images) {
    if (IMAGE_ORDER.includes(image.type)) {
      next[image.type] = { type: image.type, url: image.url }
    }
  }

  return { ...theme, images: next }
}
