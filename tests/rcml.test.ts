/**
 * RCML Builder Tests
 */

import { describe, it, expect } from 'vitest';
import {
  escapeHtml,
  sanitizeUrl,
  formatDateForRule,
  createRCMLDocument,
  createCenteredSection,
  createTwoColumnSection,
  createHeading,
  createText,
  createButton,
  createImage,
  createLogo,
  createSpacer,
  createDivider,
  createProseMirrorDoc,
  createLoop,
  createBrandLoop,
  createLoopFieldPlaceholder,
  createVideo,
} from '../src/rcml';
import { RuleConfigError } from '../src/errors';

describe('RCML Utils', () => {
  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
      );
    });

    it('should escape ampersand', () => {
      expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
    });

    it('should escape single quotes', () => {
      expect(escapeHtml("It's fine")).toBe('It&#39;s fine');
    });

    it('should handle empty string', () => {
      expect(escapeHtml('')).toBe('');
    });

    it('should not escape normal text', () => {
      expect(escapeHtml('Hello World')).toBe('Hello World');
    });
  });

  describe('sanitizeUrl', () => {
    it('should allow https URLs', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
      expect(sanitizeUrl('https://example.com/path?query=1')).toBe(
        'https://example.com/path?query=1'
      );
    });

    it('should allow http URLs', () => {
      expect(sanitizeUrl('http://localhost:3000')).toBe('http://localhost:3000');
    });

    it('should reject javascript URLs', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBe('');
    });

    it('should reject data URLs', () => {
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('');
    });

    it('should reject invalid URLs', () => {
      expect(sanitizeUrl('not-a-url')).toBe('');
    });

    it('should trim whitespace', () => {
      expect(sanitizeUrl('  https://example.com  ')).toBe('https://example.com');
    });
  });

  describe('formatDateForRule', () => {
    it('should format date as YYYY-MM-DD', () => {
      const date = new Date('2026-03-15T10:00:00Z');
      expect(formatDateForRule(date)).toBe('2026-03-15');
    });
  });
});

describe('RCML Document', () => {
  describe('createRCMLDocument', () => {
    it('should create basic document structure', () => {
      const doc = createRCMLDocument({
        sections: [
          createCenteredSection({
            children: [createText('Hello')],
          }),
        ],
      });

      expect(doc.tagName).toBe('rcml');
      expect(doc.children).toHaveLength(2);
      expect(doc.children[0].tagName).toBe('rc-head');
      expect(doc.children[1].tagName).toBe('rc-body');
    });

    it('should include preheader in head', () => {
      const doc = createRCMLDocument({
        preheader: 'Preview text',
        sections: [],
      });

      const head = doc.children[0];
      expect(head.children).toBeDefined();
      expect(head.children).toContainEqual({
        tagName: 'rc-preview',
        content: 'Preview text',
      });
    });

    it('should include brand style ID (legacy support)', () => {
      const doc = createRCMLDocument({
        brandStyleId: '123',
        sections: [],
      });

      const head = doc.children[0];
      expect(head.children).toContainEqual({
        tagName: 'rc-brand-style',
        attributes: { id: '123' },
      });
    });

    it('should include styles via rc-attributes', () => {
      const doc = createRCMLDocument({
        styles: {
          brandStyleId: '10261',
          logoUrl: 'https://example.com/logo.png',
          primaryColor: '#2D5016',
          backgroundColor: '#FDF5E6',
        },
        sections: [],
      });

      const head = doc.children[0];
      const attributes = head.children?.find((c) => c.tagName === 'rc-attributes');
      expect(attributes).toBeDefined();
      expect(attributes?.tagName).toBe('rc-attributes');

      // Type narrow to rc-attributes
      if (attributes?.tagName !== 'rc-attributes') return;

      // Should have logo class
      const logoClass = attributes.children?.find((c) => c.tagName === 'rc-class');
      expect(logoClass).toBeDefined();
      if (logoClass?.tagName === 'rc-class') {
        expect(logoClass.attributes?.name).toBe('rcml-logo-style');
        expect(logoClass.attributes?.src).toBe('https://example.com/logo.png');
      }

      // Should have body background
      const bodyStyle = attributes.children?.find((c) => c.tagName === 'rc-body');
      expect(bodyStyle).toBeDefined();
      if (bodyStyle?.tagName === 'rc-body') {
        expect(bodyStyle.attributes?.['background-color']).toBe('#FDF5E6');
      }

      // Should have button color
      const buttonStyle = attributes.children?.find((c) => c.tagName === 'rc-button');
      expect(buttonStyle).toBeDefined();
      if (buttonStyle?.tagName === 'rc-button') {
        expect(buttonStyle.attributes?.['background-color']).toBe('#2D5016');
      }
    });

    it('should include both rc-brand-style and rc-attributes when styles is provided', () => {
      const doc = createRCMLDocument({
        brandStyleId: '123', // Should be ignored when styles is provided
        styles: {
          brandStyleId: '456', // This one should be used
          logoUrl: 'https://example.com/logo.png',
        },
        sections: [],
      });

      const head = doc.children[0];

      // Should have rc-attributes
      const hasAttributes = head.children?.some((c) => c.tagName === 'rc-attributes');
      expect(hasAttributes).toBe(true);

      // Should have rc-brand-style (required for Rule.io editor)
      const brandStyle = head.children?.find((c) => c.tagName === 'rc-brand-style');
      expect(brandStyle).toBeDefined();
      if (brandStyle?.tagName === 'rc-brand-style') {
        expect(brandStyle.attributes?.id).toBe('456'); // From styles, not from deprecated brandStyleId
      }
    });

    it('should set background color and width', () => {
      const doc = createRCMLDocument({
        backgroundColor: '#FFFFFF',
        width: '800px',
        sections: [],
      });

      const body = doc.children[1];
      expect(body.attributes?.['background-color']).toBe('#FFFFFF');
      expect(body.attributes?.width).toBe('800px');
    });
  });
});

describe('RCML Sections', () => {
  describe('createCenteredSection', () => {
    it('should create section with single column', () => {
      const section = createCenteredSection({
        children: [createText('Content')],
      });

      expect(section.tagName).toBe('rc-section');
      expect(section.children).toHaveLength(1);
      expect(section.children[0].tagName).toBe('rc-column');
    });

    it('should apply background color', () => {
      const section = createCenteredSection({
        backgroundColor: '#FF0000',
        children: [],
      });

      expect(section.attributes?.['background-color']).toBe('#FF0000');
    });
  });

  describe('createTwoColumnSection', () => {
    it('should create section with two columns', () => {
      const section = createTwoColumnSection({
        leftChildren: [createText('Left')],
        rightChildren: [createText('Right')],
      });

      expect(section.children).toHaveLength(2);
      expect(section.children[0].attributes?.width).toBe('50%');
      expect(section.children[1].attributes?.width).toBe('50%');
    });

    it('should allow custom column widths', () => {
      const section = createTwoColumnSection({
        leftWidth: '30%',
        rightWidth: '70%',
        leftChildren: [],
        rightChildren: [],
      });

      expect(section.children[0].attributes?.width).toBe('30%');
      expect(section.children[1].attributes?.width).toBe('70%');
    });
  });
});

describe('RCML Elements', () => {
  describe('createProseMirrorDoc', () => {
    it('should create ProseMirror document from text', () => {
      const doc = createProseMirrorDoc('Hello World');

      expect(doc.type).toBe('doc');
      expect(doc.content[0].type).toBe('paragraph');
      expect(doc.content[0].content?.[0].text).toBe('Hello World');
    });
  });

  describe('createHeading', () => {
    it('should create heading with default styles', () => {
      const heading = createHeading('Welcome');

      expect(heading.tagName).toBe('rc-heading');
      expect(heading.attributes?.align).toBe('center');
      expect(heading.attributes?.['font-size']).toBe('28px');
      expect(heading.content.content[0].content?.[0].text).toBe('Welcome');
    });

    it('should accept custom options', () => {
      const heading = createHeading('Title', {
        align: 'left',
        color: '#FF0000',
        fontSize: '32px',
      });

      expect(heading.attributes?.align).toBe('left');
      expect(heading.attributes?.color).toBe('#FF0000');
      expect(heading.attributes?.['font-size']).toBe('32px');
    });
  });

  describe('createText', () => {
    it('should create text with default styles', () => {
      const text = createText('Paragraph content');

      expect(text.tagName).toBe('rc-text');
      expect(text.attributes?.align).toBe('left');
      expect(text.attributes?.['font-size']).toBe('16px');
    });

    it('should accept custom options', () => {
      const text = createText('Content', {
        align: 'center',
        lineHeight: '2',
      });

      expect(text.attributes?.align).toBe('center');
      expect(text.attributes?.['line-height']).toBe('2');
    });
  });

  describe('createButton', () => {
    it('should create button with href', () => {
      const button = createButton('Click Me', 'https://example.com');

      expect(button.tagName).toBe('rc-button');
      expect(button.attributes?.href).toBe('https://example.com');
      expect(button.attributes?.align).toBe('center');
      expect(button.content.content[0].content?.[0].text).toBe('Click Me');
    });

    it('should accept custom styles', () => {
      const button = createButton('Submit', 'https://example.com', {
        backgroundColor: '#00FF00',
        borderRadius: '4px',
      });

      expect(button.attributes?.['background-color']).toBe('#00FF00');
      expect(button.attributes?.['border-radius']).toBe('4px');
    });

    it('should reject javascript: URLs', () => {
      expect(() => createButton('Click', 'javascript:alert(1)')).toThrow(RuleConfigError);
    });

    it('should reject data: URLs', () => {
      expect(() => createButton('Click', 'data:text/html,<h1>xss</h1>')).toThrow(RuleConfigError);
    });
  });

  describe('createImage', () => {
    it('should create image with src', () => {
      const image = createImage('https://example.com/image.jpg');

      expect(image.tagName).toBe('rc-image');
      expect(image.attributes.src).toBe('https://example.com/image.jpg');
    });

    it('should accept options', () => {
      const image = createImage('https://example.com/image.jpg', {
        alt: 'Description',
        width: '100%',
        href: 'https://example.com',
      });

      expect(image.attributes.alt).toBe('Description');
      expect(image.attributes.width).toBe('100%');
      expect(image.attributes.href).toBe('https://example.com');
    });

    it('should reject javascript: URLs', () => {
      expect(() => createImage('javascript:alert(1)')).toThrow(RuleConfigError);
    });

    it('should strip unsafe href option', () => {
      const image = createImage('https://example.com/img.jpg', {
        href: 'javascript:alert(1)',
      });
      expect(image.attributes.href).toBeUndefined();
    });
  });

  describe('createLogo', () => {
    it('should create logo with rc-class', () => {
      const logo = createLogo();

      expect(logo.tagName).toBe('rc-logo');
      expect(logo.attributes?.['rc-class']).toBe('rcml-logo-style');
    });

    it('should accept custom rc-class', () => {
      const logo = createLogo({ rcClass: 'custom-logo' });

      expect(logo.attributes?.['rc-class']).toBe('custom-logo');
    });
  });

  describe('createSpacer', () => {
    it('should create spacer with default height', () => {
      const spacer = createSpacer();

      expect(spacer.tagName).toBe('rc-spacer');
      expect(spacer.attributes?.height).toBe('20px');
    });

    it('should accept custom height', () => {
      const spacer = createSpacer('40px');

      expect(spacer.attributes?.height).toBe('40px');
    });
  });

  describe('createDivider', () => {
    it('should create divider with default styles', () => {
      const divider = createDivider();

      expect(divider.tagName).toBe('rc-divider');
      expect(divider.attributes?.['border-style']).toBe('solid');
      expect(divider.attributes?.['border-width']).toBe('1px');
    });

    it('should accept custom styles', () => {
      const divider = createDivider({
        borderColor: '#FF0000',
        borderStyle: 'dashed',
        borderWidth: '2px',
      });

      expect(divider.attributes?.['border-color']).toBe('#FF0000');
      expect(divider.attributes?.['border-style']).toBe('dashed');
      expect(divider.attributes?.['border-width']).toBe('2px');
    });
  });

  describe('createVideo', () => {
    it('should create video with src', () => {
      const video = createVideo('https://example.com/video.mp4');

      expect(video.tagName).toBe('rc-video');
      expect(video.attributes.src).toBe('https://example.com/video.mp4');
    });

    it('should reject javascript: URLs', () => {
      expect(() => createVideo('javascript:alert(1)')).toThrow(RuleConfigError);
    });

    it('should strip unsafe href option', () => {
      const video = createVideo('https://example.com/video.mp4', {
        href: 'javascript:alert(1)',
      });
      expect(video.attributes.href).toBeUndefined();
    });
  });

  // ==========================================================================
  // Loop Element
  // ==========================================================================

  describe('createLoop', () => {
    it('should create a valid rc-loop element', () => {
      const section = createCenteredSection({
        children: [createText('Item')],
      });
      const loop = createLoop({ fieldId: 200005 }, [section]);

      expect(loop.tagName).toBe('rc-loop');
      expect(loop.attributes['loop-type']).toBe('custom-field');
      expect(loop.attributes['loop-value']).toBe('200005');
      expect(loop.children).toHaveLength(1);
      expect(loop.children[0].tagName).toBe('rc-section');
    });

    it('should set optional attributes when provided', () => {
      const loop = createLoop(
        { fieldId: 100, maxIterations: 10, rangeStart: 0, rangeEnd: 5 },
        []
      );

      expect(loop.attributes['loop-max-iterations']).toBe(10);
      expect(loop.attributes['loop-range-start']).toBe(0);
      expect(loop.attributes['loop-range-end']).toBe(5);
    });

    it('should not include optional attributes when not provided', () => {
      const loop = createLoop({ fieldId: 100 }, []);

      expect(loop.attributes).not.toHaveProperty('loop-max-iterations');
      expect(loop.attributes).not.toHaveProperty('loop-range-start');
      expect(loop.attributes).not.toHaveProperty('loop-range-end');
    });

    it('should not have an id (low-level builder)', () => {
      const loop = createLoop({ fieldId: 100 }, []);
      expect(loop).not.toHaveProperty('id');
    });
  });

  describe('createBrandLoop', () => {
    it('should create an rc-loop with a UUID id', () => {
      const loop = createBrandLoop(200005, []);

      expect(loop.tagName).toBe('rc-loop');
      expect(loop.id).toBeDefined();
      expect(loop.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
    });

    it('should set loop attributes correctly', () => {
      const loop = createBrandLoop(200005, [], { maxIterations: 20 });

      expect(loop.attributes['loop-type']).toBe('custom-field');
      expect(loop.attributes['loop-value']).toBe('200005');
      expect(loop.attributes['loop-max-iterations']).toBe(20);
    });

    it('should preserve children sections', () => {
      const section = createCenteredSection({
        children: [createText('Product')],
      });
      const loop = createBrandLoop(100, [section]);

      expect(loop.children).toHaveLength(1);
    });
  });

  describe('createLoopFieldPlaceholder', () => {
    it('should create a placeholder with JSON key name', () => {
      const node = createLoopFieldPlaceholder('title');

      expect(node.type).toBe('placeholder');
      expect(node.attrs.type).toBe('LoopValue');
      expect(node.attrs.name).toBe('title');
      expect(node.attrs.value).toBe('title');
      expect(node.attrs.original).toBe('[LoopValue:title]');
    });

    it('should handle snake_case JSON keys', () => {
      const node = createLoopFieldPlaceholder('variant_title');

      expect(node.attrs.name).toBe('variant_title');
      expect(node.attrs.original).toBe('[LoopValue:variant_title]');
    });
  });
});
