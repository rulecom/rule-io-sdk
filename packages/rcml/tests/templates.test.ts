/**
 * Template Builder Tests
 *
 * Tests for hospitality and e-commerce template builders,
 * brand template utilities, and placeholder helpers.
 */

import { describe, it, expect } from 'vitest';
import type { BrandStyleConfig, CustomFieldMap } from '../src/index.js';
import { RuleConfigError } from '@rule-io/core';
import { validateCustomFields, toBrandStyleConfig, resolvePreferredBrandStyle, withTemplateContext, createStatusTrackerSection } from '../src/index.js';
import type { BrandStyleResolverClient } from '../src/index.js';
import type {
  RuleBrandStyle,
  RuleBrandStyleListItem,
  RuleBrandStyleListResponse,
  RuleBrandStyleResponse,
} from '../src/index.js';
import {
  // Brand template utilities
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
  // Hospitality templates
  createReservationConfirmationEmail,
  createReservationCancellationEmail,
  createReservationReminderEmail,
  createFeedbackRequestEmail,
  createReservationRequestEmail,
  // E-commerce templates
  createOrderConfirmationEmail,
  createShippingUpdateEmail,
  createAbandonedCartEmail,
  createOrderCancellationEmail,
  createWelcomeEmail,
  createDefaultContentSection,
} from '../src/index.js';
import { TEST_BRAND_STYLE, assertValidRCMLDocument, docToString } from './helpers.js';

// ============================================================================
// Shared test fixtures
// ============================================================================

const TEST_CUSTOM_FIELDS: CustomFieldMap = {
  'Booking.FirstName': 100001,
  'Booking.BookingRef': 100002,
  'Booking.ServiceType': 100003,
  'Booking.CheckInDate': 100004,
  'Booking.CheckOutDate': 100005,
  'Booking.TotalGuests': 100006,
  'Booking.TotalPrice': 100007,
  'Booking.RoomName': 100008,
  // Subscriber fields
  'Subscriber.FirstName': 200001,
  'Subscriber.LastName': 200002,
  // Order fields
  'Order.Number': 200003,
  'Order.Date': 200004,
  'Order.TotalPrice': 200005,
  'Order.TotalTax': 200006,
  'Order.TotalWeight': 200007,
  'Order.Discount': 200008,
  'Order.Currency': 200009,
  'Order.Gateway': 200010,
  'Order.ProductCount': 200011,
  'Order.Names': 200012,
  'Order.Skus': 200013,
  'Order.Products': 200014,
  'Order.CartUrl': 200015,
  // Shipping address
  'Order.ShippingAddress1': 200016,
  'Order.ShippingAddress2': 200017,
  'Order.ShippingCity': 200018,
  'Order.ShippingZip': 200019,
  'Order.ShippingCountryCode': 200020,
  // Additional test-only fields for generic template tests
  'Order.TrackingNumber': 200021,
  'Order.EstimatedDelivery': 200022,
  'Order.CustomerFullName': 200023,
  'Order.CustomerEmail': 200024,
  'Order.OrderDate': 200025,
  'Order.BillingAddress': 200026,
  'Order.CompanyName': 200027,
  'Order.VATNumber': 200028,
  'Order.PaymentMethod': 200029,
  'Order.Subtotal': 200030,
  'Order.TaxAmount': 200031,
  'Order.DiscountAmount': 200032,
  'Order.ShippingCost': 200033,
  'Order.ShippingCarrier': 200034,
};

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
        account_id: 1,
        name: 'Test Brand',
        is_default: true,
        colours: [
          { id: 1, brand_style_id: 976, type: 'accent', hex: '#FF0000', brightness: 50, created_at: '', updated_at: '' },
          { id: 2, brand_style_id: 976, type: 'dark', hex: '#111111', brightness: 10, created_at: '', updated_at: '' },
          { id: 3, brand_style_id: 976, type: 'light', hex: '#FAFAFA', brightness: 95, created_at: '', updated_at: '' },
          { id: 4, brand_style_id: 976, type: 'brand', hex: '#0066CC', brightness: 40, created_at: '', updated_at: '' },
        ],
        fonts: [
          { id: 1, brand_style_id: 976, type: 'title', name: 'Montserrat', url: 'https://app.rule.io/fonts/1/css', created_at: '', updated_at: '' },
          { id: 2, brand_style_id: 976, type: 'body', name: 'Open Sans', url: 'https://app.rule.io/fonts/2/css', created_at: '', updated_at: '' },
        ],
        images: [
          { id: 1, brand_style_id: 976, type: 'logo', public_path: 'https://cdn.rule.io/logo.png', created_at: '', updated_at: '' },
        ],
        created_at: '',
        updated_at: '',
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
        account_id: 1,
        name: 'Minimal',
        is_default: false,
        colours: [],
        fonts: [],
        images: [],
        created_at: '',
        updated_at: '',
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
        account_id: 1,
        name: 'Null arrays',
        is_default: false,
        colours: null,
        fonts: null,
        images: null,
        created_at: '',
        updated_at: '',
      });

      expect(result.brandStyleId).toBe('200');
      expect(result.logoUrl).toBeUndefined();
      expect(result.headingFontUrl).toBeUndefined();
    });

    it('should prefer "side" colour for bodyBackgroundColor over "light"', () => {
      const result = toBrandStyleConfig({
        id: 400,
        account_id: 1,
        name: 'Side colour',
        is_default: false,
        colours: [
          { id: 1, brand_style_id: 400, type: 'side', hex: '#FF5204', brightness: 50, created_at: '', updated_at: '' },
          { id: 2, brand_style_id: 400, type: 'light', hex: '#FAFAFA', brightness: 95, created_at: '', updated_at: '' },
        ],
        fonts: [],
        images: [],
        created_at: '',
        updated_at: '',
      });

      expect(result.bodyBackgroundColor).toBe('#FF5204');
    });

    it('should fall back to "light" colour when "side" is missing', () => {
      const result = toBrandStyleConfig({
        id: 401,
        account_id: 1,
        name: 'No side colour',
        is_default: false,
        colours: [
          { id: 1, brand_style_id: 401, type: 'light', hex: '#FAFAFA', brightness: 95, created_at: '', updated_at: '' },
        ],
        fonts: [],
        images: [],
        created_at: '',
        updated_at: '',
      });

      expect(result.bodyBackgroundColor).toBe('#FAFAFA');
    });

    it('should extract social links from brand style links', () => {
      const result = toBrandStyleConfig({
        id: 500,
        account_id: 1,
        name: 'With social',
        is_default: false,
        colours: [],
        fonts: [],
        images: [],
        links: [
          { id: 1, brand_style_id: 500, type: 'facebook', link: 'https://facebook.com/test', created_at: '', updated_at: '' },
          { id: 2, brand_style_id: 500, type: 'instagram', link: 'https://instagram.com/test', created_at: '', updated_at: '' },
        ],
        created_at: '',
        updated_at: '',
      });

      expect(result.socialLinks).toEqual([
        { name: 'facebook', href: 'https://facebook.com/test' },
        { name: 'instagram', href: 'https://instagram.com/test' },
      ]);
    });

    it('should map "website" link type to "web" for RCML compatibility', () => {
      const result = toBrandStyleConfig({
        id: 502,
        account_id: 1,
        name: 'Website link',
        is_default: false,
        colours: [],
        fonts: [],
        images: [],
        links: [
          { id: 1, brand_style_id: 502, type: 'website', link: 'https://example.com', created_at: '', updated_at: '' },
        ],
        created_at: '',
        updated_at: '',
      });

      expect(result.socialLinks).toEqual([
        { name: 'web', href: 'https://example.com' },
      ]);
    });

    it('should return undefined socialLinks when no links present', () => {
      const result = toBrandStyleConfig({
        id: 501,
        account_id: 1,
        name: 'No links',
        is_default: false,
        colours: [],
        fonts: [],
        images: [],
        created_at: '',
        updated_at: '',
      });

      expect(result.socialLinks).toBeUndefined();
    });

    it('should use origin_name over name for font display', () => {
      const result = toBrandStyleConfig({
        id: 600,
        account_id: 1,
        name: 'Origin name font',
        is_default: false,
        colours: [],
        fonts: [
          { id: 1, brand_style_id: 600, type: 'title', name: 'Sora-Medium.ttf', origin_name: 'Sora Medium', url: 'https://app.rule.io/fonts/1/css', created_at: '', updated_at: '' },
          { id: 2, brand_style_id: 600, type: 'body', name: 'Lato-Regular.ttf', origin_name: 'Lato', url: 'https://app.rule.io/fonts/2/css', created_at: '', updated_at: '' },
        ],
        images: [],
        created_at: '',
        updated_at: '',
      });

      expect(result.headingFont).toBe("'Sora Medium', sans-serif");
      expect(result.bodyFont).toBe("'Lato', sans-serif");
    });

    it('should fall back to name when origin_name is missing', () => {
      const result = toBrandStyleConfig({
        id: 601,
        account_id: 1,
        name: 'No origin name',
        is_default: false,
        colours: [],
        fonts: [
          { id: 1, brand_style_id: 601, type: 'title', name: 'Montserrat', url: 'https://app.rule.io/fonts/1/css', created_at: '', updated_at: '' },
        ],
        images: [],
        created_at: '',
        updated_at: '',
      });

      expect(result.headingFont).toBe("'Montserrat', sans-serif");
    });

    it('should fall back to first image when no logo type exists', () => {
      const result = toBrandStyleConfig({
        id: 300,
        account_id: 1,
        name: 'No logo type',
        is_default: false,
        images: [
          { id: 1, brand_style_id: 300, type: 'icon', public_path: 'https://cdn.rule.io/icon.png', created_at: '', updated_at: '' },
        ],
        created_at: '',
        updated_at: '',
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
      const logo = createBrandLogo('https://app.rule.io/brand-style/123/image/456');
      expect(logo.tagName).toBe('rc-section');
      expect(logo.id).toBeDefined();

      // Check column
      const column = logo.children[0];
      expect(column.tagName).toBe('rc-column');
      expect(column.id).toBeDefined();

      // Check rc-logo
      const rcLogo = column.children[0];
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
      );
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
// Hospitality Templates
// ============================================================================

describe('Hospitality Templates', () => {
  describe('createReservationConfirmationEmail', () => {
    it('should produce valid RCML', () => {
      const doc = createReservationConfirmationEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://example.com',
        text: {
          preheader: 'Thank you for your reservation!',
          greeting: 'Hello',
          intro: 'We look forward to welcoming you!',
          detailsHeading: 'Reservation Details',
          referenceLabel: 'Reference',
          serviceLabel: 'Service',
          roomLabel: 'Room',
          checkInLabel: 'Check-in',
          checkOutLabel: 'Check-out',
          guestsLabel: 'Guests',
          totalPriceLabel: 'Total',
          ctaButton: 'View Reservation',
        },
        fieldNames: {
          firstName: 'Booking.FirstName',
          bookingRef: 'Booking.BookingRef',
          serviceType: 'Booking.ServiceType',
          checkInDate: 'Booking.CheckInDate',
          checkOutDate: 'Booking.CheckOutDate',
          totalGuests: 'Booking.TotalGuests',
          totalPrice: 'Booking.TotalPrice',
          roomName: 'Booking.RoomName',
        },
      });

      assertValidRCMLDocument(doc);
      const json = docToString(doc);
      expect(json).toContain('Reservation Details');
      expect(json).toContain('100001'); // FirstName field ID
      expect(json).toContain('100002'); // BookingRef field ID
    });

    it('should work without optional fields (room, checkout, price)', () => {
      const doc = createReservationConfirmationEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://example.com',
        text: {
          preheader: 'Confirmed!',
          greeting: 'Hi',
          intro: 'Your reservation is confirmed.',
          detailsHeading: 'Details',
          referenceLabel: 'Ref',
          serviceLabel: 'Type',
          checkInLabel: 'Date',
          guestsLabel: 'Guests',
          ctaButton: 'View',
        },
        fieldNames: {
          firstName: 'Booking.FirstName',
          bookingRef: 'Booking.BookingRef',
          serviceType: 'Booking.ServiceType',
          checkInDate: 'Booking.CheckInDate',
          totalGuests: 'Booking.TotalGuests',
        },
      });

      assertValidRCMLDocument(doc);
      const json = docToString(doc);
      // Should NOT contain optional field labels
      expect(json).not.toContain('Room');
      expect(json).not.toContain('Check-out');
    });
  });

  describe('createReservationCancellationEmail', () => {
    it('should produce valid RCML', () => {
      const doc = createReservationCancellationEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://example.com',
        text: {
          preheader: 'Your reservation has been cancelled',
          heading: 'Reservation Cancelled',
          greeting: 'Hello',
          message: 'Your reservation has been cancelled as requested.',
          referenceLabel: 'Reference',
          followUp: 'We hope to see you again!',
          ctaButton: 'Make a New Reservation',
        },
        fieldNames: {
          firstName: 'Booking.FirstName',
          bookingRef: 'Booking.BookingRef',
        },
      });

      assertValidRCMLDocument(doc);
      const json = docToString(doc);
      expect(json).toContain('Reservation Cancelled');
      expect(json).toContain('Make a New Reservation');
    });
  });

  describe('createReservationReminderEmail', () => {
    it('should produce valid RCML with all optional fields', () => {
      const doc = createReservationReminderEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://example.com',
        text: {
          preheader: 'Your stay starts soon!',
          greeting: 'Welcome',
          intro: 'Your stay begins soon. We look forward to seeing you!',
          detailsHeading: 'Your Reservation',
          dateLabel: 'Dates',
          roomLabel: 'Room',
          practicalInfoHeading: 'Practical Information',
          practicalInfo: 'Check-in from 3:00 PM. Check-out by 11:00 AM.',
          ctaButton: 'View Reservation',
        },
        fieldNames: {
          firstName: 'Booking.FirstName',
          checkInDate: 'Booking.CheckInDate',
          checkOutDate: 'Booking.CheckOutDate',
          roomName: 'Booking.RoomName',
        },
      });

      assertValidRCMLDocument(doc);
      const json = docToString(doc);
      expect(json).toContain('Practical Information');
      expect(json).toContain('Check-in from 3:00 PM');
    });

    it('should work without optional practical info', () => {
      const doc = createReservationReminderEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://example.com',
        text: {
          preheader: 'Reminder',
          greeting: 'Hi',
          intro: 'Your reservation is coming up.',
          detailsHeading: 'Details',
          dateLabel: 'Date',
          ctaButton: 'View',
        },
        fieldNames: {
          firstName: 'Booking.FirstName',
          checkInDate: 'Booking.CheckInDate',
        },
      });

      assertValidRCMLDocument(doc);
      const json = docToString(doc);
      expect(json).not.toContain('Practical Information');
    });

    it('should handle single date (no check-out)', () => {
      const doc = createReservationReminderEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://example.com',
        text: {
          preheader: 'Reminder',
          greeting: 'Hi',
          intro: 'See you soon.',
          detailsHeading: 'Details',
          dateLabel: 'Date',
          ctaButton: 'View',
        },
        fieldNames: {
          firstName: 'Booking.FirstName',
          checkInDate: 'Booking.CheckInDate',
          // no checkOutDate
        },
      });

      assertValidRCMLDocument(doc);
    });
  });

  describe('createFeedbackRequestEmail', () => {
    it('should produce valid RCML', () => {
      const doc = createFeedbackRequestEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        feedbackUrl: 'https://example.com/feedback',
        text: {
          preheader: 'Thank you for your visit!',
          greeting: 'Thank you',
          message: 'We would love to hear about your experience.',
          ctaButton: 'Leave Feedback',
        },
        fieldNames: {
          firstName: 'Booking.FirstName',
        },
      });

      assertValidRCMLDocument(doc);
      const json = docToString(doc);
      expect(json).toContain('Leave Feedback');
      expect(json).toContain('https://example.com/feedback');
    });
  });

  describe('createReservationRequestEmail', () => {
    it('should produce valid RCML', () => {
      const doc = createReservationRequestEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        text: {
          preheader: 'We received your request',
          greeting: 'Thank you',
          message: 'We have received your reservation request and will confirm shortly.',
          detailsHeading: 'Your Request',
          referenceLabel: 'Reference',
          dateLabel: 'Dates',
          guestsLabel: 'Guests',
        },
        fieldNames: {
          firstName: 'Booking.FirstName',
          bookingRef: 'Booking.BookingRef',
          checkInDate: 'Booking.CheckInDate',
          checkOutDate: 'Booking.CheckOutDate',
          totalGuests: 'Booking.TotalGuests',
        },
      });

      assertValidRCMLDocument(doc);
      const json = docToString(doc);
      expect(json).toContain('Your Request');
      expect(json).toContain('100006'); // TotalGuests field ID
    });

    it('should handle single date (no checkout)', () => {
      const doc = createReservationRequestEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        text: {
          preheader: 'Request received',
          greeting: 'Hi',
          message: 'We got your request.',
          detailsHeading: 'Details',
          referenceLabel: 'Ref',
          dateLabel: 'Date',
          guestsLabel: 'Guests',
        },
        fieldNames: {
          firstName: 'Booking.FirstName',
          bookingRef: 'Booking.BookingRef',
          checkInDate: 'Booking.CheckInDate',
          totalGuests: 'Booking.TotalGuests',
        },
      });

      assertValidRCMLDocument(doc);
    });
  });
});

// ============================================================================
// E-commerce Templates
// ============================================================================

describe('E-commerce Templates', () => {
  describe('createOrderConfirmationEmail', () => {
    it('should produce valid RCML', () => {
      const doc = createOrderConfirmationEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://shop.example.com/orders',
        text: {
          preheader: 'Your order has been confirmed!',
          greeting: 'Hi',
          intro: 'Thank you for your order. Here are the details:',
          detailsHeading: 'Order Summary',
          orderRefLabel: 'Order',
          totalLabel: 'Total',
          ctaButton: 'View Order',
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.Number',
          totalPrice: 'Order.TotalPrice',
        },
      });

      assertValidRCMLDocument(doc);
      const json = docToString(doc);
      expect(json).toContain('Order Summary');
      expect(json).toContain('200001'); // FirstName field ID
      expect(json).toContain('200003'); // Order.Number field ID
    });

    it('should include optional items and shipping fields', () => {
      const doc = createOrderConfirmationEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://shop.example.com',
        text: {
          preheader: 'Order confirmed',
          greeting: 'Hello',
          intro: 'Your order is confirmed.',
          detailsHeading: 'Summary',
          orderRefLabel: 'Order #',
          itemsLabel: 'Items',
          totalLabel: 'Total',
          shippingLabel: 'Ship to',
          ctaButton: 'Track Order',
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.Number',
          totalPrice: 'Order.TotalPrice',
          items: 'Order.Products',
          shippingAddress: 'Order.ShippingAddress1',
        },
      });

      assertValidRCMLDocument(doc);
      const json = docToString(doc);
      expect(json).toContain('Items');
      expect(json).toContain('Ship to');
      expect(json).toContain('200014'); // Products field ID
      expect(json).toContain('200016'); // ShippingAddress1 field ID
    });

    it('should work without optional fields', () => {
      const doc = createOrderConfirmationEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://shop.example.com',
        text: {
          preheader: 'Confirmed',
          greeting: 'Hi',
          intro: 'Done.',
          detailsHeading: 'Order',
          orderRefLabel: 'Ref',
          totalLabel: 'Total',
          ctaButton: 'View',
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.Number',
          totalPrice: 'Order.TotalPrice',
        },
      });

      assertValidRCMLDocument(doc);
      const json = docToString(doc);
      // Should NOT have items/shipping labels
      expect(json).not.toContain('Items');
      expect(json).not.toContain('Ship to');
    });

    it('should render rc-loop when item sub-fields are provided', () => {
      const doc = createOrderConfirmationEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://shop.example.com',
        text: {
          preheader: 'Confirmed',
          greeting: 'Hi',
          intro: 'Thanks!',
          detailsHeading: 'Summary',
          orderRefLabel: 'Order',
          totalLabel: 'Total',
          ctaButton: 'View',
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.Number',
          totalPrice: 'Order.TotalPrice',
          items: 'Order.Products',
          itemName: 'name',
          itemQuantity: 'quantity',
          itemUnitPrice: 'price',
          itemTotal: 'total',
        },
      });

      assertValidRCMLDocument(doc);
      const json = docToString(doc);

      // Loop block present
      expect(json).toContain('rc-loop');
      expect(json).toContain('custom-field');
      expect(json).toContain('200014'); // Products field as loop-value

      // Line item sub-fields (JSON key names, not numeric IDs)
      expect(json).toContain('[LoopValue:name]');
      expect(json).toContain('[LoopValue:quantity]');
      expect(json).toContain('[LoopValue:price]');
      expect(json).toContain('[LoopValue:total]');
    });

    it('should use custom label values when provided', () => {
      const doc = createOrderConfirmationEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://shop.example.com',
        text: {
          preheader: 'Confirmed',
          greeting: 'Hi',
          intro: 'Thanks!',
          detailsHeading: 'Summary',
          orderRefLabel: 'Order',
          totalLabel: 'Total',
          ctaButton: 'View',
          itemQtyLabel: 'Antal: ',
          itemUnitPriceLabel: 'Pris: ',
          itemSubtotalLabel: 'Delsumma: ',
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.Number',
          totalPrice: 'Order.TotalPrice',
          items: 'Order.Products',
          itemName: 'name',
          itemQuantity: 'quantity',
          itemUnitPrice: 'price',
          itemTotal: 'total',
        },
      });

      assertValidRCMLDocument(doc);
      const json = docToString(doc);

      // Custom labels should appear
      expect(json).toContain('Antal: ');
      expect(json).toContain('Pris: ');
      expect(json).toContain('Delsumma: ');

      // Default English labels should NOT appear
      expect(json).not.toContain('Qty: ');
      expect(json).not.toContain('Price: ');
      expect(json).not.toContain('Subtotal: ');
    });

    it('should use default English labels when custom labels not provided', () => {
      const doc = createOrderConfirmationEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://shop.example.com',
        text: {
          preheader: 'Confirmed',
          greeting: 'Hi',
          intro: 'Thanks!',
          detailsHeading: 'Summary',
          orderRefLabel: 'Order',
          totalLabel: 'Total',
          ctaButton: 'View',
          // No itemQtyLabel, itemUnitPriceLabel, or itemSubtotalLabel
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.Number',
          totalPrice: 'Order.TotalPrice',
          items: 'Order.Products',
          itemName: 'name',
          itemQuantity: 'quantity',
          itemUnitPrice: 'price',
          itemTotal: 'total',
        },
      });

      assertValidRCMLDocument(doc);
      const json = docToString(doc);

      // Default English labels should appear
      expect(json).toContain('Qty: ');
      expect(json).toContain('Price: ');
      expect(json).toContain('Subtotal: ');
    });

    it('should fall back to single-field items when no sub-fields', () => {
      const doc = createOrderConfirmationEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://shop.example.com',
        text: {
          preheader: 'Confirmed',
          greeting: 'Hi',
          intro: 'Thanks!',
          detailsHeading: 'Summary',
          orderRefLabel: 'Order',
          itemsLabel: 'Items',
          totalLabel: 'Total',
          ctaButton: 'View',
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.Number',
          totalPrice: 'Order.TotalPrice',
          items: 'Order.Products',
          // No itemName etc. — should use single placeholder
        },
      });

      assertValidRCMLDocument(doc);
      const json = docToString(doc);

      // Should NOT have a loop
      expect(json).not.toContain('rc-loop');
      // Should have the items field as a single placeholder
      expect(json).toContain('200014'); // Products field ID
    });

    it('renders the hero heading when prefix/suffix text supplied', () => {
      const doc = createOrderConfirmationEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://shop.example.com',
        text: {
          preheader: 'Confirmed',
          greeting: 'Hi',
          intro: 'Thanks!',
          detailsHeading: 'Order Summary',
          orderRefLabel: 'Order',
          totalLabel: 'Total',
          ctaButton: 'View',
          heroHeadingPrefix: 'Order',
          heroHeadingSuffix: 'confirmed',
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.Number',
          totalPrice: 'Order.TotalPrice',
        },
      });

      const json = docToString(doc);
      // Hero heading wraps orderRef placeholder with prefix/suffix text
      expect(json).toContain('Order ');
      expect(json).toContain(' confirmed');
    });

    it('renders a two-column meta row when orderDate label+field supplied', () => {
      const doc = createOrderConfirmationEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://shop.example.com',
        text: {
          preheader: 'Confirmed',
          greeting: 'Hi',
          intro: 'Thanks!',
          detailsHeading: 'Order Summary',
          orderRefLabel: 'Order',
          totalLabel: 'Total',
          ctaButton: 'View',
          orderDateLabel: 'Order date',
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.Number',
          totalPrice: 'Order.TotalPrice',
          orderDate: 'Order.Date',
        },
      });

      const json = docToString(doc);
      expect(json).toContain('Order date');
      expect(json).toContain('200004'); // Order.Date field ID
    });

    it('renders financial summary when any financial field is mapped', () => {
      const doc = createOrderConfirmationEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://shop.example.com',
        text: {
          preheader: 'Confirmed',
          greeting: 'Hi',
          intro: 'Thanks!',
          detailsHeading: 'Order Summary',
          orderRefLabel: 'Order',
          totalLabel: 'Total',
          ctaButton: 'View',
          subtotalLabel: 'Subtotal',
          taxLabel: 'Tax',
          discountLabel: 'Discount',
          shippingCostLabel: 'Shipping',
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.Number',
          totalPrice: 'Order.TotalPrice',
          subtotal: 'Order.Subtotal',
          taxAmount: 'Order.TaxAmount',
          discountAmount: 'Order.DiscountAmount',
          shippingCost: 'Order.ShippingCost',
        },
      });

      const json = docToString(doc);
      expect(json).toContain('Subtotal: ');
      expect(json).toContain('Tax: ');
      expect(json).toContain('Discount: ');
      expect(json).toContain('Shipping: ');
      expect(json).toContain('200030'); // Order.Subtotal
      expect(json).toContain('200033'); // Order.ShippingCost
    });

    it('renders address block when extended shipping fields are mapped', () => {
      const doc = createOrderConfirmationEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://shop.example.com',
        text: {
          preheader: 'Confirmed',
          greeting: 'Hi',
          intro: 'Thanks!',
          detailsHeading: 'Order Summary',
          orderRefLabel: 'Order',
          totalLabel: 'Total',
          ctaButton: 'View',
          shippingAddressHeading: 'Shipping to',
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.Number',
          totalPrice: 'Order.TotalPrice',
          shippingAddress: 'Order.ShippingAddress1',
          shippingCity: 'Order.ShippingCity',
          shippingZip: 'Order.ShippingZip',
          shippingCountryCode: 'Order.ShippingCountryCode',
        },
      });

      const json = docToString(doc);
      expect(json).toContain('Shipping to');
      expect(json).toContain('200016'); // address1
      expect(json).toContain('200018'); // city
      expect(json).toContain('200019'); // zip
      expect(json).toContain('200020'); // country
    });

    it('omits hero heading, meta row, financial summary and address block when not configured', () => {
      const doc = createOrderConfirmationEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://shop.example.com',
        text: {
          preheader: 'Confirmed',
          greeting: 'Hi',
          intro: 'Thanks!',
          detailsHeading: 'Order Summary',
          orderRefLabel: 'Order',
          totalLabel: 'Total',
          ctaButton: 'View',
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.Number',
          totalPrice: 'Order.TotalPrice',
        },
      });

      const json = docToString(doc);
      expect(json).not.toContain('Order date');
      expect(json).not.toContain('Subtotal: ');
      expect(json).not.toContain('Shipping to');
    });

    it('throws when an extended shipping field is mapped without shippingAddress', () => {
      expect(() =>
        createOrderConfirmationEmail({
          brandStyle: TEST_BRAND_STYLE,
          customFields: TEST_CUSTOM_FIELDS,
          websiteUrl: 'https://shop.example.com',
          text: {
            preheader: 'Confirmed',
            greeting: 'Hi',
            intro: 'Thanks!',
            detailsHeading: 'Order Summary',
            orderRefLabel: 'Order',
            totalLabel: 'Total',
            ctaButton: 'View',
          },
          fieldNames: {
            firstName: 'Subscriber.FirstName',
            orderRef: 'Order.Number',
            totalPrice: 'Order.TotalPrice',
            // shippingAddress intentionally omitted
            shippingCity: 'Order.ShippingCity',
          },
        })
      ).toThrow(RuleConfigError);
    });

    it('keeps total in details box when financial fields are mapped without labels', () => {
      // Regression: hasFinancialSummary must require both fieldName + label so
      // a mapped field with no label cannot relocate the total row into a
      // near-empty summary box.
      const doc = createOrderConfirmationEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://shop.example.com',
        text: {
          preheader: 'Confirmed',
          greeting: 'Hi',
          intro: 'Thanks!',
          detailsHeading: 'Order Summary',
          orderRefLabel: 'Order',
          totalLabel: 'Total',
          ctaButton: 'View',
          // subtotalLabel intentionally omitted
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.Number',
          totalPrice: 'Order.TotalPrice',
          subtotal: 'Order.Subtotal',
        },
      });

      const json = docToString(doc);
      // Total still rendered exactly once (in the details box, not the summary)
      expect(json.match(/Total: /g)).toHaveLength(1);
      expect(json).not.toContain('Subtotal: ');
    });

    it('renders SKU loop row when itemSku sub-field is provided', () => {
      const doc = createOrderConfirmationEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://shop.example.com',
        text: {
          preheader: 'Confirmed',
          greeting: 'Hi',
          intro: 'Thanks!',
          detailsHeading: 'Order Summary',
          orderRefLabel: 'Order',
          totalLabel: 'Total',
          ctaButton: 'View',
          itemSkuLabel: 'SKU: ',
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.Number',
          totalPrice: 'Order.TotalPrice',
          items: 'Order.Products',
          itemName: 'name',
          itemSku: 'sku',
        },
      });

      const json = docToString(doc);
      expect(json).toContain('SKU: ');
      expect(json).toContain('[LoopValue:sku]');
    });

    it('does not throw when optional fields are mapped without their render partners', () => {
      // Regression: validation must match render gates. Mapping `subtotal`,
      // `discountAmount`, `taxAmount`, `shippingCost`, `paymentMethod`, or
      // `orderDate` without the paired label means the row skips silently at
      // render — validateCustomFields must not demand a customFields entry.
      expect(() =>
        createOrderConfirmationEmail({
          brandStyle: TEST_BRAND_STYLE,
          customFields: TEST_CUSTOM_FIELDS,
          websiteUrl: 'https://shop.example.com',
          text: {
            preheader: 'Confirmed',
            greeting: 'Hi',
            intro: 'Thanks!',
            detailsHeading: 'Order Summary',
            orderRefLabel: 'Order',
            totalLabel: 'Total',
            ctaButton: 'View',
          },
          fieldNames: {
            firstName: 'Subscriber.FirstName',
            orderRef: 'Order.Number',
            totalPrice: 'Order.TotalPrice',
            // All of these are mapped to fields that don't exist in
            // TEST_CUSTOM_FIELDS — but none of their label partners are set,
            // so they shouldn't be rendered and shouldn't be validated.
            subtotal: 'Order.MissingSubtotal',
            discountAmount: 'Order.MissingDiscount',
            taxAmount: 'Order.MissingTax',
            shippingCost: 'Order.MissingShipping',
            paymentMethod: 'Order.MissingPayment',
            orderDate: 'Order.MissingDate',
          },
        })
      ).not.toThrow();
    });

    it('still throws when a field whose render partners are set is missing from customFields', () => {
      // Rejection test for the same pattern: when both label and fieldName
      // are set, the row WILL render, so validation must catch missing fields.
      expect(() =>
        createOrderConfirmationEmail({
          brandStyle: TEST_BRAND_STYLE,
          customFields: TEST_CUSTOM_FIELDS,
          websiteUrl: 'https://shop.example.com',
          text: {
            preheader: 'Confirmed',
            greeting: 'Hi',
            intro: 'Thanks!',
            detailsHeading: 'Order Summary',
            orderRefLabel: 'Order',
            totalLabel: 'Total',
            subtotalLabel: 'Subtotal',
            ctaButton: 'View',
          },
          fieldNames: {
            firstName: 'Subscriber.FirstName',
            orderRef: 'Order.Number',
            totalPrice: 'Order.TotalPrice',
            subtotal: 'Order.MissingSubtotal',
          },
        })
      ).toThrow(RuleConfigError);
    });

    it('does not duplicate the template name prefix in validation errors', () => {
      // Regression: validateCustomFields used to prepend templateName itself,
      // and withTemplateContext also prepends it — producing
      // "createOrderConfirmationEmail > createOrderConfirmationEmail: missing …".
      // The prefix must appear exactly once.
      try {
        createOrderConfirmationEmail({
          brandStyle: TEST_BRAND_STYLE,
          customFields: TEST_CUSTOM_FIELDS,
          websiteUrl: 'https://shop.example.com',
          text: {
            preheader: 'Confirmed',
            greeting: 'Hi',
            intro: 'Thanks!',
            detailsHeading: 'Order Summary',
            orderRefLabel: 'Order',
            totalLabel: 'Total',
            ctaButton: 'View',
          },
          fieldNames: {
            firstName: 'Subscriber.FirstName',
            orderRef: 'Order.MissingOrderRef',
            totalPrice: 'Order.TotalPrice',
          },
        });
        throw new Error('expected throw');
      } catch (error) {
        expect(error).toBeInstanceOf(RuleConfigError);
        const msg = (error as RuleConfigError).message;
        expect(msg).toBe(
          'createOrderConfirmationEmail > missing customFields entry for fieldNames.orderRef ("Order.MissingOrderRef")'
        );
        expect(msg.split('createOrderConfirmationEmail').length - 1).toBe(1);
      }
    });
  });

  describe('createShippingUpdateEmail', () => {
    it('should produce valid RCML', () => {
      const doc = createShippingUpdateEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        trackingUrl: 'https://track.example.com',
        text: {
          preheader: 'Your order has shipped!',
          heading: 'Your Order is On Its Way',
          greeting: 'Hi',
          message: 'your order has been shipped.',
          orderRefLabel: 'Order',
          trackingLabel: 'Tracking #',
          estimatedDeliveryLabel: 'Estimated Delivery',
          ctaButton: 'Track Package',
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.Number',
          trackingNumber: 'Order.TrackingNumber',
          estimatedDelivery: 'Order.EstimatedDelivery',
        },
      });

      assertValidRCMLDocument(doc);
      const json = docToString(doc);
      expect(json).toContain('Track Package');
      expect(json).toContain('https://track.example.com');
      expect(json).toContain('200021'); // TrackingNumber field ID
    });

    it('should work without optional tracking fields', () => {
      const doc = createShippingUpdateEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        trackingUrl: 'https://track.example.com',
        text: {
          preheader: 'Shipped!',
          heading: 'Shipped',
          greeting: 'Hi',
          message: 'your order shipped.',
          orderRefLabel: 'Order',
          ctaButton: 'Track',
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.Number',
        },
      });

      assertValidRCMLDocument(doc);
    });

    it('should render receipt sections when receipt fields provided', () => {
      const doc = createShippingUpdateEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        trackingUrl: 'https://track.example.com',
        text: {
          preheader: 'Shipped!',
          heading: 'Shipping Confirmation & Receipt',
          greeting: 'Hi',
          message: 'your order has been shipped!',
          orderRefLabel: 'Order',
          trackingLabel: 'Tracking',
          estimatedDeliveryLabel: 'Est. delivery',
          ctaButton: 'Track Shipment',
          companyLabel: 'Seller',
          vatLabel: 'VAT',
          orderDateLabel: 'Date',
          paymentMethodLabel: 'Payment',
          customerEmailLabel: 'Email',
          shippingAddressLabel: 'Ship to',
          carrierLabel: 'Carrier',
          lineItemsHeading: 'Items',
          subtotalLabel: 'Subtotal',
          taxLabel: 'Tax',
          discountLabel: 'Discount',
          shippingCostLabel: 'Shipping',
          totalLabel: 'Total',
          billingAddressLabel: 'Bill to',
          legalText: 'This is your receipt.',
          returnPolicyText: 'Return Policy',
          returnPolicyUrl: 'https://shop.example.com/returns',
          termsText: 'Terms',
          termsUrl: 'https://shop.example.com/terms',
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.Number',
          trackingNumber: 'Order.TrackingNumber',
          estimatedDelivery: 'Order.EstimatedDelivery',
          customerFullName: 'Order.CustomerFullName',
          customerEmail: 'Order.CustomerEmail',
          orderDate: 'Order.OrderDate',
          billingAddress: 'Order.BillingAddress',
          companyName: 'Order.CompanyName',
          vatNumber: 'Order.VATNumber',
          paymentMethod: 'Order.PaymentMethod',
          currency: 'Order.Currency',
          subtotal: 'Order.Subtotal',
          taxAmount: 'Order.TaxAmount',
          discountAmount: 'Order.DiscountAmount',
          shippingCost: 'Order.ShippingCost',
          shippingAddress: 'Order.ShippingAddress1',
          shippingCarrier: 'Order.ShippingCarrier',
          totalPrice: 'Order.TotalPrice',
          items: 'Order.Products',
          itemName: 'name',
          itemQuantity: 'quantity',
          itemUnitPrice: 'price',
          itemTotal: 'total',
          itemSku: 'sku',
        },
      });

      assertValidRCMLDocument(doc);
      const json = docToString(doc);

      // Receipt sections present
      expect(json).toContain('Seller');
      expect(json).toContain('VAT');
      expect(json).toContain('Subtotal');
      expect(json).toContain('Tax');
      expect(json).toContain('Total');
      expect(json).toContain('This is your receipt.');
      expect(json).toContain('Return Policy');
      expect(json).toContain('https://shop.example.com/returns');

      // Loop block for line items
      expect(json).toContain('rc-loop');
      expect(json).toContain('custom-field');
      expect(json).toContain('200014'); // Products field ID as loop-value

      // Line item sub-fields in loop (JSON key names)
      expect(json).toContain('[LoopValue:name]');
      expect(json).toContain('[LoopValue:sku]');
    });

    it('should use default English labels for ShippingUpdate line items', () => {
      const doc = createShippingUpdateEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        trackingUrl: 'https://track.example.com',
        text: {
          preheader: 'Shipped!',
          heading: 'Shipped',
          greeting: 'Hi',
          message: 'shipped.',
          orderRefLabel: 'Order',
          ctaButton: 'Track',
          lineItemsHeading: 'Items',
          // No label overrides — defaults should apply
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.Number',
          items: 'Order.Products',
          itemName: 'name',
          itemQuantity: 'quantity',
          itemUnitPrice: 'price',
          itemTotal: 'total',
          itemSku: 'sku',
        },
      });

      assertValidRCMLDocument(doc);
      const json = docToString(doc);

      // Default English labels should appear
      expect(json).toContain('SKU: ');
      expect(json).toContain('Qty: ');
      expect(json).toContain('Unit price: ');
      expect(json).toContain('Line total: ');
    });

    it('should use custom labels for ShippingUpdate line items when provided', () => {
      const doc = createShippingUpdateEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        trackingUrl: 'https://track.example.com',
        text: {
          preheader: 'Shipped!',
          heading: 'Shipped',
          greeting: 'Hi',
          message: 'shipped.',
          orderRefLabel: 'Order',
          ctaButton: 'Track',
          lineItemsHeading: 'Items',
          itemSkuLabel: 'Artikelnr: ',
          itemQtyLabel: 'Antal: ',
          itemUnitPriceLabel: 'Styckpris: ',
          itemLineTotalLabel: 'Radsumma: ',
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.Number',
          items: 'Order.Products',
          itemName: 'name',
          itemQuantity: 'quantity',
          itemUnitPrice: 'price',
          itemTotal: 'total',
          itemSku: 'sku',
        },
      });

      assertValidRCMLDocument(doc);
      const json = docToString(doc);

      // Custom labels should appear
      expect(json).toContain('Artikelnr: ');
      expect(json).toContain('Antal: ');
      expect(json).toContain('Styckpris: ');
      expect(json).toContain('Radsumma: ');

      // Default English labels should NOT appear
      expect(json).not.toContain('SKU: ');
      expect(json).not.toContain('Qty: ');
      expect(json).not.toContain('Unit price: ');
      expect(json).not.toContain('Line total: ');
    });

    it('should render identically to base when no receipt fields provided', () => {
      const baseDoc = createShippingUpdateEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        trackingUrl: 'https://track.example.com',
        text: {
          preheader: 'Shipped!',
          heading: 'Shipped',
          greeting: 'Hi',
          message: 'shipped.',
          orderRefLabel: 'Order',
          ctaButton: 'Track',
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.Number',
        },
      });

      assertValidRCMLDocument(baseDoc);
      const json = docToString(baseDoc);

      // No receipt content
      expect(json).not.toContain('rc-loop');
      expect(json).not.toContain('Subtotal');
      expect(json).not.toContain('receipt');
    });

    it('renders a 3-step status tracker when all three labels supplied', () => {
      const doc = createShippingUpdateEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        trackingUrl: 'https://track.example.com',
        text: {
          preheader: 'Shipped',
          heading: 'On its way',
          greeting: 'Hi',
          message: 'shipped!',
          orderRefLabel: 'Order',
          ctaButton: 'Track',
          statusConfirmedLabel: 'Confirmed',
          statusShippedLabel: 'Shipped',
          statusDeliveredLabel: 'Delivered',
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.Number',
        },
      });

      const json = docToString(doc);
      expect(json).toContain('Confirmed');
      expect(json).toContain('Shipped');
      expect(json).toContain('Delivered');
      // Active step (Shipped, activeIndex=1) uses the button color as background
      expect(json).toContain('#0066CC');
    });

    it('rejects status trackers with more than 4 steps', () => {
      expect(() =>
        createStatusTrackerSection({
          steps: [
            { label: 'a' },
            { label: 'b' },
            { label: 'c' },
            { label: 'd' },
            { label: 'e' },
          ],
          activeIndex: 0,
          brandStyle: TEST_BRAND_STYLE,
        })
      ).toThrow(RuleConfigError);
    });

    it('rejects status trackers with activeIndex out of range', () => {
      expect(() =>
        createStatusTrackerSection({
          steps: [{ label: 'a' }, { label: 'b' }],
          activeIndex: 5,
          brandStyle: TEST_BRAND_STYLE,
        })
      ).toThrow(RuleConfigError);
      expect(() =>
        createStatusTrackerSection({
          steps: [{ label: 'a' }, { label: 'b' }],
          activeIndex: -1,
          brandStyle: TEST_BRAND_STYLE,
        })
      ).toThrow(RuleConfigError);
    });

    it('rejects empty step lists', () => {
      expect(() =>
        createStatusTrackerSection({
          steps: [],
          activeIndex: 0,
          brandStyle: TEST_BRAND_STYLE,
        })
      ).toThrow(RuleConfigError);
    });

    it('distributes rounding remainder so column widths sum to 100%', () => {
      const section = createStatusTrackerSection({
        steps: [{ label: 'a' }, { label: 'b' }, { label: 'c' }],
        activeIndex: 0,
        brandStyle: TEST_BRAND_STYLE,
      });
      const widths = (section as { children: { attributes: { width: string } }[] }).children.map(
        (col) => parseInt(col.attributes.width, 10)
      );
      expect(widths.reduce((a, b) => a + b, 0)).toBe(100);
    });

    it('omits the status tracker when any step label is missing', () => {
      const doc = createShippingUpdateEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        trackingUrl: 'https://track.example.com',
        text: {
          preheader: 'Shipped',
          heading: 'On its way',
          greeting: 'Hi',
          message: 'shipped!',
          orderRefLabel: 'Order',
          ctaButton: 'Track',
          // Only two of three labels supplied — tracker should NOT render
          statusConfirmedLabel: 'Confirmed',
          statusShippedLabel: 'Shipped',
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.Number',
        },
      });

      const json = docToString(doc);
      expect(json).not.toContain('Confirmed');
      expect(json).not.toContain('Delivered');
    });

    it('does not throw when optional receipt fields are mapped without their labels', () => {
      // Regression: every detailRow in shipping update skips silently when
      // either the label or fieldName is missing. Validation must match.
      expect(() =>
        createShippingUpdateEmail({
          brandStyle: TEST_BRAND_STYLE,
          customFields: TEST_CUSTOM_FIELDS,
          trackingUrl: 'https://track.example.com',
          text: {
            preheader: 'Shipped',
            heading: 'Shipped',
            greeting: 'Hi',
            message: 'your order has shipped.',
            orderRefLabel: 'Order',
            ctaButton: 'Track',
          },
          fieldNames: {
            firstName: 'Subscriber.FirstName',
            orderRef: 'Order.Number',
            // All mapped to fields not in TEST_CUSTOM_FIELDS, but none of
            // their label partners are set — so none render, none validate.
            trackingNumber: 'Order.MissingTracking',
            orderDate: 'Order.MissingDate',
            billingAddress: 'Order.MissingBilling',
            companyName: 'Order.MissingCompany',
            vatNumber: 'Order.MissingVat',
            subtotal: 'Order.MissingSubtotal',
            taxAmount: 'Order.MissingTax',
            totalPrice: 'Order.MissingTotal',
          },
        })
      ).not.toThrow();
    });

    it('still throws when a field whose label is set is missing from customFields', () => {
      expect(() =>
        createShippingUpdateEmail({
          brandStyle: TEST_BRAND_STYLE,
          customFields: TEST_CUSTOM_FIELDS,
          trackingUrl: 'https://track.example.com',
          text: {
            preheader: 'Shipped',
            heading: 'Shipped',
            greeting: 'Hi',
            message: 'your order has shipped.',
            orderRefLabel: 'Order',
            trackingLabel: 'Tracking',
            ctaButton: 'Track',
          },
          fieldNames: {
            firstName: 'Subscriber.FirstName',
            orderRef: 'Order.Number',
            trackingNumber: 'Order.MissingTracking',
          },
        })
      ).toThrow(RuleConfigError);
    });
  });

  describe('createAbandonedCartEmail', () => {
    it('should produce valid RCML', () => {
      const doc = createAbandonedCartEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        cartUrl: 'https://shop.example.com/cart',
        text: {
          preheader: 'Did you forget something?',
          greeting: 'Hey',
          message: 'You left some items in your cart.',
          reminder: 'Complete your purchase before they sell out!',
          ctaButton: 'Return to Cart',
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
        },
      });

      assertValidRCMLDocument(doc);
      const json = docToString(doc);
      expect(json).toContain('Return to Cart');
      expect(json).toContain('https://shop.example.com/cart');
      expect(json).toContain('left some items');
    });

    it('renders cart line items loop when items + itemName are mapped', () => {
      const doc = createAbandonedCartEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        cartUrl: 'https://shop.example.com/cart',
        text: {
          preheader: 'Cart waiting',
          greeting: 'Hi',
          message: 'Your cart is waiting.',
          reminder: 'Hurry!',
          ctaButton: 'Checkout',
          lineItemsHeading: 'Your Cart',
          itemQtyLabel: 'Qty: ',
          itemSkuLabel: 'SKU: ',
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          items: 'Order.Products',
          itemName: 'name',
          itemQuantity: 'quantity',
          itemSku: 'sku',
        },
      });

      const json = docToString(doc);
      expect(json).toContain('rc-loop');
      expect(json).toContain('Your Cart');
      expect(json).toContain('[LoopValue:name]');
      expect(json).toContain('[LoopValue:quantity]');
      expect(json).toContain('[LoopValue:sku]');
    });

    it('renders cart total when totalLabel + totalPrice supplied', () => {
      const doc = createAbandonedCartEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        cartUrl: 'https://shop.example.com/cart',
        text: {
          preheader: 'Cart',
          greeting: 'Hi',
          message: 'You left items.',
          reminder: 'Back soon!',
          ctaButton: 'Cart',
          totalLabel: 'Total',
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          totalPrice: 'Order.TotalPrice',
        },
      });

      const json = docToString(doc);
      expect(json).toContain('Total: ');
      expect(json).toContain('200005'); // Order.TotalPrice
    });

    it('renders social icons when brandStyle.socialLinks is provided', () => {
      const doc = createAbandonedCartEmail({
        brandStyle: {
          ...TEST_BRAND_STYLE,
          socialLinks: [
            { name: 'facebook', href: 'https://facebook.com/shop' },
            { name: 'instagram', href: 'https://instagram.com/shop' },
          ],
        },
        customFields: TEST_CUSTOM_FIELDS,
        cartUrl: 'https://shop.example.com/cart',
        text: {
          preheader: 'Cart',
          greeting: 'Hi',
          message: 'You left items.',
          reminder: 'Back soon!',
          ctaButton: 'Cart',
        },
        fieldNames: { firstName: 'Subscriber.FirstName' },
      });

      const json = docToString(doc);
      expect(json).toContain('rc-social');
      expect(json).toContain('facebook');
      expect(json).toContain('instagram');
    });

    it('omits line items, total row and social section when not configured', () => {
      const doc = createAbandonedCartEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        cartUrl: 'https://shop.example.com/cart',
        text: {
          preheader: 'Cart',
          greeting: 'Hi',
          message: 'Come back!',
          reminder: 'Soon!',
          ctaButton: 'Cart',
        },
        fieldNames: { firstName: 'Subscriber.FirstName' },
      });

      const json = docToString(doc);
      expect(json).not.toContain('rc-loop');
      expect(json).not.toContain('rc-social');
      expect(json).not.toContain('Total: ');
    });
  });

  describe('createOrderCancellationEmail', () => {
    it('should produce valid RCML', () => {
      const doc = createOrderCancellationEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://shop.example.com',
        text: {
          preheader: 'Your order has been cancelled',
          heading: 'Order Cancelled',
          greeting: 'Hello',
          message: 'Your order has been cancelled as requested.',
          orderRefLabel: 'Order',
          followUp: 'If this was a mistake, please place a new order.',
          ctaButton: 'Shop Again',
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.Number',
        },
      });

      assertValidRCMLDocument(doc);
      const json = docToString(doc);
      expect(json).toContain('Order Cancelled');
      expect(json).toContain('Shop Again');
      expect(json).toContain('200003'); // Order.Number field ID
    });

    it('renders order date when orderDate field + label supplied', () => {
      const doc = createOrderCancellationEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://shop.example.com',
        text: {
          preheader: 'Cancelled',
          heading: 'Order Cancelled',
          greeting: 'Hi',
          message: 'Cancelled as requested.',
          orderRefLabel: 'Order',
          orderDateLabel: 'Order date',
          followUp: 'Sorry!',
          ctaButton: 'Shop',
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.Number',
          orderDate: 'Order.Date',
        },
      });

      const json = docToString(doc);
      expect(json).toContain('Order date');
      expect(json).toContain('200004'); // Order.Date
    });

    it('renders support callout with email link when supportEmail supplied', () => {
      const doc = createOrderCancellationEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://shop.example.com',
        text: {
          preheader: 'Cancelled',
          heading: 'Order Cancelled',
          greeting: 'Hi',
          message: 'Cancelled.',
          orderRefLabel: 'Order',
          followUp: 'Bye.',
          ctaButton: 'Shop',
          supportText: 'Need help?',
          supportEmail: 'help@shop.example.com',
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.Number',
        },
      });

      const json = docToString(doc);
      expect(json).toContain('Need help?');
      // Email local parts and @ get percent-encoded by encodeURIComponent,
      // which prevents mailto parameter injection.
      expect(json).toContain('mailto:help%40shop.example.com');
    });

    it('omits the support callout when supportText is not supplied', () => {
      const doc = createOrderCancellationEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://shop.example.com',
        text: {
          preheader: 'Cancelled',
          heading: 'Order Cancelled',
          greeting: 'Hi',
          message: 'Cancelled.',
          orderRefLabel: 'Order',
          followUp: 'Bye.',
          ctaButton: 'Shop',
          supportEmail: 'help@shop.example.com',
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.Number',
        },
      });

      const json = docToString(doc);
      expect(json).not.toContain('mailto:help%40shop.example.com');
    });

    it('uses the sanitized URL as link text so displayed text and href stay in sync', () => {
      // sanitizeUrl trims whitespace; displayed link text must reflect that.
      const doc = createOrderCancellationEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://shop.example.com',
        text: {
          preheader: 'Cancelled',
          heading: 'Order Cancelled',
          greeting: 'Hi',
          message: 'Cancelled.',
          orderRefLabel: 'Order',
          followUp: 'Bye.',
          ctaButton: 'Shop',
          supportText: 'Need help?',
          supportUrl: '  https://support.example.com  ',
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.Number',
        },
      });

      const json = docToString(doc);
      // Raw padded URL must not appear as displayed text
      expect(json).not.toContain('  https://support.example.com  ');
      expect(json).toContain('https://support.example.com');
    });

    it('rejects support emails containing reserved URI characters that could inject mailto parameters', () => {
      // `?`, `#`, `&`, `/`, `:` in a mailto address can hijack headers or URL parsing
      const injectionAttempts = [
        'help@shop.example.com?bcc=attacker@evil.com',
        'help@shop.example.com&bcc=attacker@evil.com',
        'help@shop.example.com#fragment',
        'help:password@shop.example.com',
        'help/path@shop.example.com',
      ];
      for (const supportEmail of injectionAttempts) {
        expect(() =>
          createOrderCancellationEmail({
            brandStyle: TEST_BRAND_STYLE,
            customFields: TEST_CUSTOM_FIELDS,
            websiteUrl: 'https://shop.example.com',
            text: {
              preheader: 'Cancelled',
              heading: 'Order Cancelled',
              greeting: 'Hi',
              message: 'Cancelled.',
              orderRefLabel: 'Order',
              followUp: 'Bye.',
              ctaButton: 'Shop',
              supportText: 'Need help?',
              supportEmail,
            },
            fieldNames: {
              firstName: 'Subscriber.FirstName',
              orderRef: 'Order.Number',
            },
          })
        ).toThrow(RuleConfigError);
      }
    });

    it('rejects support emails containing whitespace or control characters', () => {
      expect(() =>
        createOrderCancellationEmail({
          brandStyle: TEST_BRAND_STYLE,
          customFields: TEST_CUSTOM_FIELDS,
          websiteUrl: 'https://shop.example.com',
          text: {
            preheader: 'Cancelled',
            heading: 'Order Cancelled',
            greeting: 'Hi',
            message: 'Cancelled.',
            orderRefLabel: 'Order',
            followUp: 'Bye.',
            ctaButton: 'Shop',
            supportText: 'Need help?',
            supportEmail: 'help@shop.example.com\r\nBcc: attacker@evil.com',
          },
          fieldNames: {
            firstName: 'Subscriber.FirstName',
            orderRef: 'Order.Number',
          },
        })
      ).toThrow(RuleConfigError);

      expect(() =>
        createOrderCancellationEmail({
          brandStyle: TEST_BRAND_STYLE,
          customFields: TEST_CUSTOM_FIELDS,
          websiteUrl: 'https://shop.example.com',
          text: {
            preheader: 'Cancelled',
            heading: 'Order Cancelled',
            greeting: 'Hi',
            message: 'Cancelled.',
            orderRefLabel: 'Order',
            followUp: 'Bye.',
            ctaButton: 'Shop',
            supportText: 'Need help?',
            supportEmail: 'not-an-email',
          },
          fieldNames: {
            firstName: 'Subscriber.FirstName',
            orderRef: 'Order.Number',
          },
        })
      ).toThrow(RuleConfigError);
    });

    it('wraps supportEmail validation error with template prefix exactly once', () => {
      // Regression: the inner throw must not hardcode the template name, since
      // withTemplateContext prepends it. A duplicated prefix would look like
      // "createOrderCancellationEmail > createOrderCancellationEmail: ...".
      try {
        createOrderCancellationEmail({
          brandStyle: TEST_BRAND_STYLE,
          customFields: TEST_CUSTOM_FIELDS,
          websiteUrl: 'https://shop.example.com',
          text: {
            preheader: 'Cancelled',
            heading: 'Order Cancelled',
            greeting: 'Hi',
            message: 'Cancelled.',
            orderRefLabel: 'Order',
            followUp: 'Bye.',
            ctaButton: 'Shop',
            supportText: 'Need help?',
            supportEmail: 'not-an-email',
          },
          fieldNames: {
            firstName: 'Subscriber.FirstName',
            orderRef: 'Order.Number',
          },
        });
        throw new Error('expected createOrderCancellationEmail to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(RuleConfigError);
        const message = (error as RuleConfigError).message;
        const occurrences = message.split('createOrderCancellationEmail').length - 1;
        expect(occurrences).toBe(1);
      }
    });

    it('does not throw when orderDate is mapped without orderDateLabel', () => {
      // Regression: the order-date row uses labeledRow() which skips silently
      // when either side is missing. Validation must match the render gate.
      expect(() =>
        createOrderCancellationEmail({
          brandStyle: TEST_BRAND_STYLE,
          customFields: TEST_CUSTOM_FIELDS,
          websiteUrl: 'https://shop.example.com',
          text: {
            preheader: 'Cancelled',
            heading: 'Order Cancelled',
            greeting: 'Hi',
            message: 'Cancelled.',
            orderRefLabel: 'Order',
            followUp: 'Bye.',
            ctaButton: 'Shop',
          },
          fieldNames: {
            firstName: 'Subscriber.FirstName',
            orderRef: 'Order.Number',
            orderDate: 'Order.MissingDate', // not in customFields, but no label — won't render
          },
        })
      ).not.toThrow();
    });
  });

  describe('createAbandonedCartEmail — items/itemName validation', () => {
    it('does not require items to be mapped in customFields when itemName is not supplied', () => {
      // items mapped but itemName not supplied — loop will not render, so items
      // should not trigger a missing-field validation error.
      expect(() =>
        createAbandonedCartEmail({
          brandStyle: TEST_BRAND_STYLE,
          customFields: TEST_CUSTOM_FIELDS,
          cartUrl: 'https://shop.example.com/cart',
          text: {
            preheader: 'Cart',
            greeting: 'Hi',
            message: 'You left items.',
            reminder: 'Hurry!',
            ctaButton: 'Cart',
          },
          fieldNames: {
            firstName: 'Subscriber.FirstName',
            items: 'Order.UnmappedItems', // not in customFields — no error expected
          },
        })
      ).not.toThrow();
    });

    it('does not require totalPrice to be mapped in customFields when totalLabel is not supplied', () => {
      // Regression: totalPrice used to be validated unconditionally via the
      // destructured `regularFields` split. Without `text.totalLabel` the
      // total row never renders, so an unmapped totalPrice must not throw.
      expect(() =>
        createAbandonedCartEmail({
          brandStyle: TEST_BRAND_STYLE,
          customFields: TEST_CUSTOM_FIELDS,
          cartUrl: 'https://shop.example.com/cart',
          text: {
            preheader: 'Cart',
            greeting: 'Hi',
            message: 'You left items.',
            reminder: 'Hurry!',
            ctaButton: 'Cart',
            // totalLabel intentionally omitted → total row won't render.
          },
          fieldNames: {
            firstName: 'Subscriber.FirstName',
            totalPrice: 'Order.UnmappedTotal', // not in customFields
          },
        })
      ).not.toThrow();
    });

    it('throws when totalPrice is mapped and totalLabel is set but customFields entry is missing', () => {
      // Rejection test: when both partners are set, the total row WILL render,
      // so validation must surface the missing customFields entry.
      expect(() =>
        createAbandonedCartEmail({
          brandStyle: TEST_BRAND_STYLE,
          customFields: TEST_CUSTOM_FIELDS,
          cartUrl: 'https://shop.example.com/cart',
          text: {
            preheader: 'Cart',
            greeting: 'Hi',
            message: 'You left items.',
            reminder: 'Hurry!',
            ctaButton: 'Cart',
            totalLabel: 'Total',
          },
          fieldNames: {
            firstName: 'Subscriber.FirstName',
            totalPrice: 'Order.UnmappedTotal',
          },
        })
      ).toThrow(RuleConfigError);
    });
  });
});

// ============================================================================
// Welcome Email
// ============================================================================

describe('createWelcomeEmail', () => {
  it('produces valid RCML with hero + greeting + CTA', () => {
    const doc = createWelcomeEmail({
      brandStyle: TEST_BRAND_STYLE,
      customFields: TEST_CUSTOM_FIELDS,
      websiteUrl: 'https://shop.example.com',
      text: {
        preheader: 'Welcome aboard',
        heading: 'Welcome!',
        greeting: 'Hi',
        intro: 'Thanks for subscribing to our newsletter.',
        ctaButton: 'Start Shopping',
      },
      fieldNames: { firstName: 'Subscriber.FirstName' },
    });

    assertValidRCMLDocument(doc);
    const json = docToString(doc);
    expect(json).toContain('Welcome!');
    expect(json).toContain('Thanks for subscribing');
    expect(json).toContain('Start Shopping');
    expect(json).toContain('https://shop.example.com');
    expect(json).toContain('[CustomField:200001]'); // Subscriber.FirstName
  });

  it('renders benefits list when benefits array is provided', () => {
    const doc = createWelcomeEmail({
      brandStyle: TEST_BRAND_STYLE,
      customFields: TEST_CUSTOM_FIELDS,
      websiteUrl: 'https://shop.example.com',
      text: {
        preheader: 'Welcome',
        heading: 'Welcome!',
        greeting: 'Hi',
        intro: 'Glad you are here.',
        ctaButton: 'Shop',
        benefitsHeading: 'What you get',
        benefits: ['Free shipping over $50', 'Early access to sales', 'Members-only perks'],
      },
      fieldNames: { firstName: 'Subscriber.FirstName' },
    });

    const json = docToString(doc);
    expect(json).toContain('What you get');
    expect(json).toContain('Free shipping over $50');
    expect(json).toContain('Early access to sales');
    expect(json).toContain('Members-only perks');
  });

  it('renders discount callout when discountCode is supplied', () => {
    const doc = createWelcomeEmail({
      brandStyle: TEST_BRAND_STYLE,
      customFields: TEST_CUSTOM_FIELDS,
      websiteUrl: 'https://shop.example.com',
      text: {
        preheader: 'Welcome',
        heading: 'Welcome!',
        greeting: 'Hi',
        intro: 'Here is a gift.',
        ctaButton: 'Shop',
        discountHeading: 'Your welcome gift',
        discountMessage: 'Use code at checkout',
        discountCode: 'WELCOME10',
      },
      fieldNames: { firstName: 'Subscriber.FirstName' },
    });

    const json = docToString(doc);
    expect(json).toContain('Your welcome gift');
    expect(json).toContain('Use code at checkout');
    expect(json).toContain('WELCOME10');
  });

  it('renders social icons when brandStyle.socialLinks is provided', () => {
    const doc = createWelcomeEmail({
      brandStyle: {
        ...TEST_BRAND_STYLE,
        socialLinks: [
          { name: 'facebook', href: 'https://facebook.com/shop' },
          { name: 'instagram', href: 'https://instagram.com/shop' },
        ],
      },
      customFields: TEST_CUSTOM_FIELDS,
      websiteUrl: 'https://shop.example.com',
      text: {
        preheader: 'Welcome',
        heading: 'Welcome!',
        greeting: 'Hi',
        intro: 'Glad you are here.',
        ctaButton: 'Shop',
      },
      fieldNames: { firstName: 'Subscriber.FirstName' },
    });

    const json = docToString(doc);
    expect(json).toContain('rc-social');
    expect(json).toContain('facebook');
    expect(json).toContain('instagram');
  });

  it('omits optional sections when not configured', () => {
    const doc = createWelcomeEmail({
      brandStyle: TEST_BRAND_STYLE,
      customFields: TEST_CUSTOM_FIELDS,
      websiteUrl: 'https://shop.example.com',
      text: {
        preheader: 'Welcome',
        heading: 'Welcome!',
        greeting: 'Hi',
        intro: 'Glad you are here.',
        ctaButton: 'Shop',
      },
      fieldNames: { firstName: 'Subscriber.FirstName' },
    });

    const json = docToString(doc);
    expect(json).not.toContain('rc-social');
    expect(json).not.toContain('WELCOME10');
    expect(json).not.toContain('•');
  });

  it('throws RuleConfigError when firstName field is not in customFields', () => {
    expect(() =>
      createWelcomeEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://shop.example.com',
        text: {
          preheader: 'Welcome',
          heading: 'Welcome!',
          greeting: 'Hi',
          intro: 'Glad you are here.',
          ctaButton: 'Shop',
        },
        fieldNames: { firstName: 'Subscriber.UnmappedFirstName' },
      })
    ).toThrow(RuleConfigError);
  });

  it('wraps config errors with template context', () => {
    try {
      createWelcomeEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://shop.example.com',
        text: {
          preheader: 'Welcome',
          heading: 'Welcome!',
          greeting: 'Hi',
          intro: 'Glad you are here.',
          ctaButton: 'Shop',
        },
        fieldNames: { firstName: 'Subscriber.UnmappedFirstName' },
      });
      throw new Error('expected createWelcomeEmail to throw');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(RuleConfigError);
      expect((error as Error).message).toMatch(/createWelcomeEmail/);
    }
  });
});

// ============================================================================
// Footer localization across templates
// ============================================================================

describe('Template Footer Localization', () => {
  it('should pass footer config through to templates', () => {
    const doc = createReservationConfirmationEmail({
      brandStyle: TEST_BRAND_STYLE,
      customFields: TEST_CUSTOM_FIELDS,
      websiteUrl: 'https://example.com',
      footer: {
        viewInBrowserText: 'Voir dans le navigateur',
        unsubscribeText: 'Se désabonner',
      },
      text: {
        preheader: 'Merci!',
        greeting: 'Bonjour',
        intro: 'Merci pour votre réservation.',
        detailsHeading: 'Détails',
        referenceLabel: 'Réf',
        serviceLabel: 'Service',
        checkInLabel: 'Arrivée',
        guestsLabel: 'Personnes',
        ctaButton: 'Voir',
      },
      fieldNames: {
        firstName: 'Booking.FirstName',
        bookingRef: 'Booking.BookingRef',
        serviceType: 'Booking.ServiceType',
        checkInDate: 'Booking.CheckInDate',
        totalGuests: 'Booking.TotalGuests',
      },
    });

    const json = docToString(doc);
    expect(json).toContain('Voir dans le navigateur');
    expect(json).toContain('Se désabonner');
    expect(json).not.toContain('View in browser');
  });
});

// ============================================================================
// Barrel Export
// ============================================================================

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

describe('template error context', () => {
  it('should include template name when createBrandButton throws inside a template', () => {
    expect(() =>
      createReservationConfirmationEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'javascript:alert(1)',
        text: {
          preheader: 'Test',
          greeting: 'Hello',
          intro: 'Intro',
          detailsHeading: 'Details',
          referenceLabel: 'Ref',
          serviceLabel: 'Service',
          checkInLabel: 'Check-in',
          guestsLabel: 'Guests',
          ctaButton: 'Click',
        },
        fieldNames: {
          firstName: 'Booking.FirstName',
          bookingRef: 'Booking.BookingRef',
          serviceType: 'Booking.ServiceType',
          checkInDate: 'Booking.CheckInDate',
          totalGuests: 'Booking.TotalGuests',
        },
      })
    ).toThrow('createReservationConfirmationEmail > createBrandButton: invalid or unsafe URL');
  });

  it('wraps validateCustomFields errors with template prefix exactly once in hospitality', () => {
    // Regression: hospitality templates previously prefixed validation errors
    // with their templateName arg AND called validateCustomFields outside
    // withTemplateContext. Moving the call inside the wrapper lets the
    // wrapper provide the prefix, matching the e-commerce pattern and
    // preventing duplicated prefixes if someone later rearranges the code.
    try {
      createReservationConfirmationEmail({
        brandStyle: TEST_BRAND_STYLE,
        customFields: {},
        websiteUrl: 'https://example.com',
        text: {
          preheader: 'Test',
          greeting: 'Hi',
          intro: 'Intro',
          detailsHeading: 'Details',
          referenceLabel: 'Ref',
          serviceLabel: 'Service',
          checkInLabel: 'Check-in',
          guestsLabel: 'Guests',
          ctaButton: 'Click',
        },
        fieldNames: {
          firstName: 'Booking.FirstName',
          bookingRef: 'Booking.BookingRef',
          serviceType: 'Booking.ServiceType',
          checkInDate: 'Booking.CheckInDate',
          totalGuests: 'Booking.TotalGuests',
        },
      });
      throw new Error('expected createReservationConfirmationEmail to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(RuleConfigError);
      const message = (error as RuleConfigError).message;
      const occurrences = message.split('createReservationConfirmationEmail').length - 1;
      expect(occurrences).toBe(1);
      expect(message).toContain('missing customFields entry for fieldNames.');
    }
  });

  it('should include template name when createBrandLogo throws inside e-commerce template', () => {
    expect(() =>
      createOrderConfirmationEmail({
        brandStyle: {
          ...TEST_BRAND_STYLE,
          logoUrl: 'javascript:void(0)',
        },
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://example.com',
        text: {
          preheader: 'Test',
          greeting: 'Hi',
          intro: 'Intro',
          detailsHeading: 'Details',
          orderRefLabel: 'Order',
          totalLabel: 'Total',
          ctaButton: 'View',
        },
        fieldNames: {
          firstName: 'Booking.FirstName',
          orderRef: 'Booking.BookingRef',
          totalPrice: 'Booking.ServiceType',
        },
      })
    ).toThrow('createOrderConfirmationEmail > createBrandLogo: invalid or unsafe logoUrl');
  });
});
