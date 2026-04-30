/**
 * Tests for the small HTML / URL / date utilities in `packages/core/src/utils.ts`.
 * Originally lived under `@rule-io/rcml` alongside the legacy element builders;
 * relocated to `@rule-io/core` with the rest of rcml's cleanup since these
 * helpers are dependency-free and shared by multiple packages.
 */

import { describe, it, expect } from 'vitest';
import { escapeHtml, sanitizeUrl, formatDateForRule } from '../src/utils.js';

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
