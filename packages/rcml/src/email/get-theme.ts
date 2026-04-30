/**
 * Public entry point for reading the {@link EmailTheme} encoded in an
 * rcml document.
 *
 * The inverse of {@link import('./apply-theme.js').applyTheme}. Internal
 * per-bucket extractors live in `./theme/theme-rcml.ts`; this file's job
 * is orchestrating them and merging the results with the theme defaults
 * so the caller always gets back a fully-populated {@link EmailTheme}.
 */

import type { RcmlDocument } from './rcml-types.js'
import type {
  EmailTheme,
  EmailThemeBrandStyleId,
} from './theme-types.js'
import {
  DEFAULT_COLORS_MAP,
  DEFAULT_FONT_STYLES_MAP,
  DEFAULT_LINKS_MAP,
} from './theme-defaults.js'
import {
  type AnyAttrChild,
  extractBrandStyleIdFromHead,
  extractColorsFromAttributes,
  extractFontStylesFromAttributes,
  extractFontsFromHead,
  extractImagesFromAttributes,
  extractLinksFromAttributes,
  findAttributesInHead,
} from './theme/theme-rcml.js'

/**
 * Extract the {@link EmailTheme} encoded in an rcml document's head.
 *
 * Walks `<rc-head>` / `<rc-attributes>` and reads back every theme-
 * controlled node (brand-style id, body/section/button backgrounds,
 * brand-color / logo / font-style classes, social block, `<rc-font>`
 * children). Missing fields fall back to the defaults from
 * `theme-defaults.ts`, so the return value is always a full
 * {@link EmailTheme} — safe to pass to
 * {@link import('./apply-theme.js').applyTheme} or any other consumer.
 *
 * A bare doc with no theme returns the same shape as
 * {@link import('./create-theme.js').createEmailTheme}(). Unknown or
 * malformed rcml nodes are ignored silently; nodes that look right but
 * are missing required attributes are skipped. Input is not mutated.
 *
 * @param doc - The rcml document to inspect.
 * @returns   A fully-populated {@link EmailTheme}. `brandStyleId` is
 *            omitted when the doc lacks `<rc-brand-style>`; every
 *            other field is always present, using defaults for any
 *            slot the doc doesn't cover.
 *
 * @public
 */
export function getTheme(doc: RcmlDocument): EmailTheme {
  const [head] = doc.children
  const attributes = findAttributesInHead(head)
  const attrChildren = (attributes?.children ?? []) as unknown as readonly AnyAttrChild[]

  const extractedColors = extractColorsFromAttributes(attrChildren)
  const extractedLinks = extractLinksFromAttributes(attrChildren)
  const extractedImages = extractImagesFromAttributes(attrChildren)
  const extractedFontStyles = extractFontStylesFromAttributes(attrChildren)
  const brandStyleId: EmailThemeBrandStyleId | undefined = extractBrandStyleIdFromHead(head)

  const theme: EmailTheme = {
    colors: { ...DEFAULT_COLORS_MAP, ...extractedColors },
    links: { ...DEFAULT_LINKS_MAP, ...extractedLinks },
    images: extractedImages,
    fonts: extractFontsFromHead(head),
    fontStyles: { ...DEFAULT_FONT_STYLES_MAP, ...extractedFontStyles },
  }

  return brandStyleId !== undefined ? { ...theme, brandStyleId } : theme
}
