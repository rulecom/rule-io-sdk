/**
 * Template Builder Tests
 *
 * Tests for hospitality and e-commerce template builders,
 * brand template utilities, and placeholder helpers.
 */

import { describe, it, expect } from 'vitest';
import type { BrandStyleConfig, CustomFieldMap } from '../src/index.js';
import { RuleConfigError } from '@rule-io/core';
import { validateCustomFields, toBrandStyleConfig, resolvePreferredBrandStyle, withTemplateContext } from '../src/index.js';
import type { BrandStyleResolverClient } from '../src/index.js';
import type { RcmlLogo, RcmlSection } from '@rule-io/rcml';
import type {
  RuleBrandStyle,
  RuleBrandStyleListItem,
  RuleBrandStyleListResponse,
  RuleBrandStyleResponse,
} from '../src/index.js';
import {
  createBrandTemplate,
  createBrandHead,
  createBrandLogo,
  createBrandHeading,
  createBrandText,
  createBrandButton,
  createContentSection,
  createFooterSection,
  createPlaceholder,
  createTextNode,
  createDocWithPlaceholders,
  createDefaultContentSection,
} from '../src/index.js';
import { TEST_BRAND_STYLE, assertValidRCMLDocument } from './helpers.js';

// ============================================================================
// Brand Template Utilities
// ============================================================================

describe('Brand Template Utilities', () => {
  describe('createPlaceholder', () => {
    it('should create a placeholder node with field name and ID', () => {
      const node = createPlaceholder('Subscriber.FirstName', 200001);

      expect(node.type).toBe('placeholder');
      expect(node.attrs.type).toBe('CustomField');
      expect(node.attrs.name).toBe('Subscriber.FirstName');
      expect(node.attrs.value).toBe(200001);
      expect(node.attrs.original).toBe('[CustomField:200001]');
    });
  });

  describe('createTextNode', () => {
    it('should create a text node', () => {
      const node = createTextNode('Hello');

      expect(node.type).toBe('text');
      expect(node.text).toBe('Hello');
    });
  });

  describe('createDocWithPlaceholders', () => {
    it('should create a ProseMirror doc with mixed content', () => {
      const doc = createDocWithPlaceholders([
        createTextNode('Hello '),
        createPlaceholder('Subscriber.FirstName', 200001),
        createTextNode('!'),
      ]);

      expect(doc.type).toBe('doc');
      expect(doc.content).toHaveLength(1);
      expect(doc.content[0].type).toBe('paragraph');
      expect(doc.content[0].content).toHaveLength(3);
      expect(doc.content[0].content![0].type).toBe('text');
      expect(doc.content[0].content![1].type).toBe('placeholder');
      expect(doc.content[0].content![2].type).toBe('text');
    });
  });

  describe('createBrandTemplate', () => {
    it('should create a valid RCML document', () => {
      const doc = createBrandTemplate({
        brandStyle: TEST_BRAND_STYLE,
        preheader: 'Test preheader',
        sections: [
          createContentSection([
            createBrandText(createDocWithPlaceholders([createTextNode('Hello')])),
          ]),
        ],
      });

      assertValidRCMLDocument(doc);
    });

    it('should include brand style ID in head', () => {
      const doc = createBrandTemplate({
        brandStyle: TEST_BRAND_STYLE,
        sections: [
          createContentSection([
            createBrandText(createDocWithPlaceholders([createTextNode('Test')])),
          ]),
        ],
      });

      const head = doc.children[0];
      const brandStyleEl = head.children?.find(
        (c: { tagName: string }) => c.tagName === 'rc-brand-style'
      );

      expect(brandStyleEl).toBeDefined();
    });

    it('should assign IDs to all RCML elements', () => {
      const doc = createBrandTemplate({
        brandStyle: TEST_BRAND_STYLE,
        preheader: 'Test',
        sections: [
          createContentSection([
            createBrandText(createDocWithPlaceholders([createTextNode('Hello')])),
          ]),
        ],
      });

      // Collect all IDs and assert every RCML node has one
      const ids: string[] = [];

      function traverse(node: unknown): void {
        if (!node || typeof node !== 'object') return;
        const n = node as Record<string, unknown>;

        if (typeof n.tagName === 'string') {
          expect(n.id, `RCML node <${n.tagName}> is missing an id`).toBeDefined();
          ids.push(String(n.id));
        }

        for (const value of Object.values(n)) {
          if (Array.isArray(value)) {
            value.forEach((child) => traverse(child));
          } else if (value && typeof value === 'object') {
            traverse(value);
          }
        }
      }

      traverse(doc as unknown);

      expect(ids.length).toBeGreaterThan(0);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('createBrandHead', () => {
    const findLabelStyle = (node: Record<string, unknown>): Record<string, unknown> | undefined => {
      if (node.tagName === 'rc-class' && (node.attributes as Record<string, string>)?.name === 'rcml-label-style') return node;

      if (Array.isArray(node.children)) {
        for (const child of node.children as Array<Record<string, unknown>>) {
          const found = findLabelStyle(child);

          if (found) return found;
        }
      }

      return undefined;
    };

    it('should create head with preheader', () => {
      const head = createBrandHead(TEST_BRAND_STYLE, { preheader: 'Preview text' });

      expect(head.tagName).toBe('rc-head');
      const preview = head.children?.find(
        (c: { tagName: string }) => c.tagName === 'rc-preview'
      );

      expect(preview).toBeDefined();
    });

    it('should include plain text fallback', () => {
      const head = createBrandHead(TEST_BRAND_STYLE, { plainText: 'Custom plain text' });

      const plainText = head.children?.find(
        (c: { tagName: string }) => c.tagName === 'rc-plain-text'
      );

      expect(plainText).toBeDefined();
    });

    it('should throw RuleConfigError for unsafe logoUrl', () => {
      expect(() =>
        createBrandHead({ ...TEST_BRAND_STYLE, logoUrl: 'javascript:alert(1)' })
      ).toThrow(RuleConfigError);
    });

    it('should throw RuleConfigError for unsafe headingFontUrl', () => {
      expect(() =>
        createBrandHead({ ...TEST_BRAND_STYLE, headingFontUrl: 'javascript:void(0)' })
      ).toThrow(RuleConfigError);
    });

    it('should throw RuleConfigError for unsafe bodyFontUrl', () => {
      expect(() =>
        createBrandHead({ ...TEST_BRAND_STYLE, bodyFontUrl: 'data:text/html,<script>' })
      ).toThrow(RuleConfigError);
    });

    it('should work without logoUrl', () => {
      const styleNoLogo = { ...TEST_BRAND_STYLE };

      delete (styleNoLogo as Record<string, unknown>).logoUrl;
      const head = createBrandHead(styleNoLogo);

      const json = JSON.stringify(head);

      expect(json).not.toContain('rcml-logo-style');
      expect(json).toContain('rcml-h1-style');
    });

    it('should work without font URLs (system fonts)', () => {
      const styleNoFonts = { ...TEST_BRAND_STYLE };

      delete (styleNoFonts as Record<string, unknown>).headingFontUrl;
      delete (styleNoFonts as Record<string, unknown>).bodyFontUrl;
      const head = createBrandHead(styleNoFonts);

      const json = JSON.stringify(head);

      expect(json).not.toContain('rc-font');
      expect(json).toContain('rcml-h1-style');
      expect(json).toContain('rcml-p-style');
    });

    it('should include social links when provided', () => {
      const styleWithSocial: BrandStyleConfig = {
        ...TEST_BRAND_STYLE,
        socialLinks: [
          { name: 'facebook', href: 'https://facebook.com/test' },
          { name: 'instagram', href: 'https://instagram.com/test' },
        ],
      };
      const head = createBrandHead(styleWithSocial);
      const json = JSON.stringify(head);

      expect(json).toContain('rc-social');
      expect(json).toContain('rc-social-element');
      expect(json).toContain('facebook');
      expect(json).toContain('https://facebook.com/test');
      expect(json).toContain('instagram');
    });

    it('should filter out social links with unsafe URLs', () => {
      const styleWithBadLink: BrandStyleConfig = {
        ...TEST_BRAND_STYLE,
        socialLinks: [
          { name: 'facebook', href: 'https://facebook.com/test' },
          { name: 'evil', href: 'javascript:alert(1)' },
        ],
      };
      const head = createBrandHead(styleWithBadLink);
      const json = JSON.stringify(head);

      expect(json).toContain('facebook');
      expect(json).not.toContain('javascript');
      expect(json).not.toContain('evil');
    });

    it('should not include rc-social when no social links', () => {
      const head = createBrandHead(TEST_BRAND_STYLE);
      const json = JSON.stringify(head);

      expect(json).not.toContain('rc-social');
    });

    it('should use #FFFFFF for label style color by default', () => {
      const head = createBrandHead(TEST_BRAND_STYLE);
      const json = JSON.stringify(head);

      // Find the rcml-label-style class
      const attrs = JSON.parse(json);
      const labelStyle = findLabelStyle(attrs);

      expect(labelStyle).toBeDefined();
      expect((labelStyle!.attributes as Record<string, string>).color).toBe('#FFFFFF');
    });

    it('should use custom buttonTextColor for label style color when provided', () => {
      const customStyle: BrandStyleConfig = {
        ...TEST_BRAND_STYLE,
        buttonTextColor: '#000000',
      };
      const head = createBrandHead(customStyle);
      const json = JSON.stringify(head);

      const parsed = JSON.parse(json);
      const labelStyle = findLabelStyle(parsed);

      expect(labelStyle).toBeDefined();
      expect((labelStyle!.attributes as Record<string, string>).color).toBe('#000000');
    });

    it('should keep single quotes in rc-font name attributes to match editor format', () => {
      const head = createBrandHead(TEST_BRAND_STYLE);
      const json = JSON.stringify(head);

      // rc-font name should keep single quotes (e.g. "'Sora Medium'")
      const parsed = JSON.parse(json);

      const findRcFont = (node: Record<string, unknown>): Array<Record<string, unknown>> => {
        const results: Array<Record<string, unknown>> = [];

        if (node.tagName === 'rc-font') results.push(node);

        if (Array.isArray(node.children)) {
          for (const child of node.children as Array<Record<string, unknown>>) {
            results.push(...findRcFont(child));
          }
        }

        return results;
      };

      const fonts = findRcFont(parsed);

      expect(fonts.length).toBeGreaterThan(0);

      for (const font of fonts) {
        const name = (font.attributes as Record<string, string>)?.name;

        expect(name).toContain("'");
      }
    });
  });

  describe('toBrandStyleConfig', () => {
    it('should map a full brand style response to BrandStyleConfig', () => {
      const result = toBrandStyleConfig({
        id: 976,
        name: 'Test Brand',
        colours: [
          { type: 'accent', hex: '#FF0000'},
          { type: 'dark', hex: '#111111'},
          { type: 'light', hex: '#FAFAFA'},
          { type: 'brand', hex: '#0066CC'},
        ],
        fonts: [
          { type: 'title', name: 'Montserrat', url: 'https://app.rule.io/fonts/1/css'},
          { type: 'body', name: 'Open Sans', url: 'https://app.rule.io/fonts/2/css'},
        ],
        images: [
          { type: 'logo', public_path: 'https://cdn.rule.io/logo.png'},
        ],
      });

      expect(result.brandStyleId).toBe('976');
      expect(result.logoUrl).toBe('https://cdn.rule.io/logo.png');
      expect(result.buttonColor).toBe('#FF0000');
      expect(result.bodyBackgroundColor).toBe('#FAFAFA');
      expect(result.sectionBackgroundColor).toBe('#FAFAFA');
      expect(result.brandColor).toBe('#0066CC');
      expect(result.headingFont).toBe("'Montserrat', sans-serif");
      expect(result.headingFontUrl).toBe('https://app.rule.io/fonts/1/css');
      expect(result.bodyFont).toBe("'Open Sans', sans-serif");
      expect(result.bodyFontUrl).toBe('https://app.rule.io/fonts/2/css');
      expect(result.textColor).toBe('#111111');
    });

    it('should use defaults for missing colours and fonts', () => {
      const result = toBrandStyleConfig({
        id: 100,
        name: 'Minimal',
        colours: [],
        fonts: [],
        images: [],
      });

      expect(result.brandStyleId).toBe('100');
      expect(result.logoUrl).toBeUndefined();
      expect(result.buttonColor).toBe('#333333');
      expect(result.bodyBackgroundColor).toBe('#F5F5F5');
      expect(result.brandColor).toBe('#333333');
      expect(result.headingFont).toBe("'Helvetica', sans-serif");
      expect(result.headingFontUrl).toBeUndefined();
      expect(result.bodyFont).toBe("'Helvetica', sans-serif");
      expect(result.bodyFontUrl).toBeUndefined();
      expect(result.textColor).toBe('#0F0F1F');
    });

    it('should handle null arrays gracefully', () => {
      const result = toBrandStyleConfig({
        id: 200,
        name: 'Null arrays',
        colours: null,
        fonts: null,
        images: null,
      });

      expect(result.brandStyleId).toBe('200');
      expect(result.logoUrl).toBeUndefined();
      expect(result.headingFontUrl).toBeUndefined();
    });

    it('should prefer "side" colour for bodyBackgroundColor over "light"', () => {
      const result = toBrandStyleConfig({
        id: 400,
        name: 'Side colour',
        colours: [
          { type: 'side', hex: '#FF5204'},
          { type: 'light', hex: '#FAFAFA'},
        ],
        fonts: [],
        images: [],
      });

      expect(result.bodyBackgroundColor).toBe('#FF5204');
    });

    it('should fall back to "light" colour when "side" is missing', () => {
      const result = toBrandStyleConfig({
        id: 401,
        name: 'No side colour',
        colours: [
          { type: 'light', hex: '#FAFAFA'},
        ],
        fonts: [],
        images: [],
      });

      expect(result.bodyBackgroundColor).toBe('#FAFAFA');
    });

    it('should extract social links from brand style links', () => {
      const result = toBrandStyleConfig({
        id: 500,
        name: 'With social',
        colours: [],
        fonts: [],
        images: [],
        links: [
          { type: 'facebook', link: 'https://facebook.com/test'},
          { type: 'instagram', link: 'https://instagram.com/test'},
        ],
      });

      expect(result.socialLinks).toEqual([
        { name: 'facebook', href: 'https://facebook.com/test' },
        { name: 'instagram', href: 'https://instagram.com/test' },
      ]);
    });

    it('should map "website" link type to "web" for RCML compatibility', () => {
      const result = toBrandStyleConfig({
        id: 502,
        name: 'Website link',
        colours: [],
        fonts: [],
        images: [],
        links: [
          { type: 'website', link: 'https://example.com'},
        ],
      });

      expect(result.socialLinks).toEqual([
        { name: 'web', href: 'https://example.com' },
      ]);
    });

    it('should return undefined socialLinks when no links present', () => {
      const result = toBrandStyleConfig({
        id: 501,
        name: 'No links',
        colours: [],
        fonts: [],
        images: [],
      });

      expect(result.socialLinks).toBeUndefined();
    });

    it('should use origin_name over name for font display', () => {
      const result = toBrandStyleConfig({
        id: 600,
        name: 'Origin name font',
        colours: [],
        fonts: [
          { type: 'title', name: 'Sora-Medium.ttf', origin_name: 'Sora Medium', url: 'https://app.rule.io/fonts/1/css'},
          { type: 'body', name: 'Lato-Regular.ttf', origin_name: 'Lato', url: 'https://app.rule.io/fonts/2/css'},
        ],
        images: [],
      });

      expect(result.headingFont).toBe("'Sora Medium', sans-serif");
      expect(result.bodyFont).toBe("'Lato', sans-serif");
    });

    it('should fall back to name when origin_name is missing', () => {
      const result = toBrandStyleConfig({
        id: 601,
        name: 'No origin name',
        colours: [],
        fonts: [
          { type: 'title', name: 'Montserrat', url: 'https://app.rule.io/fonts/1/css'},
        ],
        images: [],
      });

      expect(result.headingFont).toBe("'Montserrat', sans-serif");
    });

    it('should fall back to first image when no logo type exists', () => {
      const result = toBrandStyleConfig({
        id: 300,
        name: 'No logo type',
        images: [
          { type: 'icon', public_path: 'https://cdn.rule.io/icon.png'},
        ],
      });

      expect(result.logoUrl).toBe('https://cdn.rule.io/icon.png');
    });
  });

  describe('resolvePreferredBrandStyle', () => {
    function makeBrand(
      id: number,
      name = `Brand ${id}`,
      isDefault = false,
    ): RuleBrandStyle {
      return {
        id,
        account_id: 1,
        name,
        is_default: isDefault,
        colours: [],
        fonts: [],
        images: [],
        created_at: '',
        updated_at: '',
      };
    }

    /** Minimal list-item shape matching `GET /brand-styles` list response. */
    function makeListItem(
      id: number,
      name = `Brand ${id}`,
      isDefault = false,
    ): RuleBrandStyleListItem {
      return {
        id,
        name,
        is_default: isDefault,
        created_at: '',
        updated_at: '',
      };
    }

    /** Lightweight stub that records calls and returns canned responses. */
    function makeClient(options: {
      list?: RuleBrandStyleListResponse;
      get?: Record<number, RuleBrandStyleResponse | null>;
    }): BrandStyleResolverClient & {
      listCalls: number;
      getCalls: number[];
    } {
      const getMap = options.get ?? {};
      const stub = {
        listCalls: 0,
        getCalls: [] as number[],
        async listBrandStyles(): Promise<RuleBrandStyleListResponse> {
          this.listCalls += 1;
          if (!options.list) throw new Error('list stub not configured');

          return options.list;
        },
        async getBrandStyle(id: number): Promise<RuleBrandStyleResponse | null> {
          this.getCalls.push(id);
          if (!(id in getMap)) throw new Error(`get stub not configured for ${id}`);

          return getMap[id];
        },
      };

      return stub;
    }

    it('picks the is_default brand style when one is flagged', async () => {
      // Give list item and detail different names to prove the returned name
      // comes from the fetched detail (authoritative/fresh), not the list item.
      const defaultStyle = makeBrand(7, 'Preferred (fresh)', true);
      const client = makeClient({
        list: {
          data: [
            makeListItem(1),
            makeListItem(7, 'Preferred (stale list name)', true),
            makeListItem(3),
          ],
        },
        get: { 7: { data: defaultStyle } },
      });

      const result = await resolvePreferredBrandStyle(client);

      expect(result.id).toBe(7);
      expect(result.name).toBe('Preferred (fresh)');
      expect(result.source).toBe('default');
      expect(result.brandStyle.brandStyleId).toBe('7');
      expect(client.listCalls).toBe(1);
      expect(client.getCalls).toEqual([7]);
    });

    it('falls back to the first style and marks source=fallback when none is_default', async () => {
      const first = makeBrand(11, 'First');
      const client = makeClient({
        list: {
          data: [makeListItem(11, 'First'), makeListItem(12)],
        },
        get: { 11: { data: first } },
      });

      const result = await resolvePreferredBrandStyle(client);

      expect(result.id).toBe(11);
      expect(result.source).toBe('fallback');
      expect(client.getCalls).toEqual([11]);
    });

    it('uses overrideId and does NOT call listBrandStyles', async () => {
      const style = makeBrand(42, 'Override');
      const client = makeClient({
        get: { 42: { data: style } },
      });

      const result = await resolvePreferredBrandStyle(client, 42);

      expect(result.id).toBe(42);
      expect(result.source).toBe('override');
      expect(client.listCalls).toBe(0);
      expect(client.getCalls).toEqual([42]);
    });

    it('throws RuleConfigError when no brand styles exist on the account', async () => {
      const client = makeClient({
        list: { data: [] satisfies RuleBrandStyleListItem[] },
      });

      await expect(resolvePreferredBrandStyle(client)).rejects.toBeInstanceOf(
        RuleConfigError,
      );
    });

    it('throws RuleConfigError when overrideId points to a missing brand style', async () => {
      const client = makeClient({ get: { 99: null } });

      await expect(resolvePreferredBrandStyle(client, 99)).rejects.toBeInstanceOf(
        RuleConfigError,
      );
    });

    it.each([
      ['NaN', Number.NaN],
      ['Infinity', Number.POSITIVE_INFINITY],
      ['-Infinity', Number.NEGATIVE_INFINITY],
      ['zero', 0],
      ['negative integer', -1],
      ['non-integer', 1.5],
    ])('rejects overrideId that is %s without calling getBrandStyle', async (_label, bad) => {
      // No stubs configured — helper must reject before any API call.
      const client = makeClient({});

      await expect(resolvePreferredBrandStyle(client, bad)).rejects.toBeInstanceOf(
        RuleConfigError,
      );
      expect(client.getCalls).toEqual([]);
      expect(client.listCalls).toBe(0);
    });

    it('throws RuleConfigError when the resolved preferred id is not returned by get', async () => {
      // Race condition: style disappears between list and get.
      const client = makeClient({
        list: { data: [makeListItem(5, 'Preferred', true)] },
        get: { 5: null },
      });

      await expect(resolvePreferredBrandStyle(client)).rejects.toBeInstanceOf(
        RuleConfigError,
      );
    });
  });

  describe('createFooterSection', () => {
    it('should create footer with default English text', () => {
      const footer = createFooterSection();
      const json = JSON.stringify(footer);

      expect(json).toContain('View in browser');
      expect(json).toContain('Unsubscribe');
    });

    it('should accept custom localized text', () => {
      const footer = createFooterSection({
        viewInBrowserText: 'Öppna i webbläsare',
        unsubscribeText: 'Avregistrera',
      });
      const json = JSON.stringify(footer);

      expect(json).toContain('Öppna i webbläsare');
      expect(json).toContain('Avregistrera');
      expect(json).not.toContain('View in browser');
    });

    it('should accept custom colors and font size', () => {
      const footer = createFooterSection({
        backgroundColor: '#000000',
        textColor: '#FFFFFF',
        fontSize: '12px',
      });
      const json = JSON.stringify(footer);

      expect(json).toContain('#000000');
      expect(json).toContain('#FFFFFF');
      expect(json).toContain('12px');
    });

    it('should include "Certified by Rule" text', () => {
      const footer = createFooterSection();
      const json = JSON.stringify(footer);

      expect(json).toContain('Certified by Rule');
    });

    it('should always use Helvetica for "Certified by Rule" line', () => {
      const footer = createFooterSection();
      const json = JSON.stringify(footer);

      // The "Certified by Rule" text always uses Helvetica (matching editor behavior)
      expect(json).toContain("'Helvetica'");
    });
  });

  describe('createDefaultContentSection', () => {
    it('should create a section with image, heading, text, and button', () => {
      const section = createDefaultContentSection();
      const json = JSON.stringify(section);

      expect(json).toContain('rc-image');
      expect(json).toContain('rc-heading');
      expect(json).toContain('rc-text');
      expect(json).toContain('rc-button');
      expect(json).toContain('Replace this title');
      expect(json).toContain('Click me!');
    });

    it('should use rc-class references for brand style connection', () => {
      const section = createDefaultContentSection();
      const json = JSON.stringify(section);

      expect(json).toContain('rcml-h1-style');
      expect(json).toContain('rcml-p-style');
      expect(json).toContain('rcml-label-style');
    });

    it('should use editor placeholder image', () => {
      const section = createDefaultContentSection();
      const json = JSON.stringify(section);

      expect(json).toContain('https://app.rule.io/img/editor/image.png');
    });

    it('should accept custom text overrides', () => {
      const section = createDefaultContentSection({
        headingText: 'Custom heading',
        bodyText: 'Custom body',
        buttonText: 'Custom button',
      });
      const json = JSON.stringify(section);

      expect(json).toContain('Custom heading');
      expect(json).toContain('Custom body');
      expect(json).toContain('Custom button');
      expect(json).not.toContain('Replace this title');
    });

    it('should set href on button when valid buttonUrl is provided', () => {
      const section = createDefaultContentSection({
        buttonUrl: 'https://example.com/order',
      });
      const json = JSON.stringify(section);

      expect(json).toContain('"href":"https://example.com/order"');
    });

    it('should omit href when buttonUrl is unsafe', () => {
      const section = createDefaultContentSection({
        buttonUrl: 'javascript:alert(1)',
      });
      const json = JSON.stringify(section);

      expect(json).not.toContain('href');
      expect(json).not.toContain('javascript');
    });
  });

  describe('createBrandLogo', () => {
    it('should create a logo element with correct structure', () => {
      const logo = createBrandLogo('https://app.rule.io/brand-style/123/image/456') as RcmlSection;

      expect(logo.tagName).toBe('rc-section');
      expect(logo.id).toBeDefined();

      // Check column
      const column = logo.children[0];

      expect(column.tagName).toBe('rc-column');
      expect(column.id).toBeDefined();

      // Check rc-logo
      const rcLogo = column.children[0] as RcmlLogo;

      expect(rcLogo.tagName).toBe('rc-logo');
      expect(rcLogo.id).toBeDefined();
      expect(rcLogo.attributes?.['rc-class']).toBe('rcml-logo-style rc-initial-logo');
      expect(rcLogo.attributes?.src).toBe('https://app.rule.io/brand-style/123/image/456');
    });

    it('should generate unique IDs across nodes', () => {
      const logo = createBrandLogo('https://example.com/logo.png');
      const ids = [logo.id, logo.children[0].id, logo.children[0].children[0].id];

      expect(new Set(ids).size).toBe(3);
    });

    it('should throw RuleConfigError for unsafe logoUrl', () => {
      expect(() => createBrandLogo('javascript:alert(1)')).toThrow(RuleConfigError);
    });

    it('should throw RuleConfigError for empty logoUrl', () => {
      expect(() => createBrandLogo('')).toThrow(RuleConfigError);
    });
  });

  describe('createBrandHeading', () => {
    it('should create heading with content', () => {
      const heading = createBrandHeading(
        createDocWithPlaceholders([createTextNode('Welcome')])
      );

      expect(heading.tagName).toBe('rc-heading');
    });

    it('should accept heading level', () => {
      const heading = createBrandHeading(
        createDocWithPlaceholders([createTextNode('Subtitle')]),
        2
      );

      expect(heading.tagName).toBe('rc-heading');
    });
  });

  describe('createBrandButton', () => {
    it('should create button with href', () => {
      const button = createBrandButton(
        createDocWithPlaceholders([createTextNode('Click')]),
        'https://example.com'
      );

      expect(button.tagName).toBe('rc-button');
      expect(button.attributes?.href).toBe('https://example.com');
    });

    it('should throw RuleConfigError for javascript: URL', () => {
      expect(() =>
        createBrandButton(
          createDocWithPlaceholders([createTextNode('Click')]),
          'javascript:alert(1)'
        )
      ).toThrow(RuleConfigError);
    });

    it('should throw RuleConfigError for malformed URL', () => {
      expect(() =>
        createBrandButton(
          createDocWithPlaceholders([createTextNode('Click')]),
          'not-a-url'
        )
      ).toThrow(RuleConfigError);
    });
  });

  describe('createContentSection', () => {
    it('should create section with children', () => {
      const section = createContentSection([
        createBrandText(createDocWithPlaceholders([createTextNode('Content')])),
      ]);

      expect(section.tagName).toBe('rc-section');
    });

    it('should accept padding and background color', () => {
      const section = createContentSection(
        [createBrandText(createDocWithPlaceholders([createTextNode('Content')]))],
        { padding: '40px 0', backgroundColor: '#FF0000' }
      ) as RcmlSection;

      expect(section.attributes?.padding).toBe('40px 0');
      expect(section.attributes?.['background-color']).toBe('#FF0000');
    });
  });
});

// ============================================================================
// Validation
// ============================================================================

describe('validateCustomFields', () => {
  it('should pass when all required fields are present', () => {
    const customFields: CustomFieldMap = {
      'Order.Ref': 100,
      'Order.Name': 101,
    };

    expect(() =>
      validateCustomFields(customFields, { orderRef: 'Order.Ref', name: 'Order.Name' }, 'test')
    ).not.toThrow();
  });

  it('should throw RuleConfigError for missing required field', () => {
    const customFields: CustomFieldMap = {
      'Order.Ref': 100,
    };

    expect(() =>
      validateCustomFields(customFields, { orderRef: 'Order.Ref', name: 'Order.Name' }, 'test')
    ).toThrow(RuleConfigError);
  });

  it('should include field name in error message', () => {
    const customFields: CustomFieldMap = {};

    expect(() =>
      validateCustomFields(customFields, { orderRef: 'Order.Ref' }, 'createOrderEmail')
    ).toThrow('createOrderEmail: missing customFields entry for fieldNames.orderRef ("Order.Ref")');
  });

  it('should skip undefined (optional) field names', () => {
    const customFields: CustomFieldMap = {
      'Order.Ref': 100,
    };

    expect(() =>
      validateCustomFields(
        customFields,
        { orderRef: 'Order.Ref', items: undefined },
        'test'
      )
    ).not.toThrow();
  });

  it('should omit template prefix when templateName is not provided', () => {
    const customFields: CustomFieldMap = {};

    expect(() =>
      validateCustomFields(customFields, { orderRef: 'Order.Ref' })
    ).toThrow('missing customFields entry for fieldNames.orderRef ("Order.Ref")');

    // Assert the prefix is absent — withTemplateContext callers rely on this
    // so their wrapper's prefix is the only one in the final message.
    try {
      validateCustomFields(customFields, { orderRef: 'Order.Ref' });
    } catch (error) {
      expect(error).toBeInstanceOf(RuleConfigError);
      expect((error as RuleConfigError).message).not.toMatch(/^[A-Za-z]+:/);
    }
  });
});

// ============================================================================
// Notes on moved tests
// ============================================================================
//
// Vertical email template tests (Hospitality / E-commerce / Generic) and
// their associated footer-localization + template-error-context cases used
// to live here. They moved together with their source files to:
//   - packages/vendor-bookzen/tests/hospitality-templates.test.ts
//   - packages/vendor-shopify/tests/ecommerce-templates.test.ts
//
// The brand-template tests above still exercise the shared helpers
// (createContentSection, createBrandLogo, createSummaryRowsSection, …) that
// those vendor templates compose on top of.

describe('barrel exports', () => {
  it('should export validateCustomFields from the barrel', async () => {
    const barrel = await import('../src/index.js');

    expect(barrel.validateCustomFields).toBe(validateCustomFields);
  });

  it('should export validateCustomFields from the top-level barrel', async () => {
    const topBarrel = await import('../src/index.js');

    expect(topBarrel.validateCustomFields).toBe(validateCustomFields);
  });

  it('should export the new section helpers from the top-level barrel', async () => {
    // Regression: the package.json `exports` field only exposes `.`, so any
    // helper re-exported from `src/rcml/index.ts` but not from `src/index.ts`
    // is unreachable by external consumers.
    const topBarrel = await import('../src/index.js');

    expect(typeof topBarrel.createSummaryRowsSection).toBe('function');
    expect(typeof topBarrel.createStatusTrackerSection).toBe('function');
    expect(typeof topBarrel.createAddressBlock).toBe('function');
  });
});

// ============================================================================
// withTemplateContext
// ============================================================================

describe('withTemplateContext', () => {
  it('should return the value from the callback', () => {
    const result = withTemplateContext('myTemplate', () => 42);

    expect(result).toBe(42);
  });

  it('should prepend template name to RuleConfigError messages', () => {
    expect(() =>
      withTemplateContext('createOrderConfirmationEmail', () => {
        throw new RuleConfigError('createBrandButton: invalid or unsafe URL');
      })
    ).toThrow('createOrderConfirmationEmail > createBrandButton: invalid or unsafe URL');
  });

  it('should preserve RuleConfigError type', () => {
    try {
      withTemplateContext('myTemplate', () => {
        throw new RuleConfigError('some error');
      });
    } catch (error) {
      expect(error).toBeInstanceOf(RuleConfigError);
    }
  });

  it('should attach original error as cause', () => {
    const original = new RuleConfigError('createBrandButton: invalid or unsafe URL');

    try {
      withTemplateContext('createOrderConfirmationEmail', () => {
        throw original;
      });
    } catch (error) {
      expect(error).toBeInstanceOf(RuleConfigError);
      expect((error as RuleConfigError).cause).toBe(original);
    }
  });

  it('should preserve original stack frames with wrapped message', () => {
    const original = new RuleConfigError('createBrandButton: invalid or unsafe URL');

    try {
      withTemplateContext('createOrderConfirmationEmail', () => {
        throw original;
      });
    } catch (error) {
      expect(error).toBeInstanceOf(RuleConfigError);
      const wrapped = error as RuleConfigError;

      // Stack header should reflect the wrapped message
      expect(wrapped.stack).toContain('createOrderConfirmationEmail > createBrandButton: invalid or unsafe URL');
      // Original stack frames should be preserved
      const originalFrames = original.stack!.split('\n').slice(1);
      const wrappedFrames = wrapped.stack!.split('\n').slice(1);

      expect(wrappedFrames).toEqual(originalFrames);
    }
  });

  it('should not modify non-RuleConfigError errors', () => {
    expect(() =>
      withTemplateContext('myTemplate', () => {
        throw new TypeError('something else');
      })
    ).toThrow(TypeError);
  });
});

// ============================================================================
// Template Error Context
// ============================================================================

