/**
 * RCML Utility Functions
 *
 * Security utilities for building safe email templates.
 */

/**
 * Escape HTML special characters to prevent XSS.
 * Use when embedding user-provided content into raw HTML strings.
 *
 * This helper is for HTML-string contexts only (e.g., custom HTML templates).
 * For structured RCML/ProseMirror text nodes, do NOT pre-escape — Rule.io's
 * renderer handles text encoding, and pre-escaping produces double-escaped
 * output (`&amp;`, `&lt;`, etc.).
 *
 * @param text - The text to escape
 * @returns Escaped text safe for HTML
 *
 * @example
 * ```typescript
 * escapeHtml('<script>alert("xss")</script>')
 * // Returns: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
 * ```
 */
export function escapeHtml(text: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (char) => htmlEscapes[char]);
}

/**
 * Validate and sanitize a URL to prevent XSS via javascript: or data: URLs.
 * Only allows http:// and https:// protocols.
 * Returns empty string for invalid URLs to fail safely.
 *
 * @param url - The URL to validate
 * @returns The original URL if safe, empty string otherwise
 *
 * @example
 * ```typescript
 * sanitizeUrl('https://example.com') // Returns: 'https://example.com'
 * sanitizeUrl('javascript:alert(1)') // Returns: ''
 * sanitizeUrl('data:text/html,...')  // Returns: ''
 * ```
 */
export function sanitizeUrl(url: string): string {
  const trimmedUrl = url.trim();
  try {
    const parsed = new URL(trimmedUrl);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return trimmedUrl;
    }
    return '';
  } catch {
    return '';
  }
}

/**
 * Format a date for Rule.io (YYYY-MM-DD).
 * Uses UTC — a local date near midnight may format as the next/previous day.
 *
 * @param date - Date to format
 * @returns Date string in YYYY-MM-DD format
 */
export function formatDateForRule(date: Date): string {
  return date.toISOString().split('T')[0];
}
