/**
 * Tests for {@link emailThemeFromBrandStyle} — the `@rule-io/client` bridge
 * that converts a Rule.io brand-style API response directly into an
 * {@link EmailTheme}.
 */

import { describe, expect, it } from 'vitest';

import {
  EmailThemeColorType,
  EmailThemeFontStyleType,
  EmailThemeImageType,
  applyTheme,
} from '@rule-io/rcml';

import { emailThemeFromBrandStyle } from '../src/index.js';
import type { RuleBrandStyle } from '../src/index.js';

const NOW = '2026-04-30T00:00:00Z';

function fullBrandStyle(overrides: Partial<RuleBrandStyle> = {}): RuleBrandStyle {
  return {
    id: 99999,
    account_id: 1,
    name: 'Test Brand',
    is_default: true,
    colours: [
      { id: 1, brand_style_id: 99999, type: 'brand', hex: '#F6F8F9', brightness: 0, created_at: NOW, updated_at: NOW },
      { id: 2, brand_style_id: 99999, type: 'accent', hex: '#0066CC', brightness: 0, created_at: NOW, updated_at: NOW },
      { id: 3, brand_style_id: 99999, type: 'light', hex: '#FFFFFF', brightness: 0, created_at: NOW, updated_at: NOW },
      { id: 4, brand_style_id: 99999, type: 'side', hex: '#F3F3F3', brightness: 0, created_at: NOW, updated_at: NOW },
      { id: 5, brand_style_id: 99999, type: 'dark', hex: '#1A1A1A', brightness: 0, created_at: NOW, updated_at: NOW },
    ],
    fonts: [
      { id: 10, brand_style_id: 99999, type: 'title', origin: 'google', origin_name: 'Merriweather', name: 'Merriweather', url: 'https://fonts.example/merriweather.css', created_at: NOW, updated_at: NOW },
      { id: 11, brand_style_id: 99999, type: 'body', origin: 'google', origin_name: 'Open Sans', name: 'Open Sans', url: 'https://fonts.example/opensans.css', created_at: NOW, updated_at: NOW },
    ],
    images: [
      { id: 20, brand_style_id: 99999, type: 'logo', public_path: 'https://example.com/logo.png', created_at: NOW, updated_at: NOW },
      { id: 21, brand_style_id: 99999, type: 'icon', public_path: 'https://example.com/icon.png', created_at: NOW, updated_at: NOW },
    ],
    links: [
      { id: 30, brand_style_id: 99999, type: 'facebook', link: 'https://fb.example/acme', created_at: NOW, updated_at: NOW },
      { id: 31, brand_style_id: 99999, type: 'twitter', link: 'https://twitter.example/acme', created_at: NOW, updated_at: NOW },
      { id: 32, brand_style_id: 99999, type: 'website', link: 'https://acme.example/', created_at: NOW, updated_at: NOW },
      { id: 33, brand_style_id: 99999, type: 'youtube', link: 'https://yt.example/acme', created_at: NOW, updated_at: NOW },
    ],
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

describe('emailThemeFromBrandStyle — full input', () => {
  const theme = emailThemeFromBrandStyle(fullBrandStyle());

  it('carries the brand-style id', () => {
    expect(theme.brandStyleId).toBe(99999);
  });

  it('maps brand/accent/light/side colours onto the four theme slots', () => {
    expect(theme.colors[EmailThemeColorType.Secondary]?.hex).toBe('#F6F8F9');
    expect(theme.colors[EmailThemeColorType.Primary]?.hex).toBe('#0066CC');
    expect(theme.colors[EmailThemeColorType.Body]?.hex).toBe('#FFFFFF');
    expect(theme.colors[EmailThemeColorType.Background]?.hex).toBe('#F3F3F3');
  });

  it('propagates the dark colour to every font-style', () => {
    for (const type of Object.keys(theme.fontStyles) as EmailThemeFontStyleType[]) {
      if (type === EmailThemeFontStyleType.ButtonLabel) {
        // ButtonLabel keeps its default colour (#FFFFFF) — unaffected by `dark`.
        expect(theme.fontStyles[type].color).toBe('#FFFFFF');
      } else {
        expect(theme.fontStyles[type].color).toBe('#1A1A1A');
      }
    }
  });

  it('populates fonts and per-fontStyle font-family overrides', () => {
    const families = theme.fonts.map((f) => f.fontFamily);

    expect(families).toContain('Merriweather');
    expect(families).toContain('Open Sans');

    for (const type of [EmailThemeFontStyleType.H1, EmailThemeFontStyleType.H4]) {
      expect(theme.fontStyles[type].fontFamily).toBe('Merriweather');
    }

    for (const type of [EmailThemeFontStyleType.Paragraph, EmailThemeFontStyleType.ButtonLabel]) {
      expect(theme.fontStyles[type].fontFamily).toBe('Open Sans');
    }
  });

  it('picks the logo image', () => {
    const logo = theme.images[EmailThemeImageType.Logo];

    expect(logo?.url).toBe('https://example.com/logo.png');
  });

  it('maps social links and normalises twitter to x; drops unsupported types', () => {
    const types = Object.values(theme.links).map((l) => l!.type);

    expect(types).toContain('facebook');
    expect(types).toContain('website');
    expect(types).toContain('x'); // twitter → x
    expect(types).not.toContain('youtube');
  });
});

describe('emailThemeFromBrandStyle — partial input', () => {
  it('falls back to defaults when colours are missing', () => {
    const theme = emailThemeFromBrandStyle(fullBrandStyle({ colours: [] }));

    // Default primary colour from theme-defaults.
    expect(theme.colors[EmailThemeColorType.Primary]?.hex).toBe('#05CC87');
  });

  it('keeps default font-style colour when no dark colour is supplied', () => {
    const theme = emailThemeFromBrandStyle(
      fullBrandStyle({
        colours: [
          {
            id: 1,
            brand_style_id: 99999,
            type: 'accent',
            hex: '#123456',
            brightness: 0,
            created_at: NOW,
            updated_at: NOW,
          },
        ],
      })
    );

    // H1 uses Merriweather font + default color (#0F0F1F).
    expect(theme.fontStyles[EmailThemeFontStyleType.H1].color).toBe('#0F0F1F');
  });

  it('omits the logo when no logo image is present', () => {
    const theme = emailThemeFromBrandStyle(fullBrandStyle({ images: [] }));

    expect(theme.images[EmailThemeImageType.Logo]).toBeUndefined();
  });

  it('produces empty fonts array when brand has no fonts', () => {
    const theme = emailThemeFromBrandStyle(fullBrandStyle({ fonts: [] }));

    expect(theme.fonts).toEqual([]);
  });

  it('omits url on fonts without a url', () => {
    const theme = emailThemeFromBrandStyle(
      fullBrandStyle({
        fonts: [
          {
            id: 10,
            brand_style_id: 99999,
            type: 'title',
            origin: 'system',
            origin_name: 'Helvetica',
            name: 'Helvetica',
            url: null,
            created_at: NOW,
            updated_at: NOW,
          },
        ],
      })
    );

    expect(theme.fonts).toEqual([{ fontFamily: 'Helvetica' }]);
  });

  it('is tolerant of null top-level arrays', () => {
    const theme = emailThemeFromBrandStyle({
      id: 1,
      account_id: 1,
      name: 'Empty',
      is_default: true,
      colours: null,
      fonts: null,
      images: null,
      links: null,
      created_at: NOW,
      updated_at: NOW,
    });

    expect(theme.brandStyleId).toBe(1);
    // All slots revert to defaults.
    expect(theme.colors[EmailThemeColorType.Primary]?.hex).toBe('#05CC87');
  });
});

describe('emailThemeFromBrandStyle + applyTheme — end-to-end', () => {
  it('produces a document whose head reflects the brand style', () => {
    const theme = emailThemeFromBrandStyle(fullBrandStyle());
    const doc = applyTheme(
      {
        tagName: 'rcml',
        id: 'doc',
        children: [
          {
            tagName: 'rc-head',
            id: 'h',
            children: [
              { tagName: 'rc-brand-style', id: 'b', attributes: { id: 0 } },
              { tagName: 'rc-attributes', id: 'a', children: [] },
            ],
          },
          {
            tagName: 'rc-body',
            id: 'bd',
            children: [],
          },
        ],
      } as never,
      theme
    );

    const serialised = JSON.stringify(doc);

    expect(serialised).toContain('"id":99999'); // rc-brand-style id
    expect(serialised).toContain('#0066CC'); // primary/accent colour → rc-button
    expect(serialised).toContain('#F3F3F3'); // background → rc-body
    expect(serialised).toContain('#FFFFFF'); // body (section bg) + button-label color
    expect(serialised).toContain('rcml-logo-style');
    expect(serialised).toContain('https://example.com/logo.png');
    expect(serialised).toContain("'Merriweather'"); // title font
    expect(serialised).toContain("'Open Sans'"); // body font
    expect(serialised).toContain('https://fonts.example/merriweather.css');
  });
});
