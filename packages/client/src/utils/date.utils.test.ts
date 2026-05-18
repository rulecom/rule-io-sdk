import { describe, it, expect } from 'vitest';
import { formatDateForRule } from './date.utils.js';

describe('formatDateForRule', () => {
  it('formats a date as YYYY-MM-DD in UTC', () => {
    expect(formatDateForRule(new Date('2026-03-15T10:00:00Z'))).toBe('2026-03-15');
  });

  it('uses UTC so a date near midnight does not shift', () => {
    // 23:30 UTC+2 is still 2026-01-01 in UTC
    expect(formatDateForRule(new Date('2026-01-01T21:30:00Z'))).toBe('2026-01-01');
  });
});
