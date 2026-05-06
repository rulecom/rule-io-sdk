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

import { RuleConfigError, sanitizeUrl } from '@rule-io/core';
import type {
  RuleBrandStyle,
  RuleBrandStyleColour,
  RuleBrandStyleColourType,
  RuleBrandStyleFont,
  RuleBrandStyleImage,
  RuleBrandStyleLink,
  RuleBrandStyleLinkType,
  RuleBrandStyleListItem,
  RuleBrandStyleListResponse,
  RuleBrandStyleResponse,
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

    if (themeType === undefined) continue;

    // Brand-style API can return blank or otherwise unsafe URLs.
    // applyTheme would later throw EmailThemeApplyError on those, so
    // drop them here instead — a partial brand style should still
    // produce a usable theme.
    const safeUrl = sanitizeUrl(link.link);

    if (safeUrl === '') continue;

    out.push({ type: themeType, url: safeUrl });
  }

  return out;
}

function mapImages(brandImages: RuleBrandStyleImage[]): EmailThemeImage[] {
  const out: EmailThemeImage[] = [];

  for (const image of brandImages) {
    if (image.type !== 'logo') continue;
    if (typeof image.public_path !== 'string') continue;

    // Same rationale as mapLinks: applyTheme rejects unsafe logo URLs
    // (see apply-theme.test.ts), so filter at the source rather than
    // surfacing a runtime error from a partial brand style.
    const safeUrl = sanitizeUrl(image.public_path);

    if (safeUrl === '') continue;

    out.push({ type: EmailThemeImageType.Logo, url: safeUrl });
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
      fonts.push({ fontFamily, ...safeFontUrl(titleFont.url) });
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
      fonts.push({ fontFamily, ...safeFontUrl(bodyFont.url) });
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

/**
 * Same rationale as {@link mapLinks}/{@link mapImages}: applyTheme rejects
 * unsafe font URLs with `EmailThemeApplyError`, so filter at the bridge
 * rather than surfacing a runtime error from a partial brand style.
 * Returns either `{ url: safeUrl }` or `{}` so the caller can spread it.
 */
function safeFontUrl(url: string | null | undefined): { url?: string } {
  if (typeof url !== 'string') return {};

  const safe = sanitizeUrl(url);

  return safe === '' ? {} : { url: safe };
}

function fontFamilyFrom(font: RuleBrandStyleFont): string | undefined {
  const name = font.origin_name ?? font.name;

  if (typeof name !== 'string' || name === '') return undefined;

  return name;
}

// ============================================================================
// Theme resolver — thin wrapper around the brand-style HTTP endpoints that
// returns an EmailTheme ready to drive `applyTheme`.
// ============================================================================

/**
 * Minimal structural shape {@link resolveBrandTheme} needs from a client.
 * `RuleClient` satisfies it, and test doubles can too without importing
 * the whole client module.
 *
 * @public
 */
export interface BrandThemeResolverClient {
  listBrandStyles(): Promise<RuleBrandStyleListResponse>
  getBrandStyle(brandStyleId: number): Promise<RuleBrandStyleResponse | null>
}

/**
 * Result of {@link resolveBrandTheme}.
 *
 * @public
 */
export interface ResolvedBrandTheme {
  /** Resolved brand-style id. */
  id: number
  /** Brand style name if the API returned one. */
  name?: string
  /** The resolved theme, ready for `applyTheme`. */
  theme: EmailTheme
  /**
   * Discovery source: `'override'` when the caller supplied `overrideId`,
   * `'default'` when an `is_default` entry matched, `'fallback'` when the
   * first entry was used because no default was flagged.
   */
  source: 'override' | 'default' | 'fallback'
}

/**
 * Resolve the account's preferred brand style and convert it to a
 * ready-to-apply {@link EmailTheme}.
 *
 * Discovery rules:
 * 1. If `overrideId` is provided, fetch that brand style directly.
 * 2. Otherwise, list all brand styles and pick the one flagged
 *    `is_default`.
 * 3. If no style is flagged default, fall back to the first entry
 *    (`source` is set to `'fallback'` so callers can warn).
 *
 * Use this in provisioning / deploy scripts instead of hardcoding brand
 * style IDs — a customer's preferred style can change and list order is
 * not guaranteed.
 *
 * @public
 */
export async function resolveBrandTheme(
  client: BrandThemeResolverClient,
  overrideId?: number,
): Promise<ResolvedBrandTheme> {
  if (overrideId !== undefined) {
    if (!Number.isInteger(overrideId) || overrideId <= 0) {
      throw new RuleConfigError(
        `Invalid brand style id ${String(overrideId)}: expected a positive integer.`,
      );
    }

    const resp = await client.getBrandStyle(overrideId);

    if (!resp?.data) {
      throw new RuleConfigError(`Brand style ${String(overrideId)} not found`);
    }

    return {
      id: overrideId,
      name: resp.data.name,
      theme: emailThemeFromBrandStyle(resp.data),
      source: 'override',
    };
  }

  const listResp = await client.listBrandStyles();
  const styles: RuleBrandStyleListItem[] = listResp.data ?? [];

  if (styles.length === 0) {
    throw new RuleConfigError('No brand styles available in the account');
  }

  const preferred = styles.find((s) => s.is_default) ?? styles[0]!;
  const source: 'default' | 'fallback' = preferred.is_default ? 'default' : 'fallback';
  const resp = await client.getBrandStyle(preferred.id);

  if (!resp?.data) {
    throw new RuleConfigError(`Brand style ${String(preferred.id)} not found`);
  }

  return {
    id: preferred.id,
    name: resp.data.name,
    theme: emailThemeFromBrandStyle(resp.data),
    source,
  };
}
