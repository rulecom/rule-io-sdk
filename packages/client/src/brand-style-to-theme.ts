/**
 * Bridge between the Rule.io brand-style API and the rcml email-theme
 * abstraction.
 *
 * {@link emailThemeFromBrandStyle} converts a {@link RuleBrandStyle} response
 * directly into an {@link EmailTheme} ready for {@link applyTheme}.
 *
 * This replaces the need to go through the legacy `BrandStyleConfig`
 * intermediate — see `brand-template.ts` — when callers want the
 * theme-based API instead.
 *
 * @public
 */

import {
  DEFAULT_FALLBACK_FONT_FAMILIES_MAP,
  DefaultFontFamily,
  type EmailTheme,
  EmailThemeColorType,
  EmailThemeFontStyleType,
  EmailThemeImageType,
  createEmailTheme,
} from '@rule-io/rcml';
import type {
  EmailThemeColor,
  EmailThemeFont,
  EmailThemeFontStyle,
  EmailThemeImage,
  EmailThemeSocialLink,
  EmailThemeSocialLinkType,
} from '@rule-io/rcml';

import type {
  RuleBrandStyle,
  RuleBrandStyleColour,
  RuleBrandStyleColourType,
  RuleBrandStyleFont,
  RuleBrandStyleImage,
  RuleBrandStyleLink,
  RuleBrandStyleLinkType,
} from './types.js';

/**
 * Map Rule.io colour roles onto the four theme-colour slots. The `dark`
 * colour is handled separately (applied to every font-style's `color`) and
 * does not appear here.
 */
const COLOUR_TYPE_TO_THEME_COLOR: Partial<
  Record<RuleBrandStyleColourType, EmailThemeColorType>
> = {
  brand: EmailThemeColorType.Secondary,
  accent: EmailThemeColorType.Primary,
  light: EmailThemeColorType.Body,
  side: EmailThemeColorType.Background,
};

/**
 * Map Rule.io social-link types onto the six theme social slots. Types
 * with no theme slot (e.g. `github`, `youtube`) are dropped.
 */
const LINK_TYPE_TO_THEME_LINK: Partial<
  Record<RuleBrandStyleLinkType, EmailThemeSocialLinkType>
> = {
  facebook: 'facebook',
  instagram: 'instagram',
  linkedin: 'linkedin',
  tiktok: 'tiktok',
  twitter: 'x',
  website: 'website',
};

/**
 * Build an {@link EmailTheme} directly from a Rule.io brand-style API
 * response. Unknown colour/link/image types and fonts without a usable
 * name are silently dropped so a partial brand style produces a partial
 * theme rather than throwing.
 *
 * @public
 */
export function emailThemeFromBrandStyle(brandStyle: RuleBrandStyle): EmailTheme {
  const { colors, fontColorHex } = splitColours(brandStyle.colours ?? []);
  const { fonts, fontStyles } = mapFonts(brandStyle.fonts ?? [], fontColorHex);

  return createEmailTheme({
    brandStyleId: brandStyle.id,
    colors,
    links: mapLinks(brandStyle.links ?? []),
    images: mapImages(brandStyle.images ?? []),
    fonts,
    fontStyles,
  });
}

function splitColours(brandColours: RuleBrandStyleColour[]): {
  colors: EmailThemeColor[];
  fontColorHex: string | undefined;
} {
  const colors: EmailThemeColor[] = [];
  let fontColorHex: string | undefined;

  for (const colour of brandColours) {
    if (colour.type === 'dark') {
      fontColorHex = colour.hex;
      continue;
    }

    const themeType = COLOUR_TYPE_TO_THEME_COLOR[colour.type];

    if (themeType !== undefined) {
      colors.push({ type: themeType, hex: colour.hex });
    }
  }

  return { colors, fontColorHex };
}

function mapLinks(brandLinks: RuleBrandStyleLink[]): EmailThemeSocialLink[] {
  const out: EmailThemeSocialLink[] = [];

  for (const link of brandLinks) {
    const themeType = LINK_TYPE_TO_THEME_LINK[link.type];

    if (themeType !== undefined) {
      out.push({ type: themeType, url: link.link });
    }
  }

  return out;
}

function mapImages(brandImages: RuleBrandStyleImage[]): EmailThemeImage[] {
  const out: EmailThemeImage[] = [];

  for (const image of brandImages) {
    if (image.type === 'logo' && typeof image.public_path === 'string' && image.public_path !== '') {
      out.push({ type: EmailThemeImageType.Logo, url: image.public_path });
    }
  }

  return out;
}

function mapFonts(
  brandFonts: RuleBrandStyleFont[],
  fontColorHex: string | undefined
): {
  fonts: EmailThemeFont[];
  fontStyles: Partial<EmailThemeFontStyle>[];
} {
  const fonts: EmailThemeFont[] = [];
  const fontStyles: Partial<EmailThemeFontStyle>[] = [];

  const titleFont = brandFonts.find((f) => f.type === 'title');
  const bodyFont = brandFonts.find((f) => f.type === 'body');

  const helveticaFallback = DEFAULT_FALLBACK_FONT_FAMILIES_MAP[DefaultFontFamily.Helvetica];

  if (titleFont) {
    const fontFamily = fontFamilyFrom(titleFont);

    if (fontFamily) {
      fonts.push({ fontFamily, ...(titleFont.url ? { url: titleFont.url } : {}) });
    }
  }

  if (titleFont || fontColorHex !== undefined) {
    const titleFamily = titleFont ? fontFamilyFrom(titleFont) : undefined;

    for (const type of [
      EmailThemeFontStyleType.H1,
      EmailThemeFontStyleType.H2,
      EmailThemeFontStyleType.H3,
      EmailThemeFontStyleType.H4,
    ]) {
      fontStyles.push({
        type,
        ...(titleFamily ? { fontFamily: titleFamily, fallbackFontFamily: helveticaFallback } : {}),
        ...(fontColorHex !== undefined ? { color: fontColorHex } : {}),
      });
    }
  }

  if (bodyFont) {
    const fontFamily = fontFamilyFrom(bodyFont);

    if (fontFamily) {
      fonts.push({ fontFamily, ...(bodyFont.url ? { url: bodyFont.url } : {}) });
    }
  }

  if (bodyFont || fontColorHex !== undefined) {
    const bodyFamily = bodyFont ? fontFamilyFrom(bodyFont) : undefined;

    fontStyles.push({
      type: EmailThemeFontStyleType.Paragraph,
      ...(bodyFamily ? { fontFamily: bodyFamily, fallbackFontFamily: helveticaFallback } : {}),
      ...(fontColorHex !== undefined ? { color: fontColorHex } : {}),
    });
    fontStyles.push({
      type: EmailThemeFontStyleType.ButtonLabel,
      ...(bodyFamily ? { fontFamily: bodyFamily, fallbackFontFamily: helveticaFallback } : {}),
      // ButtonLabel keeps its default colour (#FFFFFF) unless the caller
      // overrides it — dark text on the accent-coloured button would usually
      // be unreadable.
    });
  }

  return { fonts, fontStyles };
}

function fontFamilyFrom(font: RuleBrandStyleFont): string | undefined {
  const name = font.origin_name ?? font.name;

  if (typeof name !== 'string' || name === '') return undefined;

  return name;
}
