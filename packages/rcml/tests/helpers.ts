/**
 * Shared test fixtures and assertion helpers.
 *
 * Centralises duplicated constants (TEST_BRAND_STYLE, assertValidRCMLDocument,
 * docToString) so every test file that needs them imports from one place.
 */

import { expect } from 'vitest';
import type { RCMLDocument } from '../src/index.js';
import type { BrandStyleConfig } from '../src/index.js';

// ============================================================================
// Shared brand-style fixture
// ============================================================================

export const TEST_BRAND_STYLE: BrandStyleConfig = {
  brandStyleId: '99999',
  logoUrl: 'https://example.com/logo.png',
  buttonColor: '#0066CC',
  bodyBackgroundColor: '#f3f3f3',
  sectionBackgroundColor: '#ffffff',
  brandColor: '#f6f8f9',
  headingFont: "'Helvetica Neue', sans-serif",
  headingFontUrl: 'https://app.rule.io/brand-style/99999/font/1/css',
  bodyFont: "'Arial', sans-serif",
  bodyFontUrl: 'https://app.rule.io/brand-style/99999/font/2/css',
  textColor: '#1A1A1A',
};

// ============================================================================
// Assertion helpers
// ============================================================================

/**
 * Assert that a value is a structurally valid RCML document (rcml root with
 * rc-head + rc-body, and at least one child in the body).
 */
export function assertValidRCMLDocument(doc: unknown): asserts doc is RCMLDocument {
  const d = doc as RCMLDocument;
  expect(d.tagName).toBe('rcml');
  expect(d.children).toHaveLength(2);
  expect(d.children[0].tagName).toBe('rc-head');
  expect(d.children[1].tagName).toBe('rc-body');
  expect(d.children[1].children.length).toBeGreaterThan(0);
}

/**
 * Serialise an RCML document to a JSON string (useful for substring assertions).
 */
export function docToString(doc: RCMLDocument): string {
  return JSON.stringify(doc);
}
